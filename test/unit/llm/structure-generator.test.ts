const mockLogPrompt = jest.fn();
const mockLogResponse = jest.fn();
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
  get logResponse(): typeof mockLogResponse {
    return mockLogResponse;
  },
}));

import { MACRO_ARCHITECTURE_SCHEMA } from '../../../src/llm/schemas/macro-architecture-schema';
import { MILESTONE_GENERATION_SCHEMA } from '../../../src/llm/schemas/milestone-generation-schema';
import { generateStoryStructure } from '../../../src/llm/structure-generator';
import { buildMinimalDecomposedCharacter } from '../../fixtures/decomposed';

function createMacroPayload(): {
  overallTheme: string;
  premise: string;
  openingImage: string;
  closingImage: string;
  pacingBudget: { targetPagesMin: number; targetPagesMax: number };
  anchorMoments: {
    incitingIncident: { actIndex: number; description: string };
    midpoint: { actIndex: number; milestoneSlot: number; midpointType: string };
    climax: { actIndex: number; description: string };
    signatureScenarioPlacement: { actIndex: number; description: string };
  };
  initialNpcAgendas: Array<{
    npcName: string;
    currentGoal: string;
    leverage: string;
    fear: string;
    offScreenBehavior: string;
  }>;
  acts: Array<{
    name: string;
    objective: string;
    stakes: string;
    entryCondition: string;
    actQuestion: string;
    exitReversal: string;
    promiseTargets: string[];
    obligationTargets: string[];
  }>;
} {
  return {
    overallTheme: 'Expose the tribunal and reclaim public trust.',
    premise:
      'A disgraced guard must turn the city’s public hearing rituals against the judges who framed her.',
    openingImage: 'A rain-soaked hearing dais before dawn.',
    closingImage: 'The same dais occupied by witnesses instead of judges.',
    pacingBudget: { targetPagesMin: 20, targetPagesMax: 40 },
    anchorMoments: {
      incitingIncident: { actIndex: 0, description: 'The guard is framed in front of the harbor court.' },
      midpoint: { actIndex: 1, milestoneSlot: 1, midpointType: 'FALSE_DEFEAT' },
      climax: { actIndex: 2, description: 'The harbor court loses control of the verdict.' },
      signatureScenarioPlacement: { actIndex: 1, description: 'A ritual hearing becomes a public trap.' },
    },
    initialNpcAgendas: [
      {
        npcName: 'Judge Corven',
        currentGoal: 'Destroy the ledger before witnesses align.',
        leverage: 'Commands the harbor guard chain.',
        fear: 'Public confession under oath.',
        offScreenBehavior: 'Rotates loyal guards and burns paper trails.',
      },
    ],
    acts: [
      {
        name: 'Act I',
        objective: 'Find proof of the frame-up.',
        stakes: 'Failure means immediate execution.',
        entryCondition: 'The murder charge is announced in public.',
        actQuestion: 'Who arranged the frame-up?',
        exitReversal: 'The first proof implicates the guard’s mentor.',
        promiseTargets: ['Public ritual becomes a weapon'],
        obligationTargets: ['crime_or_puzzle_presented'],
      },
      {
        name: 'Act II',
        objective: 'Turn procedure into leverage.',
        stakes: 'Failure cements tribunal rule.',
        entryCondition: 'The mentor’s signature appears in a sealed ledger.',
        actQuestion: 'Can law be used against the tribunal?',
        exitReversal: 'The crowd turns, but legal protection disappears.',
        promiseTargets: ['Public ritual becomes a weapon'],
        obligationTargets: ['key_clue_recontextualized'],
      },
      {
        name: 'Act III',
        objective: 'Replace the tribunal’s version of justice.',
        stakes: 'Failure makes the purge permanent.',
        entryCondition: 'The tribunal splinters in public.',
        actQuestion: 'What justice survives public shame?',
        exitReversal: '',
        promiseTargets: ['Public ritual becomes a weapon'],
        obligationTargets: ['culprit_unmasked'],
      },
    ],
  };
}

function createMilestonePayload(): {
  acts: Array<{
    actIndex: number;
    milestones: Array<{
      name: string;
      description: string;
      objective: string;
      causalLink: string;
      exitCondition: string;
      role: string;
      escalationType: string | null;
      secondaryEscalationType: string | null;
      crisisType: string | null;
      expectedGapMagnitude: string | null;
      isMidpoint: boolean;
      midpointType: string | null;
      uniqueScenarioHook: string | null;
      approachVectors: string[] | null;
      setpieceSourceIndex: number | null;
      obligatorySceneTag: string | null;
    }>;
  }>;
} {
  return {
    acts: [
      {
        actIndex: 0,
        milestones: [
          {
            name: 'Witness at low tide',
            description: 'The guard corners a dock witness before curfew.',
            objective: 'Secure testimony before tribunal agents silence the witness.',
            causalLink: 'Because public accusation cuts off every lawful path to evidence.',
            exitCondition: 'The witness either talks or vanishes with the proof.',
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
            obligatorySceneTag: 'crime_or_puzzle_presented',
          },
          {
            name: 'Archive floodgate breach',
            description: 'The guard breaks into the archive during a tide alarm.',
            objective: 'Recover the sealed ledger before the floodgates lock.',
            causalLink: 'Because the witness reveals where the court moved the ledger.',
            exitCondition: 'The ledger is recovered or thrown into public view.',
            role: 'turning_point',
            escalationType: 'TEMPORAL_OR_ENVIRONMENTAL_PRESSURE',
            secondaryEscalationType: null,
            crisisType: 'BEST_BAD_CHOICE',
            expectedGapMagnitude: 'WIDE',
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook:
              'The hearing archive floods on a civic timer, turning legal evidence into a drowning race.',
            approachVectors: ['SWIFT_ACTION', 'STEALTH_SUBTERFUGE'],
            setpieceSourceIndex: 0,
            obligatorySceneTag: null,
          },
        ],
      },
      {
        actIndex: 1,
        milestones: [
          {
            name: 'Belltower intercept',
            description: 'The guard hijacks the court bell code used by tribunal runners.',
            objective: 'Map which judges are coordinating the purge.',
            causalLink: 'Because the ledger lists timings instead of names.',
            exitCondition: 'The runner network is decoded.',
            role: 'escalation',
            escalationType: 'REVELATION_SHIFT',
            secondaryEscalationType: null,
            crisisType: 'IRRECONCILABLE_GOODS',
            expectedGapMagnitude: 'MODERATE',
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook:
              'The city’s ceremonial bell code doubles as covert judicial command traffic.',
            approachVectors: ['ANALYTICAL_REASONING', 'CAREFUL_OBSERVATION'],
            setpieceSourceIndex: 1,
            obligatorySceneTag: 'key_clue_recontextualized',
          },
          {
            name: 'Ritual hearing ambush',
            description: 'The guard turns the hearing oath ritual into a public trap.',
            objective: 'Force a judge to confess on the record.',
            causalLink: 'Because the intercepted code identifies which judge must speak for the purge.',
            exitCondition: 'A confession is made in front of the crowd.',
            role: 'turning_point',
            escalationType: 'REVERSAL_OF_FORTUNE',
            secondaryEscalationType: 'MORAL_OR_ETHICAL_PRESSURE',
            crisisType: 'BEST_BAD_CHOICE',
            expectedGapMagnitude: 'CHASM',
            isMidpoint: true,
            midpointType: 'FALSE_DEFEAT',
            uniqueScenarioHook:
              'The tribunal’s oath sequence becomes the mechanism that strips a judge of plausible deniability.',
            approachVectors: ['PERSUASION_INFLUENCE', 'SELF_EXPRESSION'],
            setpieceSourceIndex: 2,
            obligatorySceneTag: null,
          },
        ],
      },
      {
        actIndex: 2,
        milestones: [
          {
            name: 'Clerk mutiny',
            description: 'Record clerks revolt over the purge order.',
            objective: 'Keep the archive staff alive long enough to testify.',
            causalLink: 'Because the confession makes the purge order explicit.',
            exitCondition: 'Enough clerks survive to contradict the tribunal publicly.',
            role: 'turning_point',
            escalationType: 'COMPLICATION_CASCADE',
            secondaryEscalationType: null,
            crisisType: 'BEST_BAD_CHOICE',
            expectedGapMagnitude: 'WIDE',
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook:
              'The bureaucracy itself mutinies when the clerks who forged the lie become its next victims.',
            approachVectors: ['ENDURANCE_RESILIENCE', 'EMPATHIC_CONNECTION'],
            setpieceSourceIndex: 3,
            obligatorySceneTag: null,
          },
          {
            name: 'Harbor verdict',
            description: 'The city hears a new verdict outside tribunal walls.',
            objective: 'Transfer judgment from the tribunal to the witnesses.',
            causalLink: 'Because the surviving clerks expose the legal machinery in public.',
            exitCondition: 'Public authority shifts away from the tribunal.',
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
            obligatorySceneTag: 'culprit_unmasked',
          },
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
    conceptSpec: {
      oneLineHook: 'A disgraced guard weaponizes public ritual.',
      elevatorParagraph: 'A hearing ritual becomes the engine of civic collapse.',
      genreFrame: 'MYSTERY' as const,
      genreSubversion: 'The investigator helped build the system.',
      protagonistRole: 'Disgraced guard',
      coreCompetence: 'Pattern recognition under pressure',
      coreFlaw: 'Compulsive self-justification',
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
      ironicTwist: 'The guard must expose her own lie first.',
      playerFantasy: 'Outmaneuvering corrupt elites',
      incitingDisruption: 'A witness is killed in public',
      escapeValve: 'Smuggler tunnels beneath the docks',
      protagonistLie: 'I can stay clean inside a dirty institution.',
      protagonistTruth: 'Truth requires public cost.',
      protagonistGhost: 'She once signed off on an innocent arrest.',
      wantNeedCollisionSketch: 'She wants exoneration but needs public accountability.',
    },
    conceptVerification: {
      conceptId: 'concept_1',
      signatureScenario: 'A ritual hearing becomes a public trap.',
      loglineCompressible: true,
      logline: 'A disgraced guard weaponizes public ritual against a tribunal cover-up.',
      premisePromises: ['Public ritual becomes a weapon'],
      escalatingSetpieces: ['setpiece 0', 'setpiece 1', 'setpiece 2', 'setpiece 3'],
      setpieceCausalChainBroken: false,
      setpieceCausalLinks: ['0->1', '1->2', '2->3'],
      inevitabilityStatement: 'The ritual machinery will eventually turn on itself.',
      loadBearingCheck: {
        passes: true,
        reasoning: 'Specific to the harbor tribunal.',
        genericCollapse: 'Would collapse without ritualized law.',
      },
      kernelFidelityCheck: {
        passes: true,
        reasoning: 'Aligned to public shame versus truth.',
        kernelDrift: 'None.',
      },
      conceptIntegrityScore: 92,
    },
  };

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock.mockReset();
    mockLogPrompt.mockReset();
    mockLogResponse.mockReset();
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

  it('runs macro architecture first, then milestone generation, and merges the result', async () => {
    fetchMock
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(createMacroPayload())))
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(createMilestonePayload())));

    const result = await generateStoryStructure(context, 'test-api-key', { promptOptions: {} });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.overallTheme).toBe(createMacroPayload().overallTheme);
    expect(result.acts[1]?.milestones[1]).toMatchObject({
      name: 'Ritual hearing ambush',
      isMidpoint: true,
      midpointType: 'FALSE_DEFEAT',
    });
    expect(result.acts[1]?.actQuestion).toBe('Can law be used against the tribunal?');
    expect(result.rawResponse).toContain('[macroArchitecture]');
    expect(result.rawResponse).toContain('[milestoneGeneration]');

    expect(getRequestBody(0).response_format).toEqual(MACRO_ARCHITECTURE_SCHEMA);
    expect(getRequestBody(1).response_format).toEqual(MILESTONE_GENERATION_SCHEMA);

    const milestoneMessages = getRequestBody(1).messages as Array<{ role: string; content: string }>;
    expect(milestoneMessages[1]?.content).toContain('LOCKED MACRO ARCHITECTURE');
    expect(milestoneMessages[1]?.content).toContain('"actQuestion": "Who arranged the frame-up?"');

    expect(mockLogPrompt).toHaveBeenNthCalledWith(1, mockLogger, 'macroArchitecture', expect.any(Array));
    expect(mockLogPrompt).toHaveBeenNthCalledWith(
      2,
      mockLogger,
      'milestoneGeneration',
      expect.any(Array)
    );
    expect(mockLogResponse).toHaveBeenCalledTimes(2);
  });

  it('passes model overrides and max token overrides to both stages', async () => {
    fetchMock
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(createMacroPayload())))
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(createMilestonePayload())));

    await generateStoryStructure(context, 'test-api-key', {
      model: 'openai/gpt-4.1-mini',
      temperature: 0.55,
      maxTokens: 1234,
      promptOptions: {},
    });

    expect(getRequestBody(0).model).toBe('openai/gpt-4.1-mini');
    expect(getRequestBody(1).model).toBe('openai/gpt-4.1-mini');
    expect(getRequestBody(0).temperature).toBe(0.55);
    expect(getRequestBody(1).temperature).toBe(0.55);
    expect(getRequestBody(0).max_tokens).toBe(1234);
    expect(getRequestBody(1).max_tokens).toBe(1234);
  });

  it('retries when the macro stage returns invalid JSON', async () => {
    fetchMock.mockResolvedValue(responseWithMessageContent('{"overallTheme":'));

    const pending = generateStoryStructure(context, 'test-api-key');
    const expectation = expect(pending).rejects.toMatchObject({ code: 'INVALID_JSON' });

    await advanceRetryDelays();
    await expectation;

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('parses fenced JSON during milestone generation', async () => {
    fetchMock
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(createMacroPayload())))
      .mockResolvedValueOnce(
        responseWithMessageContent(`\`\`\`json\n${JSON.stringify(createMilestonePayload())}\n\`\`\``)
      );

    const result = await generateStoryStructure(context, 'test-api-key', { promptOptions: {} });

    expect(result.acts).toHaveLength(3);
    expect(result.acts[2]?.milestones[1]?.name).toBe('Harbor verdict');
  });

  it('throws parse errors from milestone generation when the midpoint placement is wrong', async () => {
    const badMilestones = createMilestonePayload();
    badMilestones.acts[1]!.milestones[1]!.isMidpoint = false;
    badMilestones.acts[1]!.milestones[1]!.midpointType = null;
    badMilestones.acts[1]!.milestones[0]!.isMidpoint = true;
    badMilestones.acts[1]!.milestones[0]!.midpointType = 'FALSE_DEFEAT';

    fetchMock
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(createMacroPayload())))
      .mockResolvedValue(responseWithMessageContent(JSON.stringify(badMilestones)));

    const pending = generateStoryStructure(context, 'test-api-key');
    const expectation = expect(pending).rejects.toMatchObject({ code: 'STRUCTURE_PARSE_ERROR' });

    await advanceRetryDelays();
    await expectation;

    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('retries retryable HTTP failures', async () => {
    fetchMock.mockResolvedValue(createErrorResponse(500, 'server exploded'));

    const pending = generateStoryStructure(context, 'test-api-key');
    const expectation = expect(pending).rejects.toMatchObject({
      code: 'HTTP_500',
      retryable: true,
    });

    await advanceRetryDelays();
    await expectation;

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-retryable HTTP failures', async () => {
    fetchMock.mockResolvedValue(createErrorResponse(401, 'bad auth'));

    await expect(generateStoryStructure(context, 'test-api-key')).rejects.toMatchObject({
      code: 'HTTP_401',
      retryable: false,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('warns when fewer than four unique setpieces are traced', async () => {
    const lowCoverage = createMilestonePayload();
    lowCoverage.acts[1]!.milestones[0]!.setpieceSourceIndex = 0;
    lowCoverage.acts[1]!.milestones[1]!.setpieceSourceIndex = 1;
    lowCoverage.acts[2]!.milestones[0]!.setpieceSourceIndex = 1;

    fetchMock
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(createMacroPayload())))
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(lowCoverage)));

    await generateStoryStructure(context, 'test-api-key', { promptOptions: {} });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Structure setpiece tracing below target: 2/4 unique setpieces mapped'
    );
  });

  it('warns when genre obligations are missing from milestone tags', async () => {
    const missingObligations = createMilestonePayload();
    missingObligations.acts[0]!.milestones[0]!.obligatorySceneTag = null;
    missingObligations.acts[1]!.milestones[0]!.obligatorySceneTag = null;
    missingObligations.acts[2]!.milestones[1]!.obligatorySceneTag = null;

    fetchMock
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(createMacroPayload())))
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(missingObligations)));

    await generateStoryStructure(context, 'test-api-key', { promptOptions: {} });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Structure missing genre obligation tags: crime_or_puzzle_presented, red_herring_planted, key_witness_or_suspect_confronted, key_clue_recontextualized, detective_synthesis_moment, culprit_unmasked'
    );
  });
});
