import {
  AccumulatedStructureState,
  StoryStructure,
  createEmptyAccumulatedStructureState,
  getBeatProgression,
  getCurrentAct,
  getCurrentBeat,
  isLastAct,
  isLastBeatOfAct,
} from '@/models/story-arc';

function createTestStructure(): StoryStructure {
  return {
    overallTheme: 'Survival against impossible odds',
    generatedAt: new Date('2026-02-07T00:00:00.000Z'),
    acts: [
      {
        id: '1',
        name: 'Beginning',
        objective: 'Start the journey',
        stakes: 'The village may be destroyed',
        entryCondition: 'Hero chooses to leave home',
        beats: [
          {
            id: '1.1',
            description: 'The call to action appears',
            objective: 'Accept the quest',
          },
          {
            id: '1.2',
            description: 'The hero gathers allies',
            objective: 'Form a reliable team',
          },
        ],
      },
      {
        id: '2',
        name: 'Middle',
        objective: 'Face escalating conflict',
        stakes: 'Enemies gain control of key routes',
        entryCondition: 'Team enters contested territory',
        beats: [
          {
            id: '2.1',
            description: 'The antagonist strikes back',
            objective: 'Survive the ambush',
          },
          {
            id: '2.2',
            description: 'The team regroups',
            objective: 'Recover resources and morale',
          },
        ],
      },
      {
        id: '3',
        name: 'End',
        objective: 'Resolve the main conflict',
        stakes: 'The world order may collapse',
        entryCondition: 'Hero reaches the final battlefield',
        beats: [
          {
            id: '3.1',
            description: 'The final confrontation begins',
            objective: 'Defeat the antagonist',
          },
        ],
      },
    ],
  };
}

describe('story-arc model utilities', () => {
  describe('createEmptyAccumulatedStructureState', () => {
    it('creates an initial empty state', () => {
      expect(createEmptyAccumulatedStructureState()).toEqual({
        currentActIndex: 0,
        currentBeatIndex: 0,
        beatProgressions: [],
      });
    });
  });

  describe('getCurrentAct', () => {
    it('returns the act at the current index', () => {
      const structure = createTestStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 1,
        currentBeatIndex: 0,
        beatProgressions: [],
      };

      expect(getCurrentAct(structure, state)?.id).toBe('2');
    });

    it('returns undefined when act index is out of bounds', () => {
      const structure = createTestStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 4,
        currentBeatIndex: 0,
        beatProgressions: [],
      };

      expect(getCurrentAct(structure, state)).toBeUndefined();
    });
  });

  describe('getCurrentBeat', () => {
    it('returns the beat at the current act/beat indices', () => {
      const structure = createTestStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 1,
        beatProgressions: [],
      };

      expect(getCurrentBeat(structure, state)?.id).toBe('1.2');
    });

    it('returns undefined when act index is out of bounds', () => {
      const structure = createTestStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 10,
        currentBeatIndex: 0,
        beatProgressions: [],
      };

      expect(getCurrentBeat(structure, state)).toBeUndefined();
    });

    it('returns undefined when beat index is out of bounds', () => {
      const structure = createTestStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 1,
        currentBeatIndex: 6,
        beatProgressions: [],
      };

      expect(getCurrentBeat(structure, state)).toBeUndefined();
    });
  });

  describe('getBeatProgression', () => {
    it('returns progression for an existing beat id', () => {
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 0,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Hero agreed to the mission' },
          { beatId: '1.2', status: 'active' },
        ],
      };

      expect(getBeatProgression(state, '1.1')).toEqual({
        beatId: '1.1',
        status: 'concluded',
        resolution: 'Hero agreed to the mission',
      });
    });

    it('returns undefined for an unknown beat id', () => {
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 0,
        beatProgressions: [{ beatId: '1.1', status: 'active' }],
      };

      expect(getBeatProgression(state, '9.9')).toBeUndefined();
    });
  });

  describe('isLastBeatOfAct', () => {
    it('returns true for the final beat in an act', () => {
      const structure = createTestStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 1,
        beatProgressions: [],
      };

      expect(isLastBeatOfAct(structure, state)).toBe(true);
    });

    it('returns false for non-final beats', () => {
      const structure = createTestStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 1,
        currentBeatIndex: 0,
        beatProgressions: [],
      };

      expect(isLastBeatOfAct(structure, state)).toBe(false);
    });

    it('returns false when indices do not point to a valid act', () => {
      const structure = createTestStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 10,
        currentBeatIndex: 0,
        beatProgressions: [],
      };

      expect(isLastBeatOfAct(structure, state)).toBe(false);
    });
  });

  describe('isLastAct', () => {
    it('returns true when current act index is the final act', () => {
      const structure = createTestStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 2,
        currentBeatIndex: 0,
        beatProgressions: [],
      };

      expect(isLastAct(structure, state)).toBe(true);
    });

    it('returns false when current act index is not the final act', () => {
      const structure = createTestStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 0,
        beatProgressions: [],
      };

      expect(isLastAct(structure, state)).toBe(false);
    });
  });
});
