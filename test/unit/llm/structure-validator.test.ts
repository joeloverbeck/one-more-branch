import { validateAndRepairStructure, validateStructureSemantics } from '../../../src/llm/structure-validator';
import type { StructureGenerationResult } from '../../../src/models/structure-generation';
import type { StructureContext } from '../../../src/llm/prompts/milestone-generation-prompt';

function createContext(): StructureContext {
  return {
    tone: 'grim political fantasy',
    decomposedCharacters: [],
    decomposedWorld: { facts: [], rawWorldbuilding: '' },
    conceptSpec: {
      oneLineHook: 'A disgraced guard weaponizes public ritual.',
      elevatorParagraph: 'A hearing ritual becomes the engine of civic collapse.',
      genreFrame: 'MYSTERY' as const,
      genreSubversion: 'The investigator built the system.',
      protagonistRole: 'Disgraced guard',
      coreCompetence: 'Pattern recognition under pressure',
      coreFlaw: 'Compulsive self-justification',
      actionVerbs: ['investigate'],
      coreConflictLoop: 'Truth versus power',
      conflictAxis: 'TRUTH_VS_STABILITY' as const,
      conflictType: 'PERSON_VS_SOCIETY' as const,
      pressureSource: 'Tribunal suppression',
      stakesPersonal: 'Loss of allies',
      stakesSystemic: 'Permanent authoritarian control',
      deadlineMechanism: 'Evidence purge at sunrise',
      settingAxioms: ['Courts rule the harbor'],
      constraintSet: ['No weapons in tribunal halls'],
      keyInstitutions: ['Harbor Tribunal'],
      settingScale: 'LOCAL' as const,
      whatIfQuestion: 'Can truth survive corrupt institutions?',
      ironicTwist: 'Exposure requires public shame.',
      playerFantasy: 'Outmaneuvering corrupt elites',
      incitingDisruption: 'A witness is killed in public',
      escapeValve: 'Smuggler tunnels',
      protagonistLie: 'I can stay clean inside a dirty institution.',
      protagonistTruth: 'Truth requires public cost.',
      protagonistGhost: 'She signed off on an innocent arrest.',
      wantNeedCollisionSketch: 'She wants exoneration but needs accountability.',
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
      inevitabilityStatement: 'The ritual machinery will turn on itself.',
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
}

function createValidResult(): StructureGenerationResult {
  return {
    overallTheme: 'Expose the tribunal and reclaim public trust.',
    premise: 'A disgraced guard must turn ritual law against the tribunal.',
    openingImage: 'A rain-soaked hearing dais before dawn.',
    closingImage: 'Witnesses control the dais.',
    pacingBudget: { targetPagesMin: 20, targetPagesMax: 40 },
    anchorMoments: {
      incitingIncident: { actIndex: 0, description: 'Frame-up in public.' },
      midpoint: { actIndex: 1, milestoneSlot: 1, midpointType: 'FALSE_DEFEAT' as const },
      climax: { actIndex: 2, description: 'The tribunal loses control.' },
      signatureScenarioPlacement: { actIndex: 1, description: 'The hearing becomes a trap.' },
    },
    initialNpcAgendas: [],
    acts: [
      {
        name: 'Act I',
        objective: 'Find proof of the frame-up.',
        stakes: 'Failure means execution.',
        entryCondition: 'The charge is announced in public.',
        actQuestion: 'Who arranged the frame-up?',
        exitReversal: 'The first proof implicates the mentor.',
        promiseTargets: ['Public ritual becomes a weapon'],
        obligationTargets: ['crime_or_puzzle_presented', 'red_herring_planted'],
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
            uniqueScenarioHook: 'The archive floods on a civic timer.',
            approachVectors: ['SWIFT_ACTION', 'STEALTH_SUBTERFUGE'],
            setpieceSourceIndex: 0,
            obligatorySceneTag: 'red_herring_planted',
          },
        ],
      },
      {
        name: 'Act II',
        objective: 'Turn procedure into leverage.',
        stakes: 'Failure cements tribunal rule.',
        entryCondition: 'The mentor signature appears in the ledger.',
        actQuestion: 'Can law be used against the tribunal?',
        exitReversal: 'The crowd turns, but protection disappears.',
        promiseTargets: ['Public ritual becomes a weapon'],
        obligationTargets: ['key_witness_or_suspect_confronted', 'key_clue_recontextualized'],
        milestones: [
          {
            name: 'Belltower intercept',
            description: 'The guard hijacks the court bell code.',
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
            uniqueScenarioHook: 'The ceremonial bell code doubles as covert traffic.',
            approachVectors: ['ANALYTICAL_REASONING', 'CAREFUL_OBSERVATION'],
            setpieceSourceIndex: 1,
            obligatorySceneTag: 'key_clue_recontextualized',
          },
          {
            name: 'Ritual hearing ambush',
            description: 'The guard turns the oath ritual into a public trap.',
            objective: 'Force a judge to confess on the record.',
            causalLink: 'Because the intercepted code identifies the right judge.',
            exitCondition: 'A confession is made in front of the crowd.',
            role: 'turning_point',
            escalationType: 'REVERSAL_OF_FORTUNE',
            secondaryEscalationType: 'MORAL_OR_ETHICAL_PRESSURE',
            crisisType: 'BEST_BAD_CHOICE',
            expectedGapMagnitude: 'CHASM',
            isMidpoint: true,
            midpointType: 'FALSE_DEFEAT',
            uniqueScenarioHook: 'The oath sequence strips a judge of plausible deniability.',
            approachVectors: ['PERSUASION_INFLUENCE', 'SELF_EXPRESSION'],
            setpieceSourceIndex: 2,
            obligatorySceneTag: 'key_witness_or_suspect_confronted',
          },
        ],
      },
      {
        name: 'Act III',
        objective: 'Replace the tribunal’s version of justice.',
        stakes: 'Failure makes the purge permanent.',
        entryCondition: 'The tribunal splinters in public.',
        actQuestion: 'What justice survives public shame?',
        exitReversal: '',
        promiseTargets: ['Public ritual becomes a weapon'],
        obligationTargets: ['detective_synthesis_moment', 'culprit_unmasked'],
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
            uniqueScenarioHook: 'The bureaucracy mutinies against its own purge order.',
            approachVectors: ['ENDURANCE_RESILIENCE', 'EMPATHIC_CONNECTION'],
            setpieceSourceIndex: 3,
            obligatorySceneTag: 'detective_synthesis_moment',
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
    rawResponse: '[macroArchitecture]\n...\n[milestoneGeneration]\n...',
  };
}

function findCheck(
  result: ReturnType<typeof validateStructureSemantics>,
  check: string
): ReturnType<typeof validateStructureSemantics>[number] {
  const match = result.find((entry) => entry.check === check);
  if (!match) {
    throw new Error(`Missing check ${check}`);
  }
  return match;
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

describe('structure-validator', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('passes all semantic checks for a valid merged structure', () => {
    const diagnostics = validateStructureSemantics(createValidResult(), createContext());

    expect(diagnostics).toHaveLength(10);
    expect(diagnostics.every((entry) => entry.passed)).toBe(true);
  });

  it('treats allocated obligation targets as the active coverage contract', () => {
    const context = createContext();
    const partiallyAllocated = createValidResult();

    partiallyAllocated.acts[0]!.obligationTargets = ['crime_or_puzzle_presented'];
    partiallyAllocated.acts[0]!.milestones[1]!.obligatorySceneTag = null;
    partiallyAllocated.acts[1]!.obligationTargets = ['key_clue_recontextualized'];
    partiallyAllocated.acts[1]!.milestones[1]!.obligatorySceneTag = null;
    partiallyAllocated.acts[2]!.obligationTargets = ['culprit_unmasked'];
    partiallyAllocated.acts[2]!.milestones[0]!.obligatorySceneTag = null;

    const diagnostics = validateStructureSemantics(partiallyAllocated, context);

    expect(findCheck(diagnostics, 'genre-obligation-coverage').passed).toBe(true);
    expect(findCheck(diagnostics, 'obligation-target-coverage').passed).toBe(true);
  });

  it('reports every semantic check when its invariant is broken', () => {
    const context = createContext();
    const midpointBroken = createValidResult();
    midpointBroken.acts[1]!.milestones[1]!.isMidpoint = false;
    midpointBroken.acts[1]!.milestones[1]!.midpointType = null;
    expect(findCheck(validateStructureSemantics(midpointBroken, context), 'midpoint-uniqueness').passed).toBe(false);

    const milestoneCountBroken = createValidResult();
    milestoneCountBroken.acts[0]!.milestones = [milestoneCountBroken.acts[0]!.milestones[0]!];
    expect(findCheck(validateStructureSemantics(milestoneCountBroken, context), 'milestone-count').passed).toBe(false);

    const escalationBroken = createValidResult();
    escalationBroken.acts[1]!.milestones[0]!.escalationType = null;
    expect(findCheck(validateStructureSemantics(escalationBroken, context), 'escalation-type-required').passed).toBe(false);

    const setpieceBroken = createValidResult();
    setpieceBroken.acts[1]!.milestones[0]!.setpieceSourceIndex = 0;
    setpieceBroken.acts[1]!.milestones[1]!.setpieceSourceIndex = 1;
    setpieceBroken.acts[2]!.milestones[0]!.setpieceSourceIndex = 1;
    expect(findCheck(validateStructureSemantics(setpieceBroken, context), 'setpiece-coverage').passed).toBe(false);

    const tagBroken = createValidResult();
    tagBroken.acts[2]!.milestones[1]!.obligatorySceneTag = null;
    expect(findCheck(validateStructureSemantics(tagBroken, context), 'genre-obligation-coverage').passed).toBe(false);

    const exitConditionBroken = createValidResult();
    exitConditionBroken.acts[0]!.milestones[0]!.exitCondition = '';
    expect(findCheck(validateStructureSemantics(exitConditionBroken, context), 'exit-condition-non-empty').passed).toBe(false);

    const questionBroken = createValidResult();
    questionBroken.acts[1]!.actQuestion = questionBroken.acts[0]!.actQuestion;
    expect(findCheck(validateStructureSemantics(questionBroken, context), 'act-question-distinct').passed).toBe(false);

    const reversalBroken = createValidResult();
    reversalBroken.acts[1]!.exitReversal = '';
    expect(findCheck(validateStructureSemantics(reversalBroken, context), 'exit-reversal-present').passed).toBe(false);

    const promiseBroken = createValidResult();
    promiseBroken.acts.forEach((act) => {
      act.promiseTargets = [];
    });
    expect(findCheck(validateStructureSemantics(promiseBroken, context), 'promise-target-coverage').passed).toBe(false);

    const obligationBroken = createValidResult();
    obligationBroken.acts.forEach((act) => {
      act.obligationTargets = [];
    });
    expect(findCheck(validateStructureSemantics(obligationBroken, context), 'obligation-target-coverage').passed).toBe(false);
  });

  it('repairs failing acts once and returns the repaired structure', async () => {
    const broken = createValidResult();
    broken.acts[1]!.actQuestion = broken.acts[0]!.actQuestion;

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn(),
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  repairedActs: [
                    {
                      actIndex: 1,
                      act: {
                        ...broken.acts[1],
                        actQuestion: 'Can procedure become a weapon?',
                      },
                    },
                  ],
                }),
              },
            },
          ],
        })
      ),
    } as unknown as Response);

    const validated = await validateAndRepairStructure(
      broken,
      createContext(),
      'test-api-key',
      { promptOptions: {} }
    );

    expect(validated.repaired).toBe(true);
    expect(validated.result.acts[1]?.actQuestion).toBe('Can procedure become a weapon?');
    expect(validated.diagnostics.every((entry) => entry.passed)).toBe(true);
    expect(validated.result.rawResponse).toContain('[structureRepair]');
  });

  it('retries retryable structure repair failures through the shared runner', async () => {
    jest.useFakeTimers();
    const broken = createValidResult();
    broken.acts[1]!.actQuestion = broken.acts[0]!.actQuestion;

    global.fetch = jest.fn().mockResolvedValue(createErrorResponse(429, 'rate limited')) as typeof fetch;

    const pending = validateAndRepairStructure(broken, createContext(), 'test-api-key', {
      promptOptions: {},
    });
    const expectation = expect(pending).rejects.toMatchObject({
      code: 'HTTP_429',
      retryable: true,
    });

    await advanceRetryDelays();
    await expectation;

    expect(global.fetch).toHaveBeenCalledTimes(3);
    jest.useRealTimers();
  });
});
