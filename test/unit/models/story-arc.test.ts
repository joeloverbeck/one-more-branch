import {
  AccumulatedStructureState,
  createBeatDeviation,
  createNoDeviation,
  StoryStructure,
  isDeviation,
  isNoDeviation,
  validateDeviationTargets,
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

  describe('DeviationResult', () => {
    describe('isDeviation', () => {
      it('returns true for BeatDeviation', () => {
        const result = createBeatDeviation(
          'Player choice contradicted remaining beats',
          ['2.2', '3.1'],
          'The protagonist switched allegiances',
        );

        expect(isDeviation(result)).toBe(true);
      });

      it('returns false for NoDeviation', () => {
        const result = createNoDeviation();
        expect(isDeviation(result)).toBe(false);
      });
    });

    describe('isNoDeviation', () => {
      it('returns true for NoDeviation', () => {
        const result = createNoDeviation();
        expect(isNoDeviation(result)).toBe(true);
      });

      it('returns false for BeatDeviation', () => {
        const result = createBeatDeviation(
          'Branch no longer aligns with planned infiltration beat',
          ['2.2'],
          'The protagonist accepted command from the enemy',
        );

        expect(isNoDeviation(result)).toBe(false);
      });
    });

    describe('createBeatDeviation', () => {
      it('creates BeatDeviation with all fields', () => {
        const result = createBeatDeviation(
          'Narrative shifted to alliance with antagonist',
          ['2.2', '3.1'],
          'The team split after a betrayal',
        );

        expect(result).toEqual({
          detected: true,
          reason: 'Narrative shifted to alliance with antagonist',
          invalidatedBeatIds: ['2.2', '3.1'],
          narrativeSummary: 'The team split after a betrayal',
        });
      });

      it('throws if invalidatedBeatIds is empty', () => {
        expect(() => createBeatDeviation('No invalidated beats provided', [], 'Summary')).toThrow(
          'BeatDeviation must have at least one invalidated beat ID',
        );
      });

      it('preserves array identity', () => {
        const invalidatedBeatIds = ['2.2', '3.1'] as const;
        const result = createBeatDeviation('Deviation detected', invalidatedBeatIds, 'Summary');

        expect(result.invalidatedBeatIds).toBe(invalidatedBeatIds);
      });
    });

    describe('createNoDeviation', () => {
      it('creates NoDeviation with detected false', () => {
        expect(createNoDeviation()).toEqual({ detected: false });
      });
    });

    describe('validateDeviationTargets', () => {
      it('returns true when concluded beats are not invalidated', () => {
        const deviation = createBeatDeviation('Future beats are invalid', ['2.2'], 'Summary');
        const structureState: AccumulatedStructureState = {
          currentActIndex: 1,
          currentBeatIndex: 0,
          beatProgressions: [
            { beatId: '1.1', status: 'concluded', resolution: 'Quest accepted' },
            { beatId: '1.2', status: 'concluded', resolution: 'Allies gathered' },
            { beatId: '2.1', status: 'active' },
          ],
        };

        expect(validateDeviationTargets(deviation, structureState)).toBe(true);
      });

      it('returns false when a concluded beat is invalidated', () => {
        const deviation = createBeatDeviation('Invalidation includes completed beat', ['1.2'], 'Summary');
        const structureState: AccumulatedStructureState = {
          currentActIndex: 1,
          currentBeatIndex: 0,
          beatProgressions: [
            { beatId: '1.1', status: 'concluded', resolution: 'Quest accepted' },
            { beatId: '1.2', status: 'concluded', resolution: 'Allies gathered' },
            { beatId: '2.1', status: 'active' },
          ],
        };

        expect(validateDeviationTargets(deviation, structureState)).toBe(false);
      });

      it('returns true for beat IDs not in progressions', () => {
        const deviation = createBeatDeviation('Future acts need replacement', ['3.1'], 'Summary');
        const structureState: AccumulatedStructureState = {
          currentActIndex: 1,
          currentBeatIndex: 0,
          beatProgressions: [{ beatId: '1.1', status: 'concluded', resolution: 'Quest accepted' }],
        };

        expect(validateDeviationTargets(deviation, structureState)).toBe(true);
      });
    });
  });
});
