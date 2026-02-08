import type { AccumulatedStructureState, StoryStructure } from '../../../../../src/models/story-arc';
import { buildWriterStructureContext } from '../../../../../src/llm/prompts/continuation/story-structure-section';

describe('buildWriterStructureContext', () => {
  const testStructure: StoryStructure = {
    overallTheme: 'Stop the city purge before dawn.',
    generatedAt: new Date('2026-01-01T00:00:00.000Z'),
    acts: [
      {
        id: '1',
        name: 'The Crackdown',
        objective: 'Escape the first sweep',
        stakes: 'Capture means execution.',
        entryCondition: 'Emergency law declared.',
        beats: [
          { id: '1.1', description: 'Reach safehouse', objective: 'Get inside' },
          { id: '1.2', description: 'Secure evidence', objective: 'Protect evidence' },
          { id: '1.3', description: 'Choose ally', objective: 'Commit to ally' },
        ],
      },
      {
        id: '2',
        name: 'The Hunt',
        objective: 'Cross hostile territory',
        stakes: 'If lost, purge is permanent.',
        entryCondition: 'Leave the capital.',
        beats: [
          { id: '2.1', description: 'Break through checkpoints', objective: 'Find route north' },
          { id: '2.2', description: 'Defend witnesses', objective: 'Keep witnesses alive' },
        ],
      },
      {
        id: '3',
        name: 'The Broadcast',
        objective: 'Expose the planners',
        stakes: 'Silence guarantees totalitarian rule.',
        entryCondition: 'Access relay tower.',
        beats: [
          { id: '3.1', description: 'Reach relay core', objective: 'Seize control room' },
          { id: '3.2', description: 'Deliver proof', objective: 'Transmit evidence' },
        ],
      },
    ],
  };

  it('returns empty string when structure is undefined', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '1.1', status: 'active' }],
    };

    const result = buildWriterStructureContext(undefined, state);
    expect(result).toBe('');
  });

  it('returns empty string when accumulatedStructureState is undefined', () => {
    const result = buildWriterStructureContext(testStructure, undefined);
    expect(result).toBe('');
  });

  it('returns empty string when currentAct is out of bounds', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 9,
      currentBeatIndex: 0,
      beatProgressions: [],
    };

    const result = buildWriterStructureContext(testStructure, state);
    expect(result).toBe('');
  });

  it('includes overall theme', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '1.1', status: 'active' }],
    };

    const result = buildWriterStructureContext(testStructure, state);
    expect(result).toContain('Overall Theme: Stop the city purge before dawn.');
  });

  it('includes current act name, objective, and stakes', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '1.1', status: 'active' }],
    };

    const result = buildWriterStructureContext(testStructure, state);
    expect(result).toContain('CURRENT ACT: The Crackdown');
    expect(result).toContain('Objective: Escape the first sweep');
    expect(result).toContain('Stakes: Capture means execution.');
  });

  it('shows beat status lines with concluded resolution, active objective, and pending', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 1,
      beatProgressions: [
        { beatId: '1.1', status: 'concluded', resolution: 'Reached safehouse' },
        { beatId: '1.2', status: 'active' },
        { beatId: '1.3', status: 'pending' },
      ],
    };

    const result = buildWriterStructureContext(testStructure, state);
    expect(result).toContain('[x] CONCLUDED: Reach safehouse');
    expect(result).toContain('Resolution: Reached safehouse');
    expect(result).toContain('[>] ACTIVE: Secure evidence');
    expect(result).toContain('Objective: Protect evidence');
    expect(result).toContain('[ ] PENDING: Choose ally');
  });

  it('includes remaining acts overview', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '1.1', status: 'active' }],
    };

    const result = buildWriterStructureContext(testStructure, state);
    expect(result).toContain('REMAINING ACTS:');
    expect(result).toContain('Act 2: The Hunt - Cross hostile territory');
    expect(result).toContain('Act 3: The Broadcast - Expose the planners');
  });

  it('shows "None" when no remaining acts', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 2,
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '3.1', status: 'active' }],
    };

    const result = buildWriterStructureContext(testStructure, state);
    expect(result).toContain('REMAINING ACTS:');
    expect(result).toContain('- None');
  });

  it('includes story structure header', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '1.1', status: 'active' }],
    };

    const result = buildWriterStructureContext(testStructure, state);
    expect(result).toContain('=== STORY STRUCTURE ===');
  });

  // Exclusion tests: verify no evaluation/analysis content
  it('does NOT contain "BEAT EVALUATION"', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '1.1', status: 'active' }],
    };

    const result = buildWriterStructureContext(testStructure, state);
    expect(result).not.toContain('BEAT EVALUATION');
  });

  it('does NOT contain "DEVIATION"', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '1.1', status: 'active' }],
    };

    const result = buildWriterStructureContext(testStructure, state);
    expect(result).not.toContain('DEVIATION');
  });

  it('does NOT contain "REMAINING BEATS TO EVALUATE"', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '1.1', status: 'active' }],
    };

    const result = buildWriterStructureContext(testStructure, state);
    expect(result).not.toContain('REMAINING BEATS TO EVALUATE');
  });

  it('does NOT contain "PROGRESSION CHECK"', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '1.1', status: 'active' }],
    };

    const result = buildWriterStructureContext(testStructure, state);
    expect(result).not.toContain('PROGRESSION CHECK');
  });

  it('does NOT contain "CURRENT STATE (for beat evaluation)"', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '1.1', status: 'active' }],
    };

    const result = buildWriterStructureContext(testStructure, state);
    expect(result).not.toContain('CURRENT STATE (for beat evaluation)');
  });
});
