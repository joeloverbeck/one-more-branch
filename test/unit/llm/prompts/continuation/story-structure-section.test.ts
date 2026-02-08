import type { AccumulatedStructureState, StoryStructure } from '../../../../../src/models/story-arc';
import type { ActiveState } from '../../../../../src/models/state';
import {
  getRemainingBeats,
  buildActiveStateForBeatEvaluation,
  buildStoryStructureSection,
  DEVIATION_DETECTION_SECTION,
} from '../../../../../src/llm/prompts/continuation/story-structure-section';

describe('story-structure-section', () => {
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

  const emptyActiveState: ActiveState = {
    currentLocation: '',
    activeThreats: [],
    activeConstraints: [],
    openThreads: [],
  };

  describe('getRemainingBeats', () => {
    it('returns all beats when none concluded', () => {
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 0,
        beatProgressions: [{ beatId: '1.1', status: 'active' }],
      };

      const remaining = getRemainingBeats(testStructure, state);

      expect(remaining).toHaveLength(7);
      expect(remaining.map(b => b.id)).toContain('1.1');
      expect(remaining.map(b => b.id)).toContain('3.2');
    });

    it('excludes concluded beats', () => {
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 1,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Reached safehouse' },
          { beatId: '1.2', status: 'active' },
        ],
      };

      const remaining = getRemainingBeats(testStructure, state);

      expect(remaining.map(b => b.id)).not.toContain('1.1');
      expect(remaining.map(b => b.id)).toContain('1.2');
      expect(remaining).toHaveLength(6);
    });

    it('handles multi-act structures', () => {
      const state: AccumulatedStructureState = {
        currentActIndex: 1,
        currentBeatIndex: 0,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Done' },
          { beatId: '1.2', status: 'concluded', resolution: 'Done' },
          { beatId: '1.3', status: 'concluded', resolution: 'Done' },
          { beatId: '2.1', status: 'active' },
        ],
      };

      const remaining = getRemainingBeats(testStructure, state);

      expect(remaining.map(b => b.id)).toEqual(['2.1', '2.2', '3.1', '3.2']);
    });
  });

  describe('buildActiveStateForBeatEvaluation', () => {
    it('returns empty string when all fields empty', () => {
      const result = buildActiveStateForBeatEvaluation(emptyActiveState);
      expect(result).toBe('');
    });

    it('includes location when present', () => {
      const state: ActiveState = {
        ...emptyActiveState,
        currentLocation: 'Hidden bunker',
      };

      const result = buildActiveStateForBeatEvaluation(state);

      expect(result).toContain('Location: Hidden bunker');
    });

    it('uses prefix for threats, not raw', () => {
      const state: ActiveState = {
        ...emptyActiveState,
        activeThreats: [
          { prefix: 'Guard', description: 'patrolling', raw: 'Guard patrolling the area' },
          { prefix: 'Dog', description: 'trained', raw: 'Dog trained to attack' },
        ],
      };

      const result = buildActiveStateForBeatEvaluation(state);

      expect(result).toContain('Active threats: Guard, Dog');
      expect(result).not.toContain('patrolling the area');
    });

    it('uses prefix for constraints', () => {
      const state: ActiveState = {
        ...emptyActiveState,
        activeConstraints: [
          { prefix: 'Broken arm', description: 'cannot climb', raw: 'Broken arm - cannot climb' },
        ],
      };

      const result = buildActiveStateForBeatEvaluation(state);

      expect(result).toContain('Constraints: Broken arm');
    });

    it('uses prefix for threads', () => {
      const state: ActiveState = {
        ...emptyActiveState,
        openThreads: [
          { prefix: 'Missing key', description: 'need to find', raw: 'Missing key - need to find it' },
        ],
      };

      const result = buildActiveStateForBeatEvaluation(state);

      expect(result).toContain('Open threads: Missing key');
    });
  });

  describe('buildStoryStructureSection', () => {
    it('returns empty string when structure is undefined', () => {
      const result = buildStoryStructureSection(undefined, undefined, emptyActiveState);
      expect(result).toBe('');
    });

    it('returns empty string when accumulatedStructureState is undefined', () => {
      const result = buildStoryStructureSection(testStructure, undefined, emptyActiveState);
      expect(result).toBe('');
    });

    it('returns empty string when act index is invalid', () => {
      const state: AccumulatedStructureState = {
        currentActIndex: 9, // Invalid index
        currentBeatIndex: 0,
        beatProgressions: [],
      };

      const result = buildStoryStructureSection(testStructure, state, emptyActiveState);
      expect(result).toBe('');
    });

    it('includes beat statuses in output', () => {
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 1,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Reached safehouse' },
          { beatId: '1.2', status: 'active' },
          { beatId: '1.3', status: 'pending' },
        ],
      };

      const result = buildStoryStructureSection(testStructure, state, emptyActiveState);

      expect(result).toContain('[x] CONCLUDED: Reach safehouse');
      expect(result).toContain('[>] ACTIVE: Secure evidence');
      expect(result).toContain('[ ] PENDING: Choose ally');
    });

    it('includes deviation detection section', () => {
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 0,
        beatProgressions: [{ beatId: '1.1', status: 'active' }],
      };

      const result = buildStoryStructureSection(testStructure, state, emptyActiveState);

      expect(result).toContain('=== BEAT DEVIATION EVALUATION ===');
      expect(result).toContain('deviationDetected: true');
    });

    it('includes remaining beats for deviation evaluation', () => {
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 1,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Done' },
          { beatId: '1.2', status: 'active' },
        ],
      };

      const result = buildStoryStructureSection(testStructure, state, emptyActiveState);

      expect(result).toContain('REMAINING BEATS TO EVALUATE FOR DEVIATION:');
      expect(result).toContain('1.2: Secure evidence');
      expect(result).not.toContain('1.1: Reach safehouse');
    });
  });

  describe('DEVIATION_DETECTION_SECTION constant', () => {
    it('contains deviation evaluation header', () => {
      expect(DEVIATION_DETECTION_SECTION).toContain('=== BEAT DEVIATION EVALUATION ===');
    });

    it('explains deviation detection criteria', () => {
      expect(DEVIATION_DETECTION_SECTION).toContain('A deviation occurs when');
      expect(DEVIATION_DETECTION_SECTION).toContain('deviationDetected: true');
      expect(DEVIATION_DETECTION_SECTION).toContain('Be conservative');
    });
  });
});
