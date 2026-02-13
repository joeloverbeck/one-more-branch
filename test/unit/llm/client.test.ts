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
  get logger(): typeof mockLogger {
    return mockLogger;
  },
  get logPrompt(): typeof mockLogPrompt {
    return mockLogPrompt;
  },
}));

import {
  generatePagePlan,
  generatePageWriterOutput,
  generateOpeningPage,
  generateWriterPage,
  validateApiKey,
} from '../../../src/llm/client';
import { LLMError } from '../../../src/llm/llm-client-types';
import { ChoiceType, PrimaryDelta } from '../../../src/models/choice-enums';
import { ThreadType, Urgency } from '../../../src/models/state/index';

const openingContext = {
  characterConcept: 'A haunted cartographer',
  worldbuilding: 'A city built atop buried catacombs',
  tone: 'gothic mystery',
};

const continuationContext = {
  characterConcept: 'A haunted cartographer',
  worldbuilding: 'A city built atop buried catacombs',
  tone: 'gothic mystery',
  globalCanon: [],
  globalCharacterCanon: {},
  previousNarrative: 'You descend into the vault.',
  selectedChoice: 'Advance toward the chanting',
  accumulatedInventory: [],
  accumulatedHealth: [],
  accumulatedCharacterState: {},
  activeState: {
    currentLocation: 'The drowned vault',
    activeThreats: [],
    activeConstraints: [],
    openThreads: [],
  },
  grandparentNarrative: null,
  ancestorSummaries: [],
};

const plannerOpeningContext = {
  mode: 'opening' as const,
  characterConcept: 'A haunted cartographer',
  worldbuilding: 'A city built atop buried catacombs',
  tone: 'gothic mystery',
  globalCanon: [],
  globalCharacterCanon: {},
  accumulatedInventory: [],
  accumulatedHealth: [],
  accumulatedCharacterState: {},
  activeState: {
    currentLocation: 'Old city gate',
    activeThreats: [],
    activeConstraints: [],
    openThreads: [],
  },
};

const validStructuredPayload = {
  narrative:
    'You descend into the vault with water up to your knees and the lantern shaking in your grip while distant chanting rises from the stone arches above you.',
  choices: [
    {
      text: 'Advance toward the chanting',
      choiceType: 'TACTICAL_APPROACH',
      primaryDelta: 'GOAL_SHIFT',
    },
    {
      text: 'Retreat and seal the grate',
      choiceType: 'AVOIDANCE_RETREAT',
      primaryDelta: 'LOCATION_CHANGE',
    },
  ],
  currentLocation: 'The drowned vault',
  threatsAdded: [],
  threatsRemoved: [],
  constraintsAdded: [],
  constraintsRemoved: [],
  threadsAdded: [],
  threadsResolved: [],
  newCanonFacts: ['A chanting cult gathers beneath the cathedral'],
  newCharacterCanonFacts: [],
  inventoryAdded: [],
  inventoryRemoved: [],
  healthAdded: [],
  healthRemoved: [],
  characterStateChangesAdded: [],
  characterStateChangesRemoved: [],
  protagonistAffect: {
    primaryEmotion: 'dread',
    primaryIntensity: 'strong',
    primaryCause: 'Descending into a flooded vault with distant chanting',
    secondaryEmotions: [],
    dominantMotivation: 'Uncover the source of the chanting',
  },
  sceneSummary: 'Test summary of the scene events and consequences.',
  isEnding: false,
};

const validPlannerPayload = {
  sceneIntent: 'Push deeper into the vault despite immediate danger.',
  continuityAnchors: ['The chanting still echoes through the vault.'],
  stateIntents: {
    currentLocation: 'Flooded vault antechamber',
    threats: { add: ['Cult sentries close in from two sides.'], removeIds: [] },
    constraints: { add: ['Torchlight is flickering out.'], removeIds: [] },
    threads: {
      add: [
        {
          text: 'Find the source of the chanting before reinforcements arrive.',
          threadType: ThreadType.DANGER,
          urgency: Urgency.HIGH,
        },
      ],
      resolveIds: [],
    },
    inventory: { add: ['A cracked lantern lens'], removeIds: [] },
    health: { add: ['Minor smoke inhalation'], removeIds: [] },
    characterState: {
      add: [{ characterName: 'Mara', states: ['Shaken but determined'] }],
      removeIds: [],
    },
    canon: { worldAdd: ['The lower vault has ritual markings on every column.'], characterAdd: [] },
  },
  writerBrief: {
    openingLineDirective: 'Start on immediate tactical pressure.',
    mustIncludeBeats: ['Sentries moving in', 'A risky route choice'],
    forbiddenRecaps: ['Do not restate the full descent sequence.'],
  },
  dramaticQuestion: 'Will you push deeper or seal the vault behind you?',
  choiceIntents: [
    {
      hook: 'Press forward toward the chanting',
      choiceType: ChoiceType.CONFRONTATION,
      primaryDelta: PrimaryDelta.THREAT_SHIFT,
    },
    {
      hook: 'Seal the entrance and find another route',
      choiceType: ChoiceType.TACTICAL_APPROACH,
      primaryDelta: PrimaryDelta.LOCATION_CHANGE,
    },
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

describe('llm client', () => {
  const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    mockLogPrompt.mockReset();
    mockLogger.info.mockReset();
    mockLogger.warn.mockReset();
    mockLogger.error.mockReset();
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
    fetchMock.mockResolvedValue(
      responseWithStructuredContent(JSON.stringify(validStructuredPayload))
    );

    await generateOpeningPage(openingContext, { apiKey: 'test-key' });

    const init = getRequestInit(0);
    const headers = (init?.headers ?? {}) as Record<string, string>;

    expect(headers['Content-Type']).toBe('application/json');
    expect(headers.Authorization).toBe('Bearer test-key');
    expect(headers['HTTP-Referer']).toBe('http://localhost:3000');
    expect(headers['X-Title']).toBe('One More Branch');
  });

  it('should include response_format for structured output', async () => {
    fetchMock.mockResolvedValue(
      responseWithStructuredContent(JSON.stringify(validStructuredPayload))
    );

    await generateOpeningPage(openingContext, { apiKey: 'test-key' });

    const body = getRequestBody();
    expect(body.response_format).toBeDefined();
  });

  it('should use DEFAULT_MODEL when not specified', async () => {
    fetchMock.mockResolvedValue(
      responseWithStructuredContent(JSON.stringify(validStructuredPayload))
    );

    await generateOpeningPage(openingContext, { apiKey: 'test-key' });

    const body = getRequestBody();
    expect(body.model).toBe('anthropic/claude-sonnet-4.5');
  });

  it('should use custom model when provided', async () => {
    fetchMock.mockResolvedValue(
      responseWithStructuredContent(JSON.stringify(validStructuredPayload))
    );

    await generateOpeningPage(openingContext, {
      apiKey: 'test-key',
      model: 'openai/gpt-4.1-mini',
    });

    const body = getRequestBody();
    expect(body.model).toBe('openai/gpt-4.1-mini');
  });

  it('should use default temperature 0.8', async () => {
    fetchMock.mockResolvedValue(
      responseWithStructuredContent(JSON.stringify(validStructuredPayload))
    );

    await generateOpeningPage(openingContext, { apiKey: 'test-key' });

    const body = getRequestBody();
    expect(body.temperature).toBe(0.8);
  });

  it('should use default maxTokens 8192', async () => {
    fetchMock.mockResolvedValue(
      responseWithStructuredContent(JSON.stringify(validStructuredPayload))
    );

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

    await expect(generateOpeningPage(openingContext, { apiKey: 'test-key' })).rejects.toMatchObject(
      {
        code: 'HTTP_401',
        retryable: false,
      }
    );
  });

  it('should throw LLMError for empty response', async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse(200, {
        id: 'or-1',
        choices: [],
      })
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

  it('should parse structured output when content is returned as text parts', async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse(200, {
        id: 'or-1',
        choices: [
          {
            message: {
              content: [{ type: 'text', text: JSON.stringify(validStructuredPayload) }],
            },
            finish_reason: 'stop',
          },
        ],
      })
    );

    const result = await generateOpeningPage(openingContext, { apiKey: 'test-key' });

    expect(result.narrative).toContain('You descend into the vault');
    expect(result.choices).toHaveLength(2);
  });

  it('should throw clear error when structured output not supported', async () => {
    fetchMock.mockResolvedValue(createErrorResponse(400, 'response_format is not supported'));

    await expect(generateOpeningPage(openingContext, { apiKey: 'test-key' })).rejects.toMatchObject(
      {
        code: 'STRUCTURED_OUTPUT_NOT_SUPPORTED',
        retryable: false,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        message: expect.stringContaining('does not support structured outputs'),
      }
    );
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

    await expect(
      generateOpeningPage(openingContext, { apiKey: 'test-key' })
    ).rejects.toBeInstanceOf(LLMError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should treat schema validation failures as non-retryable', async () => {
    const invalidStructuredPayload = {
      narrative: validStructuredPayload.narrative,
      choices: [
        { text: 'Only one choice', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
      ],
      currentLocation: 'Invalid location',
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
      newCanonFacts: [],
      newCharacterCanonFacts: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      protagonistAffect: {
        primaryEmotion: 'confusion',
        primaryIntensity: 'mild',
        primaryCause: 'Invalid state',
        secondaryEmotions: [],
        dominantMotivation: 'Resolve the error',
      },
      sceneSummary: 'Test summary of the scene events and consequences.',
      isEnding: false,
    };

    fetchMock.mockResolvedValue(
      responseWithStructuredContent(JSON.stringify(invalidStructuredPayload))
    );

    const promise = generateOpeningPage(openingContext, { apiKey: 'test-key' });

    // Attach rejection handler early to prevent unhandled rejection detection
    const expectation = expect(promise).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      retryable: false,
    });

    await expectation;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should log opening prompts before API call', async () => {
    fetchMock.mockResolvedValue(
      responseWithStructuredContent(JSON.stringify(validStructuredPayload))
    );

    await generateOpeningPage(openingContext, { apiKey: 'test-key' });

    expect(mockLogPrompt).toHaveBeenCalledWith(mockLogger, 'opening', expect.any(Array));
    expect(mockLogPrompt).toHaveBeenCalledTimes(1);
  });

  it('should throw clear error for model does not support response_format', async () => {
    fetchMock.mockResolvedValue(
      createErrorResponse(
        400,
        JSON.stringify({
          error: { message: 'model does not support response_format' },
        })
      )
    );

    await expect(generateOpeningPage(openingContext, { apiKey: 'test-key' })).rejects.toMatchObject(
      {
        code: 'STRUCTURED_OUTPUT_NOT_SUPPORTED',
        retryable: false,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        message: expect.stringContaining('does not support structured outputs'),
      }
    );
  });

  it('should NOT fall back for generic validation errors (model supports structured output)', async () => {
    // This error indicates the model DOES support structured output but validation failed
    // It should NOT trigger fallback, but should retry and eventually fail
    fetchMock.mockResolvedValue(
      createErrorResponse(
        400,
        JSON.stringify({
          error: { message: 'Strict mode validation failed for additionalProperties' },
        })
      )
    );

    const promise = generateOpeningPage(openingContext, { apiKey: 'test-key' });

    // Attach rejection handler early
    const expectation = expect(promise).rejects.toMatchObject({
      code: 'HTTP_400',
    });

    // Advance through retry delays (3 attempts total)
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(2000);

    await expectation;

    // Should not have called warn about fallback
    expect(mockLogger.warn).not.toHaveBeenCalledWith(
      'Model lacks structured output support, using text parsing fallback',
      expect.anything()
    );
  });

  it('should throw clear error for provider does not support json_schema', async () => {
    fetchMock.mockResolvedValue(createErrorResponse(400, 'provider does not support json_schema'));

    await expect(generateOpeningPage(openingContext, { apiKey: 'test-key' })).rejects.toMatchObject(
      {
        code: 'STRUCTURED_OUTPUT_NOT_SUPPORTED',
        retryable: false,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        message: expect.stringContaining('does not support structured outputs'),
      }
    );
  });

  it('should log API error details before throwing', async () => {
    fetchMock.mockResolvedValue(createErrorResponse(401, 'Invalid API key provided'));

    await expect(generateOpeningPage(openingContext, { apiKey: 'test-key' })).rejects.toMatchObject(
      {
        code: 'HTTP_401',
      }
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      'OpenRouter API error [401]: Invalid API key provided'
    );
  });

  it('should log raw response when structured validation fails', async () => {
    const invalidStructuredPayload = {
      narrative: validStructuredPayload.narrative,
      choices: [
        { text: 'Only one choice', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
      ],
      currentLocation: 'Invalid location',
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
      newCanonFacts: [],
      newCharacterCanonFacts: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      protagonistAffect: {
        primaryEmotion: 'confusion',
        primaryIntensity: 'mild',
        primaryCause: 'Invalid state',
        secondaryEmotions: [],
        dominantMotivation: 'Resolve the error',
      },
      sceneSummary: 'Test summary of the scene events and consequences.',
      isEnding: false,
    };

    fetchMock.mockResolvedValue(
      responseWithStructuredContent(JSON.stringify(invalidStructuredPayload))
    );

    const promise = generateOpeningPage(openingContext, { apiKey: 'test-key' });

    await expect(promise).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      retryable: false,
    });

    const rejectedError = await promise.catch((error: unknown): unknown => error);
    expect(rejectedError).toBeInstanceOf(LLMError);
    const errorContext = rejectedError instanceof LLMError ? rejectedError.context : undefined;
    expect(Array.isArray(errorContext?.validationIssues)).toBe(true);
    expect(Array.isArray(errorContext?.ruleKeys)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const errorCalls = mockLogger.error.mock.calls as Array<[unknown, unknown?]>;
    const validationErrorCall = errorCalls.find(
      ([message]) => message === 'Writer structured response validation failed'
    );
    expect(validationErrorCall).toBeDefined();
    const validationErrorMetadata =
      validationErrorCall &&
      typeof validationErrorCall[1] === 'object' &&
      validationErrorCall[1] !== null
        ? (validationErrorCall[1] as { rawResponse?: string })
        : undefined;
    expect(validationErrorMetadata?.rawResponse).toContain('Only one choice');
    const validationIssues =
      validationErrorCall &&
      typeof validationErrorCall[1] === 'object' &&
      validationErrorCall[1] !== null &&
      'validationIssues' in validationErrorCall[1]
        ? (validationErrorCall[1] as { validationIssues?: unknown }).validationIssues
        : undefined;
    expect(Array.isArray(validationIssues)).toBe(true);
  });

  it('emits validator failure counters with observability identifiers when provided', async () => {
    const invalidStructuredPayload = {
      ...validStructuredPayload,
      choices: [
        { text: 'Only one choice', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
      ],
    };

    fetchMock.mockResolvedValue(
      responseWithStructuredContent(JSON.stringify(invalidStructuredPayload))
    );

    await expect(
      generateWriterPage(continuationContext, {
        apiKey: 'test-key',
        observability: {
          storyId: 'story-123',
          pageId: 7,
          requestId: 'req-abc',
        },
      })
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      retryable: false,
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Writer validator failure counter',
      expect.objectContaining({
        storyId: 'story-123',
        pageId: 7,
        requestId: 'req-abc',
      })
    );
    const errorCalls = mockLogger.error.mock.calls as Array<[unknown, unknown?]>;
    const counterCall = errorCalls.find(
      ([message]) => message === 'Writer validator failure counter'
    );
    expect(counterCall).toBeDefined();
    const counterContext =
      counterCall && typeof counterCall[1] === 'object' && counterCall[1] !== null
        ? (counterCall[1] as Record<string, unknown>)
        : undefined;
    expect(typeof counterContext?.ruleKey).toBe('string');
    expect(typeof counterContext?.count).toBe('number');
  });

  it('repairs misplaced removal IDs when writerValidationContext confirms the ID exists', async () => {
    fetchMock.mockResolvedValue(
      responseWithStructuredContent(
        JSON.stringify({
          ...validStructuredPayload,
          threatsRemoved: ['td-1'],
          threadsResolved: [],
        })
      )
    );

    const result = await generateWriterPage(continuationContext, {
      apiKey: 'test-key',
      writerValidationContext: {
        removableIds: {
          threats: [],
          constraints: [],
          threads: ['td-1'],
          inventory: [],
          health: [],
          characterState: [],
        },
      },
    });

    expect(result.threatsRemoved).toEqual([]);
    expect(result.threadsResolved).toEqual(['td-1']);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Writer removal ID field mismatch repaired',
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        repairs: expect.arrayContaining([
          expect.objectContaining({
            id: 'td-1',
            fromField: 'threatsRemoved',
            toField: 'threadsResolved',
          }),
        ]),
      })
    );
  });

  it('does not repair unknown misplaced IDs and still returns validated output', async () => {
    fetchMock.mockResolvedValue(
      responseWithStructuredContent(
        JSON.stringify({
          ...validStructuredPayload,
          threatsRemoved: ['td-999'],
          threadsResolved: [],
        })
      )
    );

    const result = await generateWriterPage(continuationContext, {
      apiKey: 'test-key',
      writerValidationContext: {
        removableIds: {
          threats: [],
          constraints: [],
          threads: ['td-1'],
          inventory: [],
          health: [],
          characterState: [],
        },
      },
    });

    expect(result.threatsRemoved).toEqual(['td-999']);
    expect(result.threadsResolved).toEqual([]);
  });

  it('should support generatePageWriterOutput by forwarding plan into writer prompt context', async () => {
    fetchMock.mockResolvedValue(
      responseWithStructuredContent(JSON.stringify(validStructuredPayload))
    );

    await generatePageWriterOutput(continuationContext, validPlannerPayload, {
      apiKey: 'test-key',
    });

    const body = getRequestBody();
    const messages = Array.isArray(body.messages)
      ? (body.messages as Array<{ content?: string }>)
      : [];
    const userPrompt =
      messages.find(
        (message) =>
          typeof message.content === 'string' &&
          message.content.includes("Continue the interactive story based on the player's choice.")
      )?.content ?? '';

    expect(mockLogPrompt).toHaveBeenCalledWith(mockLogger, 'writer', expect.any(Array));
    expect(userPrompt).toContain(`Scene Intent: ${validPlannerPayload.sceneIntent}`);
    expect(userPrompt).toContain(validPlannerPayload.writerBrief.openingLineDirective);
  });

  it('should log planner prompts before API call', async () => {
    fetchMock.mockResolvedValue(responseWithStructuredContent(JSON.stringify(validPlannerPayload)));

    await generatePagePlan(plannerOpeningContext, { apiKey: 'test-key' });

    expect(mockLogPrompt).toHaveBeenCalledWith(mockLogger, 'planner', expect.any(Array));
  });

  it('should retry planner generation for retryable errors', async () => {
    fetchMock.mockResolvedValue(createErrorResponse(500, 'server error'));

    const promise = generatePagePlan(plannerOpeningContext, { apiKey: 'test-key' });

    const expectation = expect(promise).rejects.toMatchObject({
      code: 'HTTP_500',
      retryable: true,
    });

    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(2000);

    await expectation;
    expect(fetchMock).toHaveBeenCalledTimes(3);
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
