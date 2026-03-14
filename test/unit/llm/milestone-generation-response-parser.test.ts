import { LLMError } from '../../../src/llm/llm-client-types';
import { parseMilestoneGenerationResponseObject } from '../../../src/llm/milestone-generation-response-parser';
import type { MacroArchitectureResult } from '../../../src/models/structure-generation';

function createMacroArchitecture(): MacroArchitectureResult {
  return {
    overallTheme: 'Truth survives only when someone risks public shame.',
    premise: 'A disgraced inspector must weaponize civic ritual against a tribunal cover-up.',
    openingImage: 'A wet tribunal dais before dawn.',
    closingImage: 'The same dais occupied by witnesses instead of judges.',
    pacingBudget: { targetPagesMin: 18, targetPagesMax: 36 },
    anchorMoments: {
      incitingIncident: { actIndex: 0, description: 'An inspector is framed in public.' },
      midpoint: { actIndex: 1, milestoneSlot: 1, midpointType: 'FALSE_VICTORY' },
      climax: { actIndex: 2, description: 'The harbor court collapses under testimony.' },
      signatureScenarioPlacement: null,
    },
    initialNpcAgendas: [],
    acts: [
      {
        name: 'Act I',
        objective: 'Find the first leak.',
        stakes: 'Failure means imprisonment.',
        entryCondition: 'The tribunal pins the murder on the inspector.',
        actQuestion: 'Who set the inspector up?',
        exitReversal: 'The evidence points to the inspector’s mentor.',
        promiseTargets: ['Public ritual becomes a weapon'],
        obligationTargets: ['crime_or_puzzle_presented'],
      },
      {
        name: 'Act II',
        objective: 'Turn institutional procedure into leverage.',
        stakes: 'Failure locks the city under tribunal rule.',
        entryCondition: 'The mentor’s name appears in sealed ledgers.',
        actQuestion: 'Can procedure be used against power?',
        exitReversal: 'The inspector wins the crowd but loses legal protection.',
        promiseTargets: ['Public ritual becomes a weapon'],
        obligationTargets: ['key_clue_recontextualized'],
      },
      {
        name: 'Act III',
        objective: 'Define what justice replaces the tribunal.',
        stakes: 'Failure makes the purge permanent.',
        entryCondition: 'The tribunal splinters in public.',
        actQuestion: 'What does justice cost when everyone is compromised?',
        exitReversal: '',
        promiseTargets: ['Public ritual becomes a weapon'],
        obligationTargets: ['culprit_unmasked'],
      },
    ],
    rawResponse: '{}',
  };
}

function createValidMilestoneResponse(): Record<string, unknown> {
  return {
    acts: [
      {
        actIndex: 0,
        milestones: [
          {
            name: 'Dockside contact',
            description: 'The inspector corners a smuggler witness.',
            objective: 'Secure testimony before tribunal agents arrive.',
            causalLink: 'Because the framing leaves the inspector with only criminal channels.',
            exitCondition: 'The witness either talks or escapes with the proof.',
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
            name: 'Floodgate breach',
            description: 'The inspector breaks into the archive during a tide alarm.',
            objective: 'Recover the sealed ledger before the floodgates lock.',
            causalLink: 'Because the witness reveals the ledger’s temporary transfer route.',
            exitCondition: 'The ledger is recovered or washed into public view.',
            role: 'turning_point',
            escalationType: 'TEMPORAL_OR_ENVIRONMENTAL_PRESSURE',
            secondaryEscalationType: null,
            crisisType: 'BEST_BAD_CHOICE',
            expectedGapMagnitude: 'WIDE',
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook: 'The archive flood cycle turns legal procedure into a drowning clock.',
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
            name: 'Belltower interception',
            description: 'The inspector hijacks the bell code used by tribunal runners.',
            objective: 'Map which judges are coordinating the purge.',
            causalLink: 'Because the recovered ledger points to signal timings instead of names.',
            exitCondition: 'The inspector decodes the runner network.',
            role: 'escalation',
            escalationType: 'REVELATION_SHIFT',
            secondaryEscalationType: null,
            crisisType: 'IRRECONCILABLE_GOODS',
            expectedGapMagnitude: 'MODERATE',
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook: 'The city’s ceremonial bell code doubles as covert judicial command traffic.',
            approachVectors: ['ANALYTICAL_REASONING', 'CAREFUL_OBSERVATION'],
            setpieceSourceIndex: 1,
            obligatorySceneTag: 'key_clue_recontextualized',
          },
          {
            name: 'Ritual hearing ambush',
            description: 'The inspector weaponizes the public oath ritual against the tribunal.',
            objective: 'Force one judge to confess on the record.',
            causalLink: 'Because the belltower evidence reveals who must speak for the cover-up.',
            exitCondition: 'A confession is made in front of the assembled crowd.',
            role: 'turning_point',
            escalationType: 'REVERSAL_OF_FORTUNE',
            secondaryEscalationType: 'MORAL_OR_ETHICAL_PRESSURE',
            crisisType: 'BEST_BAD_CHOICE',
            expectedGapMagnitude: 'CHASM',
            isMidpoint: true,
            midpointType: 'FALSE_VICTORY',
            uniqueScenarioHook: 'The tribunal’s own oath sequence becomes the trap that strips a judge of plausible deniability.',
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
            name: 'Mutiny of clerks',
            description: 'The tribunal’s record clerks revolt over the purge order.',
            objective: 'Keep the archive staff alive long enough to testify.',
            causalLink: 'Because the confession turns the purge into an open command.',
            exitCondition: 'Enough clerks survive to publicly contradict the tribunal.',
            role: 'turning_point',
            escalationType: 'COMPLICATION_CASCADE',
            secondaryEscalationType: null,
            crisisType: 'BEST_BAD_CHOICE',
            expectedGapMagnitude: 'WIDE',
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook: 'The bureaucracy itself mutinies when the purge order reaches the clerks who forged the lie.',
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

describe('parseMilestoneGenerationResponseObject', () => {
  it('parses valid milestone output aligned to the macro architecture', () => {
    const result = parseMilestoneGenerationResponseObject(
      createValidMilestoneResponse(),
      createMacroArchitecture(),
      { verifiedSetpieceCount: 4 }
    );

    expect(result.acts).toHaveLength(3);
    expect(result.acts[1]?.milestones[1]).toMatchObject({
      isMidpoint: true,
      midpointType: 'FALSE_VICTORY',
      setpieceSourceIndex: 2,
    });
    expect(result.acts[2]?.milestones[1]?.role).toBe('resolution');
  });

  it('throws when the midpoint location does not match the macro anchor', () => {
    const response = createValidMilestoneResponse();
    const midpoint = (response.acts as Array<{ milestones: Array<Record<string, unknown>> }>)[1]!.milestones[1]!;
    midpoint.isMidpoint = false;
    midpoint.midpointType = null;
    (response.acts as Array<{ milestones: Array<Record<string, unknown>> }>)[1]!.milestones[0]!.isMidpoint = true;
    (response.acts as Array<{ milestones: Array<Record<string, unknown>> }>)[1]!.milestones[0]!.midpointType =
      'FALSE_VICTORY';

    expect(() =>
      parseMilestoneGenerationResponseObject(response, createMacroArchitecture(), {
        verifiedSetpieceCount: 4,
      })
    ).toThrow('Midpoint must appear at acts[1].milestones[1]');
  });

  it('throws when an escalation milestone omits escalationType', () => {
    const response = createValidMilestoneResponse();
    (response.acts as Array<{ milestones: Array<Record<string, unknown>> }>)[1]!.milestones[0]!.escalationType =
      null;

    expect(() =>
      parseMilestoneGenerationResponseObject(response, createMacroArchitecture(), {
        verifiedSetpieceCount: 4,
      })
    ).toThrow('acts[1].milestones[0] must include escalationType');
  });

  it('throws when a setup milestone includes escalation-only fields', () => {
    const response = createValidMilestoneResponse();
    (response.acts as Array<{ milestones: Array<Record<string, unknown>> }>)[0]!.milestones[0]!.uniqueScenarioHook =
      'This should not be here.';

    expect(() =>
      parseMilestoneGenerationResponseObject(response, createMacroArchitecture(), {
        verifiedSetpieceCount: 4,
      })
    ).toThrow('acts[0].milestones[0] must set uniqueScenarioHook to null');
  });

  it('throws when setpiece indices are supplied without a verified setpiece bank', () => {
    expect(() =>
      parseMilestoneGenerationResponseObject(createValidMilestoneResponse(), createMacroArchitecture(), {
        verifiedSetpieceCount: 0,
      })
    ).toThrow('cannot be set when no verified setpiece bank exists');
  });

  it('throws on malformed top-level shapes', () => {
    expect(() =>
      parseMilestoneGenerationResponseObject({ acts: 'bad' }, createMacroArchitecture(), {
        verifiedSetpieceCount: 4,
      })
    ).toThrow(LLMError);
  });
});
