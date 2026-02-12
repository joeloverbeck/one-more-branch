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
}));

import { generatePlannerWithFallback } from '../../../src/llm/planner-generation';
import { LLMError, type ChatMessage } from '../../../src/llm/types';
import { ThreadType, Urgency } from '../../../src/models/state/index';

const plannerMessages: ChatMessage[] = [
  {
    role: 'system',
    content: 'You are a planner.',
  },
  {
    role: 'user',
    content: 'Return a valid plan.',
  },
];

const validPlannerPayload = {
  sceneIntent: 'Force the protagonist to choose between stealth and speed.',
  continuityAnchors: ['The bell tower remains occupied by sentries.'],
  stateIntents: {
    currentLocation: 'Archive access corridor',
    threats: { add: ['A patrol rounds the corridor.'], removeIds: [] },
    constraints: { add: ['Lantern oil is almost gone.'], removeIds: [] },
    threads: {
      add: [{ text: 'Reach the archive door before lockout.', threadType: ThreadType.QUEST, urgency: Urgency.HIGH }],
      resolveIds: [],
    },
    inventory: { add: ['A bent lockpick'], removeIds: [] },
    health: { add: ['A fresh bruise on the shoulder'], removeIds: [] },
    characterState: { add: [{ characterName: 'Mara', states: ['Focused under pressure'] }], removeIds: [] },
    canon: { worldAdd: ['The archive lockout triggers at moonset.'], characterAdd: [] },
  },
  writerBrief: {
    openingLineDirective: 'Open at the moment the patrol appears.',
    mustIncludeBeats: ['Patrol sighting', 'Immediate tactical decision'],
    forbiddenRecaps: ['Do not recap the entire infiltration route.'],
  },
  dramaticQuestion: 'Will you slip past the patrol or confront them before lockout?',
  choiceIntents: [
    { hook: 'Ghost past the patrol in shadow', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'EXPOSURE_CHANGE' },
    { hook: 'Confront the nearest sentry directly', choiceType: 'CONFRONTATION', primaryDelta: 'THREAT_SHIFT' },
  ],
};

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

describe('planner-generation', () => {
  const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    mockLogger.error.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
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

  it('calls OpenRouter with planner response format and returns a validated plan', async () => {
    fetchMock.mockResolvedValue(responseWithStructuredContent(JSON.stringify(validPlannerPayload)));

    const result = await generatePlannerWithFallback(plannerMessages, {
      apiKey: 'test-key',
    });

    expect(result.sceneIntent).toContain('Force the protagonist');
    expect(result.stateIntents.threads.add).toHaveLength(1);
    expect(result.rawResponse).toContain('sceneIntent');
    const firstCall = fetchMock.mock.calls[0];
    const init = firstCall?.[1];
    const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : {};
    const responseFormat = body['response_format'] as { json_schema?: { name?: string } };
    expect(responseFormat.json_schema?.name).toBe('page_planner_generation');
  });

  it('throws STRUCTURED_OUTPUT_NOT_SUPPORTED for unsupported response_format errors', async () => {
    fetchMock.mockResolvedValue(createErrorResponse(400, 'provider does not support json_schema'));

    await expect(
      generatePlannerWithFallback(plannerMessages, { apiKey: 'test-key' }),
    ).rejects.toMatchObject({
      code: 'STRUCTURED_OUTPUT_NOT_SUPPORTED',
      retryable: false,
    });
  });

  it('retries with non-strict planner schema when provider rejects oversized compiled grammar', async () => {
    const oversizedGrammarError = {
      error: {
        message: 'Provider returned error',
        code: 400,
        metadata: {
          raw: JSON.stringify({
            type: 'error',
            error: {
              type: 'invalid_request_error',
              message:
                'The compiled grammar is too large, which would cause performance issues. Simplify your tool schemas or reduce the number of strict tools.',
            },
            request_id: 'req_test_grammar_too_large',
          }),
        },
      },
    };
    fetchMock
      .mockResolvedValueOnce(createJsonResponse(400, oversizedGrammarError))
      .mockResolvedValueOnce(responseWithStructuredContent(JSON.stringify(validPlannerPayload)));

    const result = await generatePlannerWithFallback(plannerMessages, {
      apiKey: 'test-key',
    });

    expect(result.sceneIntent).toContain('Force the protagonist');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstCall = fetchMock.mock.calls[0];
    const firstInit = firstCall?.[1];
    const firstBody =
      typeof firstInit?.body === 'string' ? (JSON.parse(firstInit.body) as Record<string, unknown>) : {};
    const firstResponseFormat = firstBody['response_format'] as {
      json_schema?: { strict?: boolean; name?: string };
    };
    expect(firstResponseFormat.json_schema?.name).toBe('page_planner_generation');
    expect(firstResponseFormat.json_schema?.strict).toBe(true);

    const secondCall = fetchMock.mock.calls[1];
    const secondInit = secondCall?.[1];
    const secondBody =
      typeof secondInit?.body === 'string' ? (JSON.parse(secondInit.body) as Record<string, unknown>) : {};
    const secondResponseFormat = secondBody['response_format'] as {
      json_schema?: { strict?: boolean; name?: string };
    };
    expect(secondResponseFormat.json_schema?.name).toBe('page_planner_generation');
    expect(secondResponseFormat.json_schema?.strict).toBe(false);
  });

  it('adds observability identifiers to validation failures', async () => {
    fetchMock.mockResolvedValue(
      responseWithStructuredContent(
        JSON.stringify({
          ...validPlannerPayload,
          stateIntents: {
            ...validPlannerPayload.stateIntents,
            threats: {
              ...validPlannerPayload.stateIntents.threats,
              removeIds: ['cn-1'],
            },
          },
        }),
      ),
    );

    const rejectedError = await generatePlannerWithFallback(plannerMessages, {
      apiKey: 'test-key',
      observability: {
        storyId: 'story-123',
        pageId: 10,
        requestId: 'req-abc',
      },
    }).catch((error: unknown): unknown => error);

    expect(rejectedError).toBeInstanceOf(LLMError);
    const llmError = rejectedError as LLMError;
    expect(llmError.code).toBe('VALIDATION_ERROR');
    expect(llmError.retryable).toBe(false);
    expect(llmError.context?.storyId).toBe('story-123');
    expect(llmError.context?.pageId).toBe(10);
    expect(llmError.context?.requestId).toBe('req-abc');
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Page planner structured response validation failed',
      expect.objectContaining({
        storyId: 'story-123',
        pageId: 10,
        requestId: 'req-abc',
      }),
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Planner validator failure counter',
      expect.objectContaining({
        storyId: 'story-123',
        pageId: 10,
        requestId: 'req-abc',
      }),
    );
    const errorCalls = mockLogger.error.mock.calls as Array<[unknown, unknown?]>;
    const counterCall = errorCalls.find(
      ([message]) => message === 'Planner validator failure counter',
    );
    expect(counterCall).toBeDefined();
    const counterContext =
      counterCall && typeof counterCall[1] === 'object' && counterCall[1] !== null
        ? (counterCall[1] as Record<string, unknown>)
        : undefined;
    expect(typeof counterContext?.ruleKey).toBe('string');
    expect(typeof counterContext?.count).toBe('number');
  });

  it('emits planner validator counters with null observability identifiers when not provided', async () => {
    fetchMock.mockResolvedValue(
      responseWithStructuredContent(
        JSON.stringify({
          ...validPlannerPayload,
          stateIntents: {
            ...validPlannerPayload.stateIntents,
            canon: {
              ...validPlannerPayload.stateIntents.canon,
              worldAdd: ['Duplicate world fact', 'Duplicate world fact'],
            },
          },
        }),
      ),
    );

    await expect(
      generatePlannerWithFallback(plannerMessages, { apiKey: 'test-key' }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      retryable: false,
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Planner validator failure counter',
      expect.objectContaining({
        storyId: null,
        pageId: null,
        requestId: null,
      }),
    );
  });
});
