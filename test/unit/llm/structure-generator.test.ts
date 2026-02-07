import { getConfig } from '../../../src/config/index';
import { STRUCTURE_GENERATION_SCHEMA } from '../../../src/llm/schemas/structure-schema';
import { generateStoryStructure } from '../../../src/llm/structure-generator';

interface StructurePayload {
  overallTheme: string;
  acts: Array<{
    name: string;
    objective: string;
    stakes: string;
    entryCondition: string;
    beats: Array<{
      description: string;
      objective: string;
    }>;
  }>;
}

function createValidStructurePayload(): StructurePayload {
  return {
    overallTheme: 'Expose the tribunal and reclaim your honor.',
    acts: [
      {
        name: 'Act I',
        objective: 'Get pulled into the conspiracy.',
        stakes: 'Failure means execution.',
        entryCondition: 'A public murder is pinned on the protagonist.',
        beats: [
          { description: 'Find a hidden witness.', objective: 'Obtain credible evidence.' },
          { description: 'Steal archive records.', objective: 'Secure proof before it burns.' },
        ],
      },
      {
        name: 'Act II',
        objective: 'Expose the network while hunted.',
        stakes: 'Failure locks the city under martial rule.',
        entryCondition: 'The records name powerful conspirators.',
        beats: [
          { description: 'Negotiate with rivals.', objective: 'Gain reluctant allies.' },
          { description: 'Survive a rigged hearing.', objective: 'Force evidence into the open.' },
        ],
      },
      {
        name: 'Act III',
        objective: 'End the conspiracy and define justice.',
        stakes: 'Failure cements permanent authoritarian control.',
        entryCondition: 'Conspirators are identified and vulnerable.',
        beats: [
          { description: 'Alliance fractures.', objective: 'Choose justice over revenge.' },
          { description: 'Confront tribunal leaders.', objective: 'Resolve the central conflict.' },
        ],
      },
    ],
  };
}

function createJsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

function createErrorResponse(status: number, message: string): Response {
  return {
    ok: false,
    status,
    json: jest.fn(),
    text: jest.fn().mockResolvedValue(message),
  } as unknown as Response;
}

function responseWithMessageContent(content: string): Response {
  return createJsonResponse(200, {
    id: 'or-structure-1',
    choices: [{ message: { content }, finish_reason: 'stop' }],
  });
}

describe('structure-generator', () => {
  const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();
  const originalFetch = global.fetch;

  const context = {
    characterConcept: 'A disgraced guard trying to clear their name.',
    worldbuilding: 'A plague-ridden harbor city controlled by merchant tribunals.',
    tone: 'grim political fantasy',
  };

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  function getRequestBody(callIndex = 0): Record<string, unknown> {
    const call = fetchMock.mock.calls[callIndex];
    if (!call) {
      return {};
    }

    const init = call[1];
    if (!init || typeof init.body !== 'string') {
      return {};
    }

    return JSON.parse(init.body) as Record<string, unknown>;
  }

  async function advanceRetryDelays(): Promise<void> {
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(2000);
  }

  it('generates story structure and returns parsed result with raw response', async () => {
    const payload = createValidStructurePayload();
    const rawContent = JSON.stringify(payload);

    fetchMock.mockResolvedValue(responseWithMessageContent(rawContent));

    const result = await generateStoryStructure(context, 'test-api-key', {
      promptOptions: { enableChainOfThought: false },
    });

    expect(result).toEqual({ ...payload, rawResponse: rawContent });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const body = getRequestBody();
    expect(body.response_format).toEqual(STRUCTURE_GENERATION_SCHEMA);
    expect(body.temperature).toBe(0.8);
    expect(body.max_tokens).toBe(2000);

    const messages = body.messages as Array<{ role: string; content: string }>;
    expect(Array.isArray(messages)).toBe(true);
    expect(messages[messages.length - 1]?.content).toContain(context.characterConcept);
    expect(messages[messages.length - 1]?.content).toContain(context.worldbuilding);
    expect(messages[messages.length - 1]?.content).toContain(context.tone);
  });

  it('passes custom model, temperature, and max tokens when provided', async () => {
    const payload = createValidStructurePayload();
    fetchMock.mockResolvedValue(responseWithMessageContent(JSON.stringify(payload)));

    await generateStoryStructure(context, 'test-api-key', {
      model: 'openai/gpt-4.1-mini',
      temperature: 0.55,
      maxTokens: 1234,
      promptOptions: { enableChainOfThought: false },
    });

    const body = getRequestBody();
    expect(body.model).toBe('openai/gpt-4.1-mini');
    expect(body.temperature).toBe(0.55);
    expect(body.max_tokens).toBe(1234);
  });

  it('uses configured default model when model is omitted', async () => {
    const payload = createValidStructurePayload();
    fetchMock.mockResolvedValue(responseWithMessageContent(JSON.stringify(payload)));

    await generateStoryStructure(context, 'test-api-key', {
      promptOptions: { enableChainOfThought: false },
    });

    const body = getRequestBody();
    expect(body.model).toBe(getConfig().llm.defaultModel);
  });

  it('throws INVALID_JSON when model content is not valid JSON', async () => {
    fetchMock.mockResolvedValue(responseWithMessageContent('{"overallTheme":'));

    const pending = generateStoryStructure(context, 'test-api-key');
    const expectation = expect(pending).rejects.toMatchObject({ code: 'INVALID_JSON' });

    await advanceRetryDelays();
    await expectation;

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('throws STRUCTURE_PARSE_ERROR when overallTheme is missing', async () => {
    const payload = createValidStructurePayload();
    const invalid = { acts: payload.acts };
    fetchMock.mockResolvedValue(responseWithMessageContent(JSON.stringify(invalid)));

    const pending = generateStoryStructure(context, 'test-api-key');
    const expectation = expect(pending).rejects.toMatchObject({ code: 'STRUCTURE_PARSE_ERROR' });

    await advanceRetryDelays();
    await expectation;
  });

  it('throws STRUCTURE_PARSE_ERROR when acts count is not exactly 3', async () => {
    const payload = createValidStructurePayload();
    const invalid = { ...payload, acts: payload.acts.slice(0, 2) };
    fetchMock.mockResolvedValue(responseWithMessageContent(JSON.stringify(invalid)));

    const pending = generateStoryStructure(context, 'test-api-key');
    const expectation = expect(pending).rejects.toMatchObject({ code: 'STRUCTURE_PARSE_ERROR' });

    await advanceRetryDelays();
    await expectation;
  });

  it('throws STRUCTURE_PARSE_ERROR when an act has an invalid beat count', async () => {
    const payload = createValidStructurePayload();
    payload.acts[1] = {
      ...payload.acts[1],
      beats: [{ description: 'Only one beat', objective: 'Insufficient beats.' }],
    };
    fetchMock.mockResolvedValue(responseWithMessageContent(JSON.stringify(payload)));

    const pending = generateStoryStructure(context, 'test-api-key');
    const expectation = expect(pending).rejects.toMatchObject({ code: 'STRUCTURE_PARSE_ERROR' });

    await advanceRetryDelays();
    await expectation;
  });

  it('throws STRUCTURE_PARSE_ERROR when an act is missing required fields', async () => {
    const payload = createValidStructurePayload();
    payload.acts[0] = {
      ...payload.acts[0],
      stakes: undefined as unknown as string,
    };
    fetchMock.mockResolvedValue(responseWithMessageContent(JSON.stringify(payload)));

    const pending = generateStoryStructure(context, 'test-api-key');
    const expectation = expect(pending).rejects.toMatchObject({ code: 'STRUCTURE_PARSE_ERROR' });

    await advanceRetryDelays();
    await expectation;
  });

  it('throws STRUCTURE_PARSE_ERROR when a beat is missing required fields', async () => {
    const payload = createValidStructurePayload();
    payload.acts[2] = {
      ...payload.acts[2],
      beats: [
        { description: 'Complete the confrontation.', objective: 'Resolve climax.' },
        { description: 'Missing objective', objective: undefined as unknown as string },
      ],
    };
    fetchMock.mockResolvedValue(responseWithMessageContent(JSON.stringify(payload)));

    const pending = generateStoryStructure(context, 'test-api-key');
    const expectation = expect(pending).rejects.toMatchObject({ code: 'STRUCTURE_PARSE_ERROR' });

    await advanceRetryDelays();
    await expectation;
  });

  it('throws EMPTY_RESPONSE when OpenRouter returns no message content', async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse(200, {
        id: 'or-structure-empty',
        choices: [],
      }),
    );

    const pending = generateStoryStructure(context, 'test-api-key');
    const expectation = expect(pending).rejects.toMatchObject({ code: 'EMPTY_RESPONSE' });

    await advanceRetryDelays();
    await expectation;
  });

  it('throws retryable HTTP error for 500 responses and retries', async () => {
    fetchMock.mockResolvedValue(createErrorResponse(500, 'server error'));

    const pending = generateStoryStructure(context, 'test-api-key');
    const expectation = expect(pending).rejects.toMatchObject({ code: 'HTTP_500', retryable: true });

    await advanceRetryDelays();
    await expectation;

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('throws non-retryable HTTP error for 401 responses without retry', async () => {
    fetchMock.mockResolvedValue(createErrorResponse(401, 'invalid key'));

    await expect(generateStoryStructure(context, 'test-api-key')).rejects.toMatchObject({
      code: 'HTTP_401',
      retryable: false,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
