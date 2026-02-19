const mockLogPrompt = jest.fn();
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  getEntries: jest.fn().mockReturnValue([]),
  clear: jest.fn(),
};

jest.mock('../../../src/logging/index.js', () => ({
  get logger(): typeof mockLogger {
    return mockLogger;
  },
  get logPrompt(): typeof mockLogPrompt {
    return mockLogPrompt;
  },
}));

import { runLlmStage } from '../../../src/llm/llm-stage-runner';
import { LLMError } from '../../../src/llm/llm-client-types';
import { CONCEPT_IDEATION_SCHEMA } from '../../../src/llm/schemas/concept-ideator-schema';

function createJsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

function responseWithMessageContent(content: string): Response {
  return createJsonResponse(200, {
    id: 'or-llm-stage-runner-1',
    choices: [{ message: { content }, finish_reason: 'stop' }],
  });
}

function createErrorResponse(status: number, message: string): Response {
  return {
    ok: false,
    status,
    json: jest.fn(),
    text: jest.fn().mockResolvedValue(message),
  } as unknown as Response;
}

async function advanceRetryDelays(): Promise<void> {
  await jest.advanceTimersByTimeAsync(1000);
  await jest.advanceTimersByTimeAsync(2000);
}

describe('llm-stage-runner', () => {
  const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock.mockReset();
    mockLogPrompt.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('runs stage call and returns parsed response with raw response text', async () => {
    const rawContent = JSON.stringify({ ok: true });
    fetchMock.mockResolvedValue(responseWithMessageContent(rawContent));

    const result = await runLlmStage({
      stageModel: 'conceptIdeator',
      promptType: 'conceptIdeator',
      apiKey: 'test-api-key',
      schema: CONCEPT_IDEATION_SCHEMA,
      messages: [{ role: 'user', content: 'test message' }],
      parseResponse: (parsed) => parsed as { ok: boolean },
    });

    expect(result.parsed).toEqual({ ok: true });
    expect(result.rawResponse).toBe(rawContent);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockLogPrompt).toHaveBeenCalledWith(mockLogger, 'conceptIdeator', expect.any(Array));
  });

  it('wraps parser LLMError with raw response content context', async () => {
    const rawContent = JSON.stringify({ not: 'valid-for-parser' });
    fetchMock.mockResolvedValue(responseWithMessageContent(rawContent));

    await expect(
      runLlmStage({
        stageModel: 'conceptEvaluator',
        promptType: 'conceptEvaluator',
        apiKey: 'test-api-key',
        schema: CONCEPT_IDEATION_SCHEMA,
        messages: [{ role: 'user', content: 'test message' }],
        parseResponse: () => {
          throw new LLMError('parse failed', 'STRUCTURE_PARSE_ERROR', false);
        },
      }),
    ).rejects.toMatchObject({
      message: 'parse failed',
      code: 'STRUCTURE_PARSE_ERROR',
      retryable: false,
      context: { rawContent },
    });
  });

  it('retries retryable HTTP errors via withRetry policy', async () => {
    fetchMock.mockResolvedValue(createErrorResponse(429, 'rate limited'));

    const pending = runLlmStage({
      stageModel: 'conceptStressTester',
      promptType: 'conceptStressTester',
      apiKey: 'test-api-key',
      schema: CONCEPT_IDEATION_SCHEMA,
      messages: [{ role: 'user', content: 'test message' }],
      parseResponse: (parsed) => parsed as Record<string, unknown>,
    });

    const expectation = expect(pending).rejects.toMatchObject({
      code: 'HTTP_429',
      retryable: true,
    });

    await advanceRetryDelays();
    await expectation;

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
