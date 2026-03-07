import { generateChoiceGeneratorWithFallback } from '../../../src/llm/choice-generator-generation';
import { LLMError } from '../../../src/llm/llm-client-types';
import type { GenerationOptions } from '../../../src/llm/generation-pipeline-types';
import type { ChatMessage } from '../../../src/llm/llm-client-types';

jest.mock('../../../src/config/stage-model', () => ({
  getStageModel: () => 'anthropic/claude-sonnet-4.5',
}));

jest.mock('../../../src/config/index', () => ({
  getConfig: () => ({
    llm: { temperature: 0.7, maxTokens: 4000 },
  }),
}));

jest.mock('../../../src/logging/index', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const TEST_MESSAGES: ChatMessage[] = [
  { role: 'system', content: 'You are a choice architect.' },
  { role: 'user', content: 'Generate choices for this scene.' },
];

const TEST_OPTIONS: GenerationOptions = {
  apiKey: 'test-key',
};

function makeValidResponse() {
  return {
    choices: [
      { text: 'Demand an explanation', choiceType: 'CONFRONTATION', primaryDelta: 'INFORMATION_REVEALED' },
      { text: 'Flee the scene quickly', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'LOCATION_CHANGE' },
      { text: 'Investigate the noise', choiceType: 'INVESTIGATION', primaryDelta: 'THREAT_SHIFT' },
    ],
  };
}

function mockSuccessResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () =>
      Promise.resolve({
        choices: [
          {
            message: {
              content: JSON.stringify(body),
            },
          },
        ],
      }),
  });
}

describe('generateChoiceGeneratorWithFallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns parsed choices on valid response', async () => {
    mockSuccessResponse(makeValidResponse());

    const result = await generateChoiceGeneratorWithFallback(TEST_MESSAGES, TEST_OPTIONS);

    expect(result.choices).toHaveLength(3);
    expect(result.choices[0].text).toBe('Demand an explanation');
    expect(result.choices[0].choiceType).toBe('CONFRONTATION');
    expect(result.choices[0].primaryDelta).toBe('INFORMATION_REVEALED');
    expect(result.rawResponse).toBeDefined();
  });

  it('trims choice text whitespace', async () => {
    const body = {
      choices: [
        { text: '  Demand an explanation  ', choiceType: 'CONFRONTATION', primaryDelta: 'INFORMATION_REVEALED' },
        { text: '  Flee the scene  ', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'LOCATION_CHANGE' },
      ],
    };
    mockSuccessResponse(body);

    const result = await generateChoiceGeneratorWithFallback(TEST_MESSAGES, TEST_OPTIONS);

    expect(result.choices[0].text).toBe('Demand an explanation');
    expect(result.choices[1].text).toBe('Flee the scene');
  });

  it('throws LLMError on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
      json: () => Promise.reject(new Error('not json')),
    });

    await expect(
      generateChoiceGeneratorWithFallback(TEST_MESSAGES, TEST_OPTIONS)
    ).rejects.toThrow(LLMError);
  });

  it('throws non-retryable LLMError for structured output not supported', async () => {
    const error = new LLMError(
      'does not support structured output',
      'HTTP_400',
      false,
      { rawErrorBody: 'provider does not support structured output' }
    );
    mockFetch.mockRejectedValueOnce(error);

    try {
      await generateChoiceGeneratorWithFallback(TEST_MESSAGES, TEST_OPTIONS);
      fail('Expected error');
    } catch (caught) {
      expect(caught).toBeInstanceOf(LLMError);
      expect((caught as LLMError).code).toBe('STRUCTURED_OUTPUT_NOT_SUPPORTED');
      expect((caught as LLMError).retryable).toBe(false);
    }
  });

  it('throws validation error for invalid response structure', async () => {
    const body = { choices: [{ text: 'Go', choiceType: 'CONFRONTATION', primaryDelta: 'INFORMATION_REVEALED' }] };
    mockSuccessResponse(body);

    await expect(
      generateChoiceGeneratorWithFallback(TEST_MESSAGES, TEST_OPTIONS)
    ).rejects.toThrow();
  });

  it('sends correct request body to OpenRouter', async () => {
    mockSuccessResponse(makeValidResponse());

    await generateChoiceGeneratorWithFallback(TEST_MESSAGES, TEST_OPTIONS);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, fetchOptions] = mockFetch.mock.calls[0] as [string, { body: string }];
    expect(url).toContain('openrouter');
    const requestBody = JSON.parse(fetchOptions.body) as {
      model: string;
      response_format: { type: string; json_schema: { name: string } };
    };
    expect(requestBody.model).toBe('anthropic/claude-sonnet-4.5');
    expect(requestBody.response_format.type).toBe('json_schema');
    expect(requestBody.response_format.json_schema.name).toBe('choice_generation');
  });
});
