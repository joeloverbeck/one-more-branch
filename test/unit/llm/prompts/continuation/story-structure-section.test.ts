import type {
  AccumulatedStructureState,
  StoryStructure,
} from '../../../../../src/models/story-arc';
import type { ActiveState } from '../../../../../src/models/state';
import { ThreadType, Urgency } from '../../../../../src/models/state/keyed-entry';
import {
  getRemainingBeats,
  buildActiveStateForBeatEvaluation,
  DEVIATION_DETECTION_SECTION,
} from '../../../../../src/llm/prompts/continuation/story-structure-section';

describe('story-structure-section', () => {
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
        beats: [
          { id: '1.1', description: 'Reach safehouse', objective: 'Get inside', role: 'setup' },
          {
            id: '1.2',
            description: 'Secure evidence',
            objective: 'Protect evidence',
            role: 'escalation',
          },
          {
            id: '1.3',
            description: 'Choose ally',
            objective: 'Commit to ally',
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
        beats: [
          {
            id: '2.1',
            description: 'Break through checkpoints',
            objective: 'Find route north',
            role: 'escalation',
          },
          {
            id: '2.2',
            description: 'Defend witnesses',
            objective: 'Keep witnesses alive',
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
        beats: [
          {
            id: '3.1',
            description: 'Reach relay core',
            objective: 'Seize control room',
            role: 'escalation',
          },
          {
            id: '3.2',
            description: 'Deliver proof',
            objective: 'Transmit evidence',
            role: 'resolution',
          },
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
        pagesInCurrentBeat: 0,
        pacingNudge: null,
      };

      const remaining = getRemainingBeats(testStructure, state);

      expect(remaining).toHaveLength(7);
      expect(remaining.map((b) => b.id)).toContain('1.1');
      expect(remaining.map((b) => b.id)).toContain('3.2');
    });

    it('excludes concluded beats', () => {
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 1,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Reached safehouse' },
          { beatId: '1.2', status: 'active' },
        ],
        pagesInCurrentBeat: 0,
        pacingNudge: null,
      };

      const remaining = getRemainingBeats(testStructure, state);

      expect(remaining.map((b) => b.id)).not.toContain('1.1');
      expect(remaining.map((b) => b.id)).toContain('1.2');
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
        pagesInCurrentBeat: 0,
        pacingNudge: null,
      };

      const remaining = getRemainingBeats(testStructure, state);

      expect(remaining.map((b) => b.id)).toEqual(['2.1', '2.2', '3.1', '3.2']);
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

    it('uses threat text (not IDs)', () => {
      const state: ActiveState = {
        ...emptyActiveState,
        activeThreats: [
          { id: 'th-2', text: 'Guard patrolling the area' },
          { id: 'th-5', text: 'Dog trained to attack' },
        ],
      };

      const result = buildActiveStateForBeatEvaluation(state);

      expect(result).toContain('Active threats: Guard patrolling the area, Dog trained to attack');
      expect(result).not.toContain('Active threats: th-2, th-5');
    });

    it('uses constraint text (not IDs)', () => {
      const state: ActiveState = {
        ...emptyActiveState,
        activeConstraints: [{ id: 'cn-8', text: 'Broken arm - cannot climb' }],
      };

      const result = buildActiveStateForBeatEvaluation(state);

      expect(result).toContain('Constraints: Broken arm - cannot climb');
      expect(result).not.toContain('Constraints: cn-8');
    });

    it('uses thread text with metadata per line', () => {
      const state: ActiveState = {
        ...emptyActiveState,
        openThreads: [
          {
            id: 'td-3',
            text: 'Missing key - need to find it',
            threadType: ThreadType.QUEST,
            urgency: Urgency.HIGH,
          },
        ],
      };

      const result = buildActiveStateForBeatEvaluation(state);

      expect(result).toContain('Open threads:');
      expect(result).toContain('[td-3] (QUEST/HIGH) Missing key - need to find it');
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
