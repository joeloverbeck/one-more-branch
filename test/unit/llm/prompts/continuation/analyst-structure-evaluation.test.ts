import type {
  AccumulatedStructureState,
  StoryStructure,
} from '../../../../../src/models/story-arc';
import type { ActiveState } from '../../../../../src/models/state/active-state';
import { buildAnalystStructureEvaluation } from '../../../../../src/llm/prompts/continuation/story-structure-section';

describe('buildAnalystStructureEvaluation', () => {
  const testStructure: StoryStructure = {
    overallTheme: 'Stop the city purge before dawn.',
    premise:
      'A fugitive must broadcast evidence of a government purge before dawn erases all proof.',
    pacingBudget: { targetPagesMin: 20, targetPagesMax: 40 },
    generatedAt: new Date('2026-01-01T00:00:00.000Z'),
    acts: [
      {
        id: '1',
        name: 'The Crackdown',
        objective: 'Escape the first sweep',
        stakes: 'Capture means execution.',
        entryCondition: 'Emergency law declared.',
        actQuestion: 'Can the fugitive stay ahead of the purge long enough to matter?',
        exitReversal: 'The evidence survives, but exposing it reveals the scale of the conspiracy.',
        promiseTargets: ['The purge can be exposed'],
        obligationTargets: [],
        milestones: [
          {
            id: '1.1',
            description: 'Reach safehouse',
            objective: 'Get inside',
            exitCondition: 'The fugitive reaches sealed cover inside the safehouse.',
            role: 'setup',
          },
          {
            id: '1.2',
            description: 'Secure evidence',
            objective: 'Protect evidence',
            exitCondition: 'The evidence is secured somewhere the purge cannot immediately destroy it.',
            role: 'escalation',
          },
          {
            id: '1.3',
            description: 'Choose ally',
            objective: 'Commit to ally',
            exitCondition: 'The fugitive commits to a partner whose resources change the escape route.',
            role: 'turning_point',
          },
        ],
      },
      {
        id: '2',
        name: 'The Hunt',
        objective: 'Cross hostile territory',
        stakes: 'If lost, purge is permanent.',
        entryCondition: 'Leave the capital.',
        actQuestion: 'What price buys enough leverage to keep moving?',
        exitReversal: 'Escape from the capital turns into a wider war.',
        promiseTargets: ['The purge can be exposed'],
        obligationTargets: [],
        milestones: [
          {
            id: '2.1',
            description: 'Break through checkpoints',
            objective: 'Find route north',
            exitCondition: 'A viable route north is secured beyond the checkpoint net.',
            role: 'escalation',
          },
          {
            id: '2.2',
            description: 'Defend witnesses',
            objective: 'Keep witnesses alive',
            exitCondition: 'The witnesses survive long enough to testify.',
            role: 'turning_point',
          },
        ],
      },
      {
        id: '3',
        name: 'The Broadcast',
        objective: 'Expose the planners',
        stakes: 'Silence guarantees totalitarian rule.',
        entryCondition: 'Access relay tower.',
        actQuestion: 'Can the truth land before the regime closes every channel?',
        exitReversal: '',
        promiseTargets: ['The purge can be exposed'],
        obligationTargets: [],
        milestones: [
          {
            id: '3.1',
            description: 'Reach relay core',
            objective: 'Seize control room',
            exitCondition: 'Control of the relay core shifts to the fugitive and allies.',
            role: 'escalation',
          },
          {
            id: '3.2',
            description: 'Deliver proof',
            objective: 'Transmit evidence',
            exitCondition: 'The evidence is broadcast beyond the regime’s ability to suppress it.',
            role: 'resolution',
          },
        ],
      },
    ],
    anchorMoments: {
      incitingIncident: { actIndex: 0, description: 'The purge begins.' },
      midpoint: { actIndex: 1, milestoneSlot: 0, midpointType: 'FALSE_VICTORY' },
      climax: { actIndex: 2, description: 'The broadcast goes live.' },
      signatureScenarioPlacement: null,
    },
  };

  const emptyActiveState: ActiveState = {
    currentLocation: '',
    activeThreats: [],
    activeConstraints: [],
    openThreads: [],
  };

  it('includes overall theme', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 0,
      milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
      pagesInCurrentMilestone: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).toContain('Overall Theme: Stop the city purge before dawn.');
  });

  it('includes current act name, objective, and stakes', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 0,
      milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
      pagesInCurrentMilestone: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).toContain('CURRENT ACT: The Crackdown');
    expect(result).toContain('Objective: Escape the first sweep');
    expect(result).toContain('Stakes: Capture means execution.');
    expect(result).toContain(
      'Act Question: Can the fugitive stay ahead of the purge long enough to matter?'
    );
    expect(result).toContain(
      'Expected Exit Reversal: The evidence survives, but exposing it reveals the scale of the conspiracy.'
    );
  });

  it('shows milestone status lines with concluded, active, and pending', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 1,
      milestoneProgressions: [
        { milestoneId: '1.1', status: 'concluded', resolution: 'Reached safehouse' },
        { milestoneId: '1.2', status: 'active' },
        { milestoneId: '1.3', status: 'pending' },
      ],
      pagesInCurrentMilestone: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).toContain('[x] CONCLUDED (setup): Reach safehouse');
    expect(result).toContain('Resolution: Reached safehouse');
    expect(result).toContain('[>] ACTIVE (escalation): Secure evidence');
    expect(result).toContain('Objective: Protect evidence');
    expect(result).toContain(
      'Exit condition: The evidence is secured somewhere the purge cannot immediately destroy it.'
    );
    expect(result).toContain('[ ] PENDING (turning_point): Choose ally');
  });

  it('includes remaining acts overview', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 0,
      milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
      pagesInCurrentMilestone: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).toContain('REMAINING ACTS:');
    expect(result).toContain('Act 2: The Hunt - Cross hostile territory');
    expect(result).toContain('Act 3: The Broadcast - Expose the planners');
  });

  it('includes BEAT EVALUATION section', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 0,
      milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
      pagesInCurrentMilestone: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).toContain('=== BEAT EVALUATION ===');
  });

  it('includes SCENE SIGNAL CLASSIFICATION with required enums', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 0,
      milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
      pagesInCurrentMilestone: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).toContain('=== SCENE SIGNAL CLASSIFICATION ===');
    expect(result).toContain(
      'sceneMomentum: STASIS | INCREMENTAL_PROGRESS | MAJOR_PROGRESS | REVERSAL_OR_SETBACK | SCOPE_SHIFT'
    );
    expect(result).toContain('objectiveEvidenceStrength: NONE | WEAK_IMPLICIT | CLEAR_EXPLICIT');
    expect(result).toContain(
      'commitmentStrength: NONE | TENTATIVE | EXPLICIT_REVERSIBLE | EXPLICIT_IRREVERSIBLE'
    );
    expect(result).toContain(
      'structuralPositionSignal: WITHIN_ACTIVE_BEAT | BRIDGING_TO_NEXT_BEAT | CLEARLY_IN_NEXT_BEAT'
    );
    expect(result).toContain('entryConditionReadiness: NOT_READY | PARTIAL | READY');
  });

  it('includes COMPLETION GATE with turning_point-specific clause and false-positive guards', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 0,
      milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
      pagesInCurrentMilestone: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).toContain('=== COMPLETION GATE ===');
    expect(result).toContain('Base gate for all milestone roles (must satisfy at least one):');
    expect(result).toContain(
      'objectiveEvidenceStrength is CLEAR_EXPLICIT for the active milestone exit condition'
    );
    expect(result).toContain(
      'structuralPositionSignal is CLEARLY_IN_NEXT_BEAT AND there is explicit evidence that the active milestone exit condition is no longer the primary unresolved objective'
    );
    expect(result).toContain('Additional gate for turning_point:');
    expect(result).toContain(
      'commitmentStrength must be EXPLICIT_REVERSIBLE or EXPLICIT_IRREVERSIBLE'
    );
    expect(result).toContain(
      'If commitmentStrength is EXPLICIT_REVERSIBLE, require an explicit forward consequence that materially changes available next actions'
    );
    expect(result).toContain(
      'Intensity/action escalation alone is insufficient without CLEAR_EXPLICIT evidence for the active milestone exit condition'
    );
    expect(result).toContain(
      'SCOPE_SHIFT alone cannot conclude a milestone without satisfying the active milestone exit condition or explicit structural supersession evidence'
    );
  });

  it('falls back to milestone objective when exitCondition is empty', () => {
    const structureWithoutExitCondition: StoryStructure = {
      ...testStructure,
      acts: testStructure.acts.map((act, actIndex) =>
        actIndex !== 0
          ? act
          : {
              ...act,
              milestones: act.milestones.map((milestone, milestoneIndex) =>
                milestoneIndex !== 0
                  ? milestone
                  : {
                      ...milestone,
                      exitCondition: '',
                    }
              ),
            }
      ),
    };
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 0,
      milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
      pagesInCurrentMilestone: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(
      structureWithoutExitCondition,
      state,
      emptyActiveState
    );

    expect(result).toContain(
      'objectiveEvidenceStrength is CLEAR_EXPLICIT for the active milestone objective'
    );
    expect(result).not.toContain('Active Milestone Exit Condition:');
  });

  it('includes DEVIATION section', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 0,
      milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
      pagesInCurrentMilestone: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).toContain('BEAT DEVIATION EVALUATION');
  });

  it('includes REMAINING BEATS TO EVALUATE FOR DEVIATION', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 0,
      milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
      pagesInCurrentMilestone: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).toContain('REMAINING BEATS TO EVALUATE FOR DEVIATION');
  });

  it('includes active state summary from buildActiveStateForMilestoneEvaluation', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 0,
      milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
      pagesInCurrentMilestone: 0,
      pacingNudge: null,
    };
    const activeState: ActiveState = {
      currentLocation: 'The old warehouse',
      activeThreats: [{ id: 'th-1', text: 'A patrol approaches' }],
      activeConstraints: [],
      openThreads: [],
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, activeState);
    expect(result).toContain('CURRENT STATE (for milestone evaluation)');
    expect(result).toContain('Location: The old warehouse');
    expect(result).toContain('Active threats: A patrol approaches');
    expect(result).not.toContain('Active threats: th-1');
  });

  it('uses evaluation-focused language, NOT "After writing the narrative"', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 0,
      milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
      pagesInCurrentMilestone: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).not.toContain('After writing the narrative');
    expect(result).toContain('Evaluate the following narrative against this structure');
  });

  it('includes PROGRESSION CHECK hint when pending milestones exist', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 0,
      milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
      pagesInCurrentMilestone: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).toContain('PROGRESSION CHECK');
  });

  it('does not include PROGRESSION CHECK when no pending milestones', () => {
    // Last milestone of last act
    const state: AccumulatedStructureState = {
      currentActIndex: 2,
      currentMilestoneIndex: 1,
      milestoneProgressions: [
        { milestoneId: '3.1', status: 'concluded', resolution: 'Seized' },
        { milestoneId: '3.2', status: 'active' },
      ],
      pagesInCurrentMilestone: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).not.toContain('PROGRESSION CHECK');
  });

  it('includes milestone role labels in milestone lines', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 1,
      milestoneProgressions: [
        { milestoneId: '1.1', status: 'concluded', resolution: 'Done' },
        { milestoneId: '1.2', status: 'active' },
      ],
      pagesInCurrentMilestone: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).toContain('(setup)');
    expect(result).toContain('(escalation)');
    expect(result).toContain('(turning_point)');
  });

  it('includes premise in structure header', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 0,
      milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
      pagesInCurrentMilestone: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).toContain('Premise: A fugitive must broadcast evidence');
  });

  it('includes PACING EVALUATION section', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 0,
      milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
      pagesInCurrentMilestone: 3,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).toContain('=== PACING EVALUATION ===');
    expect(result).toContain('Pages spent on current milestone: 3');
    expect(result).toContain('Story pacing budget: 20-40 total pages');
    expect(result).toContain('Total milestones in structure: 7');
    expect(result).toContain('Average pages per milestone (budget-based): ~6');
  });

  it('includes pacing detection criteria with correct thresholds', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 0,
      milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
      pagesInCurrentMilestone: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    // 7 milestones, targetPagesMax=40 → maxPagesPerBeat = ceil(40/7) + 2 = 6 + 2 = 8
    expect(result).toContain('BEAT STALL');
    expect(result).toContain('MISSING MIDPOINT');
    expect(result).toContain('pagesInCurrentMilestone exceeds 8');
  });

  it('returns empty string when currentAct is out of bounds', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 9,
      currentMilestoneIndex: 0,
      milestoneProgressions: [],
      pagesInCurrentMilestone: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).toBe('');
  });
});
