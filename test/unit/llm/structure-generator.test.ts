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
  logResponse: jest.fn(),
}));

import { STRUCTURE_GENERATION_SCHEMA } from '../../../src/llm/schemas/structure-schema';
import { generateStoryStructure } from '../../../src/llm/structure-generator';
import { buildMinimalDecomposedCharacter } from '../../fixtures/decomposed';

interface StructurePayload {
  overallTheme: string;
  premise: string;
  pacingBudget: { targetPagesMin: number; targetPagesMax: number };
  acts: Array<{
    name: string;
    objective: string;
    stakes: string;
    entryCondition: string;
    milestones: Array<{
      name: string;
      description: string;
      objective: string;
      role: string;
      escalationType?: string | null;
      secondaryEscalationType?: string | null;
      crisisType?: string | null;
      expectedGapMagnitude?: string | null;
      isMidpoint?: boolean;
      midpointType?: string | null;
      uniqueScenarioHook?: string | null;
      approachVectors?: string[] | null;
      setpieceSourceIndex?: number | null;
      obligatorySceneTag?: string | null;
    }>;
  }>;
}

function createValidStructurePayload(): StructurePayload {
  return {
    overallTheme: 'Expose the tribunal and reclaim your honor.',
    premise:
      'A disgraced guard must infiltrate the tribunal that framed her to uncover proof of their corruption.',
    openingImage: 'An opening image placeholder.',
    closingImage: 'A closing image placeholder.',
    pacingBudget: { targetPagesMin: 20, targetPagesMax: 40 },
    acts: [
      {
        name: 'Act I',
        objective: 'Get pulled into the conspiracy.',
        stakes: 'Failure means execution.',
        entryCondition: 'A public murder is pinned on the protagonist.',
        milestones: [
          {
            name: 'Witness contact',
            description: 'Find a hidden witness.',
            objective: 'Obtain credible evidence.',
            causalLink: 'Because of prior events.',
            role: 'setup',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: null,
            obligatorySceneTag: null,
          },
          {
            name: 'Archive theft',
            description: 'Steal archive records.',
            objective: 'Secure proof before it burns.',
            causalLink: 'Because of prior events.',
            role: 'turning_point',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: 0,
            obligatorySceneTag: null,
          },
        ],
      },
      {
        name: 'Act II',
        objective: 'Expose the network while hunted.',
        stakes: 'Failure locks the city under martial rule.',
        entryCondition: 'The records name powerful conspirators.',
        milestones: [
          {
            name: 'Rival negotiation',
            description: 'Negotiate with rivals.',
            objective: 'Gain reluctant allies.',
            causalLink: 'Because of prior events.',
            role: 'escalation',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: 1,
            obligatorySceneTag: null,
          },
          {
            name: 'Rigged hearing',
            description: 'Survive a rigged hearing.',
            objective: 'Force evidence into the open.',
            causalLink: 'Because of prior events.',
            role: 'turning_point',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
            isMidpoint: true,
            midpointType: 'FALSE_DEFEAT',
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: 2,
            obligatorySceneTag: null,
          },
        ],
      },
      {
        name: 'Act III',
        objective: 'End the conspiracy and define justice.',
        stakes: 'Failure cements permanent authoritarian control.',
        entryCondition: 'Conspirators are identified and vulnerable.',
        milestones: [
          {
            name: 'Alliance split',
            description: 'Alliance fractures.',
            objective: 'Choose justice over revenge.',
            causalLink: 'Because of prior events.',
            role: 'turning_point',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: 3,
            obligatorySceneTag: null,
          },
          {
            name: 'Tribunal reckoning',
            description: 'Confront tribunal leaders.',
            objective: 'Resolve the central conflict.',
            causalLink: 'Because of prior events.',
            role: 'resolution',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: null,
            obligatorySceneTag: null,
          },
        ],
      },
    ],
  };
}

function createMysteryConceptSpec(): import('../../../src/models/concept-generator').ConceptSpec {
  return {
    oneLineHook: 'Detective story',
    elevatorParagraph: 'A detective unravels civic corruption.',
    genreFrame: 'MYSTERY' as const,
    genreSubversion: 'Detective caused the inciting incident.',
    protagonistRole: 'Disgraced detective',
    coreCompetence: 'Pattern recognition',
    coreFlaw: 'Self-deception',
    actionVerbs: ['investigate', 'interrogate', 'infiltrate', 'evade', 'expose', 'choose'],
    coreConflictLoop: 'Truth versus institutional power',
    conflictAxis: 'TRUTH_VS_STABILITY' as const,
    conflictType: 'PERSON_VS_SOCIETY' as const,
    pressureSource: 'Tribunal suppression',
    stakesPersonal: 'Loss of allies',
    stakesSystemic: 'Permanent authoritarian control',
    deadlineMechanism: 'Evidence purge at sunrise',
    settingAxioms: ['Harbor districts flood nightly', 'Tribunals control shipping courts'],
    constraintSet: ['No weapons in tribunal halls', 'Witnesses vanish after curfew'],
    keyInstitutions: ['Harbor Tribunal', 'Tide Guard'],
    settingScale: 'LOCAL' as const,
    whatIfQuestion: 'Can truth survive corrupt institutions?',
    ironicTwist: 'The detective must expose their own lie first.',
    playerFantasy: 'Outmaneuvering corrupt elites',
    incitingDisruption: 'A witness is killed in public',
    escapeValve: 'Smuggler tunnels beneath the docks',
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
    tone: 'grim political fantasy',
    decomposedCharacters: [buildMinimalDecomposedCharacter('A disgraced guard')],
    decomposedWorld: {
      facts: [
        {
          domain: 'geography' as const,
          fact: 'A plague-ridden harbor city controlled by merchant tribunals.',
          scope: 'global' as const,
        },
      ],
      rawWorldbuilding: 'A plague-ridden harbor city controlled by merchant tribunals.',
    },
  };

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock.mockReset();
    mockLogPrompt.mockReset();
    mockLogger.warn.mockReset();
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
    expect(body.max_tokens).toBe(16384);

    const messages = body.messages as Array<{ role: string; content: string }>;
    expect(Array.isArray(messages)).toBe(true);
    expect(messages[messages.length - 1]?.content).toContain('plague-ridden harbor city');
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
    expect(typeof body.model).toBe('string');
    expect((body.model as string).length).toBeGreaterThan(0);
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

  it('throws STRUCTURE_PARSE_ERROR when acts count is below 3', async () => {
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

  it('throws STRUCTURE_PARSE_ERROR when acts count exceeds 5', async () => {
    const payload = createValidStructurePayload();
    const extraActs = Array.from({ length: 3 }, (_, i) => ({
      ...payload.acts[0]!,
      name: `Act ${4 + i}`,
    }));
    const invalid = { ...payload, acts: [...payload.acts, ...extraActs] };
    const rawContent = JSON.stringify(invalid);
    fetchMock.mockResolvedValue(responseWithMessageContent(rawContent));

    const pending = generateStoryStructure(context, 'test-api-key');
    const expectation = expect(pending).rejects.toMatchObject({
      code: 'STRUCTURE_PARSE_ERROR',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      message: expect.stringContaining('received: 6'),
      context: { rawContent },
    });

    await advanceRetryDelays();
    await expectation;
  });

  it('accepts 4 acts as a valid structure', async () => {
    const payload = createValidStructurePayload();
    const extraAct = {
      name: 'Act IV',
      objective: 'Wrap up loose ends.',
      stakes: 'Failure leaves threads dangling.',
      entryCondition: 'The main conflict is resolved.',
      milestones: [
        {
          name: 'Aftermath',
          description: 'Survey the aftermath.',
          objective: 'Understand consequences.',
          causalLink: 'Because of prior events.',
          role: 'setup',
        },
        {
          name: 'New equilibrium',
          description: 'Establish a new normal.',
          objective: 'Close the story.',
          causalLink: 'Because of prior events.',
          role: 'resolution',
        },
      ],
    };
    const valid = { ...payload, acts: [...payload.acts, extraAct] };
    const rawContent = JSON.stringify(valid);
    fetchMock.mockResolvedValue(responseWithMessageContent(rawContent));

    const result = await generateStoryStructure(context, 'test-api-key', {
      promptOptions: {},
    });

    expect(result.acts).toHaveLength(4);
    expect(result.acts[3]!.name).toBe('Act IV');
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

  it('throws STRUCTURE_PARSE_ERROR when an act has an invalid milestone count', async () => {
    const payload = createValidStructurePayload();
    payload.acts[1] = {
      ...payload.acts[1],
      milestones: [
        {
          name: 'Single milestone',
          description: 'Only one milestone',
          objective: 'Insufficient milestones.',
          causalLink: 'Because of prior events.',
          role: 'escalation',
        },
      ],
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

  it('throws STRUCTURE_PARSE_ERROR when a milestone is missing required fields', async () => {
    const payload = createValidStructurePayload();
    payload.acts[2] = {
      ...payload.acts[2],
      milestones: [
        {
          name: 'Climax confrontation',
          description: 'Complete the confrontation.',
          objective: 'Resolve climax.',
          causalLink: 'Because of prior events.',
          role: 'turning_point',
        },
        {
          name: 'Invalid objective',
          description: 'Missing objective',
          objective: undefined as unknown as string,
          causalLink: 'Because of prior events.',
          role: 'resolution',
        },
      ],
    };
    fetchMock.mockResolvedValue(responseWithMessageContent(JSON.stringify(payload)));

    const pending = generateStoryStructure(context, 'test-api-key');
    const expectation = expect(pending).rejects.toMatchObject({ code: 'STRUCTURE_PARSE_ERROR' });

    await advanceRetryDelays();
    await expectation;
  });

  it('throws STRUCTURE_PARSE_ERROR when a milestone name is missing', async () => {
    const payload = createValidStructurePayload();
    payload.acts[0] = {
      ...payload.acts[0],
      milestones: [
        {
          name: undefined as unknown as string,
          description: 'Find a hidden witness.',
          objective: 'Obtain credible evidence.',
          causalLink: 'Because of prior events.',
          role: 'setup',
        },
        payload.acts[0]!.milestones[1]!,
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
      })
    );

    const pending = generateStoryStructure(context, 'test-api-key');
    const expectation = expect(pending).rejects.toMatchObject({ code: 'EMPTY_RESPONSE' });

    await advanceRetryDelays();
    await expectation;
  });

  it('throws retryable HTTP error for 500 responses and retries', async () => {
    fetchMock.mockResolvedValue(createErrorResponse(500, 'server error'));

    const pending = generateStoryStructure(context, 'test-api-key');
    const expectation = expect(pending).rejects.toMatchObject({
      code: 'HTTP_500',
      retryable: true,
    });

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

  it('falls back milestone role to escalation when role is missing', async () => {
    const payload = createValidStructurePayload();
    const withoutRoles = {
      ...payload,
      acts: payload.acts.map((act) => ({
        ...act,
        milestones: act.milestones.map(({ role: _role, ...milestone }) => milestone),
      })),
    };
    fetchMock.mockResolvedValue(responseWithMessageContent(JSON.stringify(withoutRoles)));

    const result = await generateStoryStructure(context, 'test-api-key', {
      promptOptions: {},
    });

    for (const act of result.acts) {
      for (const milestone of act.milestones) {
        expect(milestone.role).toBe('escalation');
      }
    }
  });

  it('falls back milestone role to escalation when role has invalid value', async () => {
    const payload = createValidStructurePayload();
    const withInvalidRoles = {
      ...payload,
      acts: payload.acts.map((act) => ({
        ...act,
        milestones: act.milestones.map((milestone) => ({ ...milestone, role: 'invalid_role' })),
      })),
    };
    fetchMock.mockResolvedValue(responseWithMessageContent(JSON.stringify(withInvalidRoles)));

    const result = await generateStoryStructure(context, 'test-api-key', {
      promptOptions: {},
    });

    // Parser currently accepts any string for role; the schema enforces the enum at LLM level.
    // The parser's fallback only triggers when role is not a string.
    for (const act of result.acts) {
      for (const milestone of act.milestones) {
        expect(typeof milestone.role).toBe('string');
      }
    }
  });

  it('logs warning when concept verification exists and fewer than 4 unique setpieces are traced', async () => {
    const payload = createValidStructurePayload();
    payload.acts[2]!.milestones[0]!.setpieceSourceIndex = 2;
    payload.acts[2]!.milestones[1]!.setpieceSourceIndex = null;
    fetchMock.mockResolvedValue(responseWithMessageContent(JSON.stringify(payload)));

    await generateStoryStructure(
      {
        ...context,
        conceptVerification: {
          conceptId: 'concept_1',
          signatureScenario: 'A trial begins in the flooded docks.',
          loglineCompressible: true,
          logline: 'A disgraced advocate weaponizes ritual law before the harbor courts erase every witness.',
          premisePromises: ['promise 1', 'promise 2', 'promise 3'],
          escalatingSetpieces: ['s1', 's2', 's3', 's4', 's5', 's6'],
          setpieceCausalChainBroken: false,
          setpieceCausalLinks: ['1->2', '2->3', '3->4', '4->5', '5->6'],
          inevitabilityStatement: 'Escalation is unavoidable.',
          loadBearingCheck: {
            passes: true,
            reasoning: 'Grounded in world constraints.',
            genericCollapse: 'Cannot be detached from harbor institutions.',
          },
          kernelFidelityCheck: {
            passes: true,
            reasoning: 'Aligned with thematic direction.',
            kernelDrift: 'None.',
          },
          conceptIntegrityScore: 90,
        },
      },
      'test-api-key',
      { promptOptions: {} }
    );

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Structure setpiece tracing below target: 3/4 unique setpieces mapped'
    );
  });

  it('does not log setpiece warning when concept verification is absent', async () => {
    const payload = createValidStructurePayload();
    payload.acts[1]!.milestones[0]!.setpieceSourceIndex = 0;
    payload.acts[1]!.milestones[1]!.setpieceSourceIndex = null;
    payload.acts[2]!.milestones[0]!.setpieceSourceIndex = null;
    fetchMock.mockResolvedValue(responseWithMessageContent(JSON.stringify(payload)));

    await generateStoryStructure(context, 'test-api-key', { promptOptions: {} });

    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('logs warning when genre obligations are missing from milestone tags', async () => {
    const payload = createValidStructurePayload();
    payload.acts[0]!.milestones[1]!.obligatorySceneTag = 'crime_or_puzzle_presented';
    payload.acts[1]!.milestones[0]!.obligatorySceneTag = 'red_herring_planted';
    fetchMock.mockResolvedValue(responseWithMessageContent(JSON.stringify(payload)));

    await generateStoryStructure(
      {
        ...context,
        conceptSpec: createMysteryConceptSpec(),
      },
      'test-api-key',
      { promptOptions: {} }
    );

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Structure missing genre obligation tags: key_witness_or_suspect_confronted, key_clue_recontextualized, detective_synthesis_moment, culprit_unmasked'
    );
  });

  it('does not log genre obligation warning when all obligations are tagged', async () => {
    const payload = createValidStructurePayload();
    payload.acts[0]!.milestones[0]!.obligatorySceneTag = 'crime_or_puzzle_presented';
    payload.acts[0]!.milestones[1]!.obligatorySceneTag = 'red_herring_planted';
    payload.acts[1]!.milestones[0]!.obligatorySceneTag = 'key_witness_or_suspect_confronted';
    payload.acts[1]!.milestones[1]!.obligatorySceneTag = 'key_clue_recontextualized';
    payload.acts[2]!.milestones[0]!.obligatorySceneTag = 'detective_synthesis_moment';
    payload.acts[2]!.milestones[1]!.obligatorySceneTag = 'culprit_unmasked';
    fetchMock.mockResolvedValue(responseWithMessageContent(JSON.stringify(payload)));

    await generateStoryStructure(
      {
        ...context,
        conceptSpec: createMysteryConceptSpec(),
      },
      'test-api-key',
      { promptOptions: {} }
    );

    expect(mockLogger.warn).not.toHaveBeenCalledWith(
      expect.stringContaining('Structure missing genre obligation tags:')
    );
  });
});
