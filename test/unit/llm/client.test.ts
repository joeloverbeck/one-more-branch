// Mock the logging module - must be before imports due to hoisting
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
  get logger() {
    return mockLogger;
  },
  get logPrompt() {
    return mockLogPrompt;
  },
}));

import {
  generateContinuationPage,
  generateOpeningPage,
  validateApiKey,
} from '../../../src/llm/client';
import { LLMError } from '../../../src/llm/types';

const openingContext = {
  characterConcept: 'A haunted cartographer',
  worldbuilding: 'A city built atop buried catacombs',
  tone: 'gothic mystery',
};

const continuationContext = {
  characterConcept: 'A haunted cartographer',
  worldbuilding: 'A city built atop buried catacombs',
  tone: 'gothic mystery',
  globalCanon: ['The lower vault floods at midnight'],
  storyArc: 'Map the drowned vault before the cult reaches it.',
  previousNarrative:
    'You stand at the iron grate while lantern light trembles across black water and old carvings.',
  selectedChoice: 'Pry open the grate and descend into the vault',
  accumulatedState: ['You stole a key from the sexton.'],
};

const validStructuredPayload = {
  narrative:
    'You descend into the vault with water up to your knees and the lantern shaking in your grip while distant chanting rises from the stone arches above you.',
  choices: ['Advance toward the chanting', 'Retreat and seal the grate'],
  stateChanges: ['Entered the drowned vault'],
  canonFacts: ['A chanting cult gathers beneath the cathedral'],
  isEnding: false,
  storyArc: 'Map the drowned vault before the cult reaches it.',
};

const validTextPayload = `
NARRATIVE:
You descend into the vault with water up to your knees and the lantern shaking in your grip while distant chanting rises from the stone arches above you.

CHOICES:
1. Advance toward the chanting
2. Retreat and seal the grate

STATE_CHANGES:
- Entered the drowned vault

CANON_FACTS:
- A chanting cult gathers beneath the cathedral
`;

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

describe('llm client', () => {
  const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    mockLogPrompt.mockReset();
    mockLogger.warn.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  function responseWithStructuredContent(content: string): Response {
    return createJsonResponse(200, {
      id: 'or-1',
      choices: [{ message: { content }, finish_reason: 'stop' }],
    });
  }

  function getRequestInit(callIndex = 0): RequestInit {
    const call = fetchMock.mock.calls[callIndex];
    if (!call) {
      return {};
    }

    return call[1] ?? {};
  }

  function getRequestBody(callIndex = 0): Record<string, unknown> {
    const init = getRequestInit(callIndex);
    if (typeof init.body !== 'string') {
      return {};
    }

    return JSON.parse(init.body) as Record<string, unknown>;
  }

  it('should call OpenRouter with correct headers', async () => {
    fetchMock.mockResolvedValue(responseWithStructuredContent(JSON.stringify(validStructuredPayload)));

    await generateOpeningPage(openingContext, { apiKey: 'test-key' });

    const init = getRequestInit(0);
    const headers = (init?.headers ?? {}) as Record<string, string>;

    expect(headers['Content-Type']).toBe('application/json');
    expect(headers.Authorization).toBe('Bearer test-key');
    expect(headers['HTTP-Referer']).toBe('http://localhost:3000');
    expect(headers['X-Title']).toBe('One More Branch');
  });

  it('should include response_format for structured output', async () => {
    fetchMock.mockResolvedValue(responseWithStructuredContent(JSON.stringify(validStructuredPayload)));

    await generateOpeningPage(openingContext, { apiKey: 'test-key' });

    const body = getRequestBody();
    expect(body.response_format).toBeDefined();
  });

  it('should use DEFAULT_MODEL when not specified', async () => {
    fetchMock.mockResolvedValue(responseWithStructuredContent(JSON.stringify(validStructuredPayload)));

    await generateOpeningPage(openingContext, { apiKey: 'test-key' });

    const body = getRequestBody();
    expect(body.model).toBe('anthropic/claude-sonnet-4.5');
  });

  it('should use custom model when provided', async () => {
    fetchMock.mockResolvedValue(responseWithStructuredContent(JSON.stringify(validStructuredPayload)));

    await generateOpeningPage(openingContext, {
      apiKey: 'test-key',
      model: 'openai/gpt-4.1-mini',
    });

    const body = getRequestBody();
    expect(body.model).toBe('openai/gpt-4.1-mini');
  });

  it('should use default temperature 0.8', async () => {
    fetchMock.mockResolvedValue(responseWithStructuredContent(JSON.stringify(validStructuredPayload)));

    await generateOpeningPage(openingContext, { apiKey: 'test-key' });

    const body = getRequestBody();
    expect(body.temperature).toBe(0.8);
  });

  it('should use default maxTokens 8192', async () => {
    fetchMock.mockResolvedValue(responseWithStructuredContent(JSON.stringify(validStructuredPayload)));

    await generateOpeningPage(openingContext, { apiKey: 'test-key' });

    const body = getRequestBody();
    expect(body.max_tokens).toBe(8192);
  });

  it('should throw LLMError with retryable=true for 429', async () => {
    fetchMock.mockResolvedValue(createErrorResponse(429, 'rate limited'));

    const promise = generateOpeningPage(openingContext, { apiKey: 'test-key' });

    // Attach rejection handler early to prevent unhandled rejection detection
    const expectation = expect(promise).rejects.toMatchObject({
      code: 'HTTP_429',
      retryable: true,
    });

    // Advance through retry delays: 1000ms then 2000ms
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(2000);

    await expectation;
  });

  it('should throw LLMError with retryable=true for 500', async () => {
    fetchMock.mockResolvedValue(createErrorResponse(500, 'server error'));

    const promise = generateOpeningPage(openingContext, { apiKey: 'test-key' });

    // Attach rejection handler early to prevent unhandled rejection detection
    const expectation = expect(promise).rejects.toMatchObject({
      code: 'HTTP_500',
      retryable: true,
    });

    // Advance through retry delays: 1000ms then 2000ms
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(2000);

    await expectation;
  });

  it('should throw LLMError with retryable=false for 401', async () => {
    fetchMock.mockResolvedValue(createErrorResponse(401, 'invalid key'));

    await expect(generateOpeningPage(openingContext, { apiKey: 'test-key' })).rejects.toMatchObject({
      code: 'HTTP_401',
      retryable: false,
    });
  });

  it('should throw LLMError for empty response', async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse(200, {
        id: 'or-1',
        choices: [],
      }),
    );

    const promise = generateOpeningPage(openingContext, { apiKey: 'test-key' });

    // Attach rejection handler early to prevent unhandled rejection detection
    const expectation = expect(promise).rejects.toMatchObject({
      code: 'EMPTY_RESPONSE',
    });

    // Advance through retry delays: 1000ms then 2000ms
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(2000);

    await expectation;
  });

  it('should throw LLMError for invalid JSON', async () => {
    fetchMock.mockResolvedValue(responseWithStructuredContent('{"narrative": '));

    const promise = generateOpeningPage(openingContext, { apiKey: 'test-key' });

    // Attach rejection handler early to prevent unhandled rejection detection
    const expectation = expect(promise).rejects.toMatchObject({
      code: 'INVALID_JSON',
    });

    // Advance through retry delays: 1000ms then 2000ms
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(2000);

    await expectation;
  });

  it('should fall back to text mode when structured output not supported', async () => {
    fetchMock
      .mockResolvedValueOnce(createErrorResponse(400, 'response_format is not supported'))
      .mockResolvedValueOnce(responseWithStructuredContent(validTextPayload));

    const result = await generateOpeningPage(openingContext, { apiKey: 'test-key' });

    const firstBody = getRequestBody(0);
    const secondBody = getRequestBody(1);

    expect(firstBody.response_format).toBeDefined();
    expect(secondBody.response_format).toBeUndefined();
    expect(result.choices).toHaveLength(2);
  });

  it('should use text mode directly when forceTextParsing=true', async () => {
    fetchMock.mockResolvedValue(responseWithStructuredContent(validTextPayload));

    await generateOpeningPage(openingContext, {
      apiKey: 'test-key',
      forceTextParsing: true,
    });

    const body = getRequestBody();
    const messages = body.messages as Array<{ role: string; content: string }>;

    expect(body.response_format).toBeUndefined();
    expect(messages[0]?.role).toBe('system');
    expect(messages[0]?.content).toContain('OUTPUT FORMAT:');
  });

  it('should retry up to maxRetries times for retryable errors', async () => {
    fetchMock.mockResolvedValue(createErrorResponse(500, 'server error'));

    const promise = generateOpeningPage(openingContext, { apiKey: 'test-key' });

    // Attach rejection handler early to prevent unhandled rejection detection
    const expectation = expect(promise).rejects.toBeInstanceOf(LLMError);

    // Advance through retry delays: 1000ms then 2000ms
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(2000);

    await expectation;

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('should not retry non-retryable errors', async () => {
    fetchMock.mockResolvedValue(createErrorResponse(401, 'invalid key'));

    await expect(generateOpeningPage(openingContext, { apiKey: 'test-key' })).rejects.toBeInstanceOf(
      LLMError,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should use exponential backoff and succeed if retry succeeds', async () => {
    const timeoutSpy = jest.spyOn(global, 'setTimeout');

    fetchMock
      .mockResolvedValueOnce(createErrorResponse(500, 'server error'))
      .mockResolvedValueOnce(createErrorResponse(500, 'server error'))
      .mockResolvedValueOnce(responseWithStructuredContent(JSON.stringify(validStructuredPayload)));

    const pending = generateContinuationPage(continuationContext, { apiKey: 'test-key' });

    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(2000);

    const result = await pending;

    const delays = timeoutSpy.mock.calls.map(call => Number(call[1] ?? 0));

    expect(result.narrative.length).toBeGreaterThan(50);
    expect(delays).toEqual([1000, 2000]);
    timeoutSpy.mockRestore();
  });

  it('should treat schema validation failures as retryable', async () => {
    const invalidStructuredPayload = {
      narrative: validStructuredPayload.narrative,
      choices: ['Only one choice'],
      stateChanges: [],
      canonFacts: [],
      isEnding: false,
    };

    fetchMock.mockResolvedValue(
      responseWithStructuredContent(JSON.stringify(invalidStructuredPayload)),
    );

    const promise = generateOpeningPage(openingContext, { apiKey: 'test-key' });

    // Attach rejection handler early to prevent unhandled rejection detection
    const expectation = expect(promise).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      retryable: true,
    });

    // Advance through retry delays: 1000ms then 2000ms
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(2000);

    await expectation;
  });

  it('should log opening prompts before API call', async () => {
    fetchMock.mockResolvedValue(responseWithStructuredContent(JSON.stringify(validStructuredPayload)));

    await generateOpeningPage(openingContext, { apiKey: 'test-key' });

    expect(mockLogPrompt).toHaveBeenCalledWith(
      mockLogger,
      'opening',
      expect.any(Array),
    );
    expect(mockLogPrompt).toHaveBeenCalledTimes(1);
  });

  it('should log continuation prompts before API call', async () => {
    fetchMock.mockResolvedValue(responseWithStructuredContent(JSON.stringify(validStructuredPayload)));

    await generateContinuationPage(continuationContext, { apiKey: 'test-key' });

    expect(mockLogPrompt).toHaveBeenCalledWith(
      mockLogger,
      'continuation',
      expect.any(Array),
    );
    expect(mockLogPrompt).toHaveBeenCalledTimes(1);
  });

  it('should use logger.warn for fallback notification', async () => {
    fetchMock
      .mockResolvedValueOnce(createErrorResponse(400, 'response_format is not supported'))
      .mockResolvedValueOnce(responseWithStructuredContent(validTextPayload));

    await generateOpeningPage(openingContext, { apiKey: 'test-key' });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Model lacks structured output support, using text parsing fallback',
    );
  });
});

describe('validateApiKey', () => {
  const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('should return false for 401 response', async () => {
    fetchMock.mockResolvedValue(createJsonResponse(401, {}));

    await expect(validateApiKey('invalid-key')).resolves.toBe(false);
  });

  it('should return true for 200 response', async () => {
    fetchMock.mockResolvedValue(createJsonResponse(200, {}));

    await expect(validateApiKey('valid-key')).resolves.toBe(true);
  });

  it('should return true for 400 response', async () => {
    fetchMock.mockResolvedValue(createJsonResponse(400, {}));

    await expect(validateApiKey('possibly-valid-key')).resolves.toBe(true);
  });

  it('should return true for network errors', async () => {
    fetchMock.mockRejectedValue(new Error('network offline'));

    await expect(validateApiKey('unknown-key')).resolves.toBe(true);
  });
});
