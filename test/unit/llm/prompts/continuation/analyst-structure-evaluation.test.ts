import type { AccumulatedStructureState, StoryStructure } from '../../../../../src/models/story-arc';
import type { ActiveState } from '../../../../../src/models/state/active-state';
import { buildAnalystStructureEvaluation } from '../../../../../src/llm/prompts/continuation/story-structure-section';

describe('buildAnalystStructureEvaluation', () => {
  const testStructure: StoryStructure = {
    overallTheme: 'Stop the city purge before dawn.',
    premise: 'A fugitive must broadcast evidence of a government purge before dawn erases all proof.',
    pacingBudget: { targetPagesMin: 20, targetPagesMax: 40 },
    generatedAt: new Date('2026-01-01T00:00:00.000Z'),
    acts: [
      {
        id: '1',
        name: 'The Crackdown',
        objective: 'Escape the first sweep',
        stakes: 'Capture means execution.',
        entryCondition: 'Emergency law declared.',
        beats: [
          { id: '1.1', description: 'Reach safehouse', objective: 'Get inside', role: 'setup' },
          { id: '1.2', description: 'Secure evidence', objective: 'Protect evidence', role: 'escalation' },
          { id: '1.3', description: 'Choose ally', objective: 'Commit to ally', role: 'turning_point' },
        ],
      },
      {
        id: '2',
        name: 'The Hunt',
        objective: 'Cross hostile territory',
        stakes: 'If lost, purge is permanent.',
        entryCondition: 'Leave the capital.',
        beats: [
          { id: '2.1', description: 'Break through checkpoints', objective: 'Find route north', role: 'escalation' },
          { id: '2.2', description: 'Defend witnesses', objective: 'Keep witnesses alive', role: 'turning_point' },
        ],
      },
      {
        id: '3',
        name: 'The Broadcast',
        objective: 'Expose the planners',
        stakes: 'Silence guarantees totalitarian rule.',
        entryCondition: 'Access relay tower.',
        beats: [
          { id: '3.1', description: 'Reach relay core', objective: 'Seize control room', role: 'escalation' },
          { id: '3.2', description: 'Deliver proof', objective: 'Transmit evidence', role: 'resolution' },
        ],
      },
    ],
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
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '1.1', status: 'active' }],
      pagesInCurrentBeat: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).toContain('Overall Theme: Stop the city purge before dawn.');
  });

  it('includes current act name, objective, and stakes', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '1.1', status: 'active' }],
      pagesInCurrentBeat: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).toContain('CURRENT ACT: The Crackdown');
    expect(result).toContain('Objective: Escape the first sweep');
    expect(result).toContain('Stakes: Capture means execution.');
  });

  it('shows beat status lines with concluded, active, and pending', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 1,
      beatProgressions: [
        { beatId: '1.1', status: 'concluded', resolution: 'Reached safehouse' },
        { beatId: '1.2', status: 'active' },
        { beatId: '1.3', status: 'pending' },
      ],
      pagesInCurrentBeat: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).toContain('[x] CONCLUDED (setup): Reach safehouse');
    expect(result).toContain('Resolution: Reached safehouse');
    expect(result).toContain('[>] ACTIVE (escalation): Secure evidence');
    expect(result).toContain('Objective: Protect evidence');
    expect(result).toContain('[ ] PENDING (turning_point): Choose ally');
  });

  it('includes remaining acts overview', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '1.1', status: 'active' }],
      pagesInCurrentBeat: 0,
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
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '1.1', status: 'active' }],
      pagesInCurrentBeat: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).toContain('=== BEAT EVALUATION ===');
  });

  it('includes DEVIATION section', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '1.1', status: 'active' }],
      pagesInCurrentBeat: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).toContain('BEAT DEVIATION EVALUATION');
  });

  it('includes REMAINING BEATS TO EVALUATE FOR DEVIATION', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '1.1', status: 'active' }],
      pagesInCurrentBeat: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).toContain('REMAINING BEATS TO EVALUATE FOR DEVIATION');
  });

  it('includes active state summary from buildActiveStateForBeatEvaluation', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '1.1', status: 'active' }],
      pagesInCurrentBeat: 0,
      pacingNudge: null,
    };
    const activeState: ActiveState = {
      currentLocation: 'The old warehouse',
      activeThreats: [{ prefix: 'patrol', description: 'A patrol approaches', raw: '[patrol] A patrol approaches' }],
      activeConstraints: [],
      openThreads: [],
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, activeState);
    expect(result).toContain('CURRENT STATE (for beat evaluation)');
    expect(result).toContain('Location: The old warehouse');
    expect(result).toContain('Active threats: patrol');
  });

  it('uses evaluation-focused language, NOT "After writing the narrative"', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '1.1', status: 'active' }],
      pagesInCurrentBeat: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).not.toContain('After writing the narrative');
    expect(result).toContain('Evaluate the following narrative against this structure');
  });

  it('includes PROGRESSION CHECK hint when pending beats exist', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '1.1', status: 'active' }],
      pagesInCurrentBeat: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).toContain('PROGRESSION CHECK');
  });

  it('does not include PROGRESSION CHECK when no pending beats', () => {
    // Last beat of last act
    const state: AccumulatedStructureState = {
      currentActIndex: 2,
      currentBeatIndex: 1,
      beatProgressions: [
        { beatId: '3.1', status: 'concluded', resolution: 'Seized' },
        { beatId: '3.2', status: 'active' },
      ],
      pagesInCurrentBeat: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).not.toContain('PROGRESSION CHECK');
  });

  it('includes beat role labels in beat lines', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 1,
      beatProgressions: [
        { beatId: '1.1', status: 'concluded', resolution: 'Done' },
        { beatId: '1.2', status: 'active' },
      ],
      pagesInCurrentBeat: 0,
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
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '1.1', status: 'active' }],
      pagesInCurrentBeat: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).toContain('Premise: A fugitive must broadcast evidence');
  });

  it('includes PACING EVALUATION section', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '1.1', status: 'active' }],
      pagesInCurrentBeat: 3,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).toContain('=== PACING EVALUATION ===');
    expect(result).toContain('Pages spent on current beat: 3');
    expect(result).toContain('Story pacing budget: 20-40 total pages');
    expect(result).toContain('Total beats in structure: 7');
    expect(result).toContain('Average pages per beat (budget-based): ~6');
  });

  it('includes pacing detection criteria with correct thresholds', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '1.1', status: 'active' }],
      pagesInCurrentBeat: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    // 7 beats, targetPagesMax=40 → maxPagesPerBeat = ceil(40/7) + 2 = 6 + 2 = 8
    expect(result).toContain('BEAT STALL');
    expect(result).toContain('MISSING MIDPOINT');
    expect(result).toContain('pagesInCurrentBeat exceeds 8');
  });

  it('returns empty string when currentAct is out of bounds', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 9,
      currentBeatIndex: 0,
      beatProgressions: [],
      pagesInCurrentBeat: 0,
      pacingNudge: null,
    };

    const result = buildAnalystStructureEvaluation(testStructure, state, emptyActiveState);
    expect(result).toBe('');
  });
});
