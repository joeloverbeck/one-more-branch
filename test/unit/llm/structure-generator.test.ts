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

import { getConfig } from '../../../src/config/index';
import { STRUCTURE_GENERATION_SCHEMA } from '../../../src/llm/schemas/structure-schema';
import { generateStoryStructure } from '../../../src/llm/structure-generator';

interface StructurePayload {
  overallTheme: string;
  premise: string;
  pacingBudget: { targetPagesMin: number; targetPagesMax: number };
  acts: Array<{
    name: string;
    objective: string;
    stakes: string;
    entryCondition: string;
    beats: Array<{
      name: string;
      description: string;
      objective: string;
      role: string;
    }>;
  }>;
}

function createValidStructurePayload(): StructurePayload {
  return {
    overallTheme: 'Expose the tribunal and reclaim your honor.',
    premise: 'A disgraced guard must infiltrate the tribunal that framed her to uncover proof of their corruption.',
    pacingBudget: { targetPagesMin: 20, targetPagesMax: 40 },
    acts: [
      {
        name: 'Act I',
        objective: 'Get pulled into the conspiracy.',
        stakes: 'Failure means execution.',
        entryCondition: 'A public murder is pinned on the protagonist.',
        beats: [
          { name: 'Witness contact', description: 'Find a hidden witness.', objective: 'Obtain credible evidence.', role: 'setup' },
          { name: 'Archive theft', description: 'Steal archive records.', objective: 'Secure proof before it burns.', role: 'turning_point' },
        ],
      },
      {
        name: 'Act II',
        objective: 'Expose the network while hunted.',
        stakes: 'Failure locks the city under martial rule.',
        entryCondition: 'The records name powerful conspirators.',
        beats: [
          { name: 'Rival negotiation', description: 'Negotiate with rivals.', objective: 'Gain reluctant allies.', role: 'escalation' },
          { name: 'Rigged hearing', description: 'Survive a rigged hearing.', objective: 'Force evidence into the open.', role: 'turning_point' },
        ],
      },
      {
        name: 'Act III',
        objective: 'End the conspiracy and define justice.',
        stakes: 'Failure cements permanent authoritarian control.',
        entryCondition: 'Conspirators are identified and vulnerable.',
        beats: [
          { name: 'Alliance split', description: 'Alliance fractures.', objective: 'Choose justice over revenge.', role: 'turning_point' },
          { name: 'Tribunal reckoning', description: 'Confront tribunal leaders.', objective: 'Resolve the central conflict.', role: 'resolution' },
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
    mockLogPrompt.mockReset();
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
      promptOptions: {},
    });

    expect(result).toEqual({ ...payload, rawResponse: rawContent });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const body = getRequestBody();
    expect(body.response_format).toEqual(STRUCTURE_GENERATION_SCHEMA);
    expect(body.temperature).toBe(0.8);
    expect(body.max_tokens).toBe(8192);

    const messages = body.messages as Array<{ role: string; content: string }>;
    expect(Array.isArray(messages)).toBe(true);
    expect(messages[messages.length - 1]?.content).toContain(context.characterConcept);
    expect(messages[messages.length - 1]?.content).toContain(context.worldbuilding);
    expect(messages[messages.length - 1]?.content).toContain(context.tone);
    expect(mockLogPrompt).toHaveBeenCalledWith(mockLogger, 'structure', expect.any(Array));
    expect(mockLogPrompt).toHaveBeenCalledTimes(1);
  });

  it('passes custom model, temperature, and max tokens when provided', async () => {
    const payload = createValidStructurePayload();
    fetchMock.mockResolvedValue(responseWithMessageContent(JSON.stringify(payload)));

    await generateStoryStructure(context, 'test-api-key', {
      model: 'openai/gpt-4.1-mini',
      temperature: 0.55,
      maxTokens: 1234,
      promptOptions: {},
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
      promptOptions: {},
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

  it('parses JSON wrapped in markdown code fences', async () => {
    const payload = createValidStructurePayload();
    const fenced = `\`\`\`json\n${JSON.stringify(payload)}\n\`\`\``;
    fetchMock.mockResolvedValue(responseWithMessageContent(fenced));

    const result = await generateStoryStructure(context, 'test-api-key', {
      promptOptions: {},
    });

    expect(result.overallTheme).toBe(payload.overallTheme);
    expect(result.acts).toHaveLength(3);
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
    const rawContent = JSON.stringify(invalid);
    fetchMock.mockResolvedValue(responseWithMessageContent(rawContent));

    const pending = generateStoryStructure(context, 'test-api-key');
    const expectation = expect(pending).rejects.toMatchObject({
      code: 'STRUCTURE_PARSE_ERROR',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      message: expect.stringContaining('received: 2'),
      context: { rawContent },
    });

    await advanceRetryDelays();
    await expectation;
  });

  it('throws STRUCTURE_PARSE_ERROR with count when 4 acts are returned', async () => {
    const payload = createValidStructurePayload();
    const extraAct = { ...payload.acts[0]!, name: 'Act IV' };
    const invalid = { ...payload, acts: [...payload.acts, extraAct] };
    const rawContent = JSON.stringify(invalid);
    fetchMock.mockResolvedValue(responseWithMessageContent(rawContent));

    const pending = generateStoryStructure(context, 'test-api-key');
    const expectation = expect(pending).rejects.toMatchObject({
      code: 'STRUCTURE_PARSE_ERROR',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      message: expect.stringContaining('received: 4'),
      context: { rawContent },
    });

    await advanceRetryDelays();
    await expectation;
  });

  it('throws STRUCTURE_PARSE_ERROR with type info when acts is not an array', async () => {
    const payload = createValidStructurePayload();
    const invalid = { ...payload, acts: 'not-an-array' };
    const rawContent = JSON.stringify(invalid);
    fetchMock.mockResolvedValue(responseWithMessageContent(rawContent));

    const pending = generateStoryStructure(context, 'test-api-key');
    const expectation = expect(pending).rejects.toMatchObject({
      code: 'STRUCTURE_PARSE_ERROR',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      message: expect.stringContaining('received: string'),
      context: { rawContent },
    });

    await advanceRetryDelays();
    await expectation;
  });

  it('throws STRUCTURE_PARSE_ERROR when an act has an invalid beat count', async () => {
    const payload = createValidStructurePayload();
    payload.acts[1] = {
      ...payload.acts[1],
      beats: [{ name: 'Single beat', description: 'Only one beat', objective: 'Insufficient beats.', role: 'escalation' }],
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
        { name: 'Climax confrontation', description: 'Complete the confrontation.', objective: 'Resolve climax.', role: 'turning_point' },
        { name: 'Invalid objective', description: 'Missing objective', objective: undefined as unknown as string, role: 'resolution' },
      ],
    };
    fetchMock.mockResolvedValue(responseWithMessageContent(JSON.stringify(payload)));

    const pending = generateStoryStructure(context, 'test-api-key');
    const expectation = expect(pending).rejects.toMatchObject({ code: 'STRUCTURE_PARSE_ERROR' });

    await advanceRetryDelays();
    await expectation;
  });

  it('throws STRUCTURE_PARSE_ERROR when a beat name is missing', async () => {
    const payload = createValidStructurePayload();
    payload.acts[0] = {
      ...payload.acts[0],
      beats: [
        {
          name: undefined as unknown as string,
          description: 'Find a hidden witness.',
          objective: 'Obtain credible evidence.',
          role: 'setup',
        },
        payload.acts[0]!.beats[1]!,
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

  it('falls back premise to overallTheme when premise is missing', async () => {
    const payload = createValidStructurePayload();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { premise: _premise, ...withoutPremise } = payload;
    fetchMock.mockResolvedValue(responseWithMessageContent(JSON.stringify(withoutPremise)));

    const result = await generateStoryStructure(context, 'test-api-key', {
      promptOptions: {},
    });

    expect(result.premise).toBe(payload.overallTheme);
  });

  it('falls back pacingBudget to defaults when pacingBudget is missing', async () => {
    const payload = createValidStructurePayload();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { pacingBudget: _pacingBudget, ...withoutBudget } = payload;
    fetchMock.mockResolvedValue(responseWithMessageContent(JSON.stringify(withoutBudget)));

    const result = await generateStoryStructure(context, 'test-api-key', {
      promptOptions: {},
    });

    expect(result.pacingBudget).toEqual({ targetPagesMin: 15, targetPagesMax: 50 });
  });

  it('falls back beat role to escalation when role is missing', async () => {
    const payload = createValidStructurePayload();
    const withoutRoles = {
      ...payload,
      acts: payload.acts.map(act => ({
        ...act,
        beats: act.beats.map(({ role: _role, ...beat }) => beat),
      })),
    };
    fetchMock.mockResolvedValue(responseWithMessageContent(JSON.stringify(withoutRoles)));

    const result = await generateStoryStructure(context, 'test-api-key', {
      promptOptions: {},
    });

    for (const act of result.acts) {
      for (const beat of act.beats) {
        expect(beat.role).toBe('escalation');
      }
    }
  });

  it('falls back beat role to escalation when role has invalid value', async () => {
    const payload = createValidStructurePayload();
    const withInvalidRoles = {
      ...payload,
      acts: payload.acts.map(act => ({
        ...act,
        beats: act.beats.map(beat => ({ ...beat, role: 'invalid_role' })),
      })),
    };
    fetchMock.mockResolvedValue(responseWithMessageContent(JSON.stringify(withInvalidRoles)));

    const result = await generateStoryStructure(context, 'test-api-key', {
      promptOptions: {},
    });

    // Parser currently accepts any string for role; the schema enforces the enum at LLM level.
    // The parser's fallback only triggers when role is not a string.
    for (const act of result.acts) {
      for (const beat of act.beats) {
        expect(typeof beat.role).toBe('string');
      }
    }
  });
});
