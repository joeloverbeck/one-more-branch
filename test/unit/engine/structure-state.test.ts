import { createStoryStructure } from '../../../src/engine/structure-factory';
import {
  advanceStructureState,
  applyStructureProgression,
  createInitialStructureState,
} from '../../../src/engine/structure-state';
import type { StructureGenerationResult } from '../../../src/engine/structure-types';
import type { AccumulatedStructureState, StoryStructure } from '../../../src/models/story-arc';

function createGenerationResult(): StructureGenerationResult {
  return {
    overallTheme: 'Restore the broken kingdom',
    acts: [
      {
        name: 'Act One',
        objective: 'Accept the quest',
        stakes: 'Home is at risk',
        entryCondition: 'A messenger arrives',
        beats: [
          { description: 'A warning arrives', objective: 'Hear the warning' },
          { description: 'A difficult choice', objective: 'Leave home' },
        ],
      },
      {
        name: 'Act Two',
        objective: 'Survive the campaign',
        stakes: 'The kingdom may fall',
        entryCondition: 'The journey begins',
        beats: [{ description: 'First major setback', objective: 'Recover from loss' }],
      },
    ],
    rawResponse: '{"mock":true}',
  };
}

function createStructure(): StoryStructure {
  return createStoryStructure(createGenerationResult());
}

describe('structure-state', () => {
  describe('createInitialStructureState', () => {
    it('creates first beat as active and all remaining beats as pending', () => {
      const structure = createStructure();
      const state = createInitialStructureState(structure);

      expect(state.currentActIndex).toBe(0);
      expect(state.currentBeatIndex).toBe(0);
      expect(state.beatProgressions).toHaveLength(3);
      expect(state.beatProgressions[0]).toEqual({ beatId: '1.1', status: 'active' });
      expect(state.beatProgressions[1]).toEqual({ beatId: '1.2', status: 'pending' });
      expect(state.beatProgressions[2]).toEqual({ beatId: '2.1', status: 'pending' });
    });
  });

  describe('advanceStructureState', () => {
    it('advances to the next beat in the same act', () => {
      const structure = createStructure();
      const state = createInitialStructureState(structure);

      const result = advanceStructureState(structure, state, 'The hero agrees to leave.');

      expect(result.actAdvanced).toBe(false);
      expect(result.beatAdvanced).toBe(true);
      expect(result.isComplete).toBe(false);
      expect(result.updatedState.currentActIndex).toBe(0);
      expect(result.updatedState.currentBeatIndex).toBe(1);
      expect(result.updatedState.beatProgressions).toContainEqual({
        beatId: '1.1',
        status: 'concluded',
        resolution: 'The hero agrees to leave.',
      });
      expect(result.updatedState.beatProgressions).toContainEqual({
        beatId: '1.2',
        status: 'active',
      });
    });

    it('advances to the next act when the last beat of current act concludes', () => {
      const structure = createStructure();
      const currentState: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 1,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'He heard the warning.' },
          { beatId: '1.2', status: 'active' },
          { beatId: '2.1', status: 'pending' },
        ],
      };

      const result = advanceStructureState(structure, currentState, 'The hero leaves home.');

      expect(result.actAdvanced).toBe(true);
      expect(result.beatAdvanced).toBe(true);
      expect(result.isComplete).toBe(false);
      expect(result.updatedState.currentActIndex).toBe(1);
      expect(result.updatedState.currentBeatIndex).toBe(0);
      expect(result.updatedState.beatProgressions).toContainEqual({
        beatId: '1.2',
        status: 'concluded',
        resolution: 'The hero leaves home.',
      });
      expect(result.updatedState.beatProgressions).toContainEqual({
        beatId: '2.1',
        status: 'active',
      });
    });

    it('marks the story complete when the last beat of the last act concludes', () => {
      const structure = createStructure();
      const currentState: AccumulatedStructureState = {
        currentActIndex: 1,
        currentBeatIndex: 0,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'He heard the warning.' },
          { beatId: '1.2', status: 'concluded', resolution: 'He left home.' },
          { beatId: '2.1', status: 'active' },
        ],
      };

      const result = advanceStructureState(structure, currentState, 'The hero recovers and rallies.');

      expect(result.isComplete).toBe(true);
      expect(result.actAdvanced).toBe(false);
      expect(result.beatAdvanced).toBe(false);
      expect(result.updatedState.currentActIndex).toBe(1);
      expect(result.updatedState.currentBeatIndex).toBe(0);
      expect(result.updatedState.beatProgressions).toContainEqual({
        beatId: '2.1',
        status: 'concluded',
        resolution: 'The hero recovers and rallies.',
      });
    });

    it('returns a new state and does not mutate the input state', () => {
      const structure = createStructure();
      const currentState = createInitialStructureState(structure);
      const before = JSON.parse(JSON.stringify(currentState)) as AccumulatedStructureState;

      const result = advanceStructureState(structure, currentState, 'A decision is made.');

      expect(result.updatedState).not.toBe(currentState);
      expect(result.updatedState.beatProgressions).not.toBe(currentState.beatProgressions);
      expect(currentState).toEqual(before);
    });

    it('throws for empty beat resolution', () => {
      const structure = createStructure();
      const state = createInitialStructureState(structure);

      expect(() => advanceStructureState(structure, state, '')).toThrow(
        'Cannot advance structure without a non-empty beat resolution',
      );
    });

    it('throws for whitespace-only beat resolution', () => {
      const structure = createStructure();
      const state = createInitialStructureState(structure);

      expect(() => advanceStructureState(structure, state, '   ')).toThrow(
        'Cannot advance structure without a non-empty beat resolution',
      );
    });
  });

  describe('applyStructureProgression', () => {
    it('returns parent state unchanged when beatConcluded is false', () => {
      const structure = createStructure();
      const parentState = createInitialStructureState(structure);

      const result = applyStructureProgression(structure, parentState, false, '');

      expect(result).toBe(parentState);
    });

    it('advances state with resolution when beatConcluded is true', () => {
      const structure = createStructure();
      const parentState = createInitialStructureState(structure);

      const result = applyStructureProgression(
        structure,
        parentState,
        true,
        'The warning is accepted.',
      );

      expect(result.currentActIndex).toBe(0);
      expect(result.currentBeatIndex).toBe(1);
      expect(result.beatProgressions).toContainEqual({
        beatId: '1.1',
        status: 'concluded',
        resolution: 'The warning is accepted.',
      });
    });

    it('throws when beatConcluded is true and beatResolution is blank', () => {
      const structure = createStructure();
      const parentState = createInitialStructureState(structure);

      expect(() => applyStructureProgression(structure, parentState, true, '   ')).toThrow(
        'Cannot advance structure without a non-empty beat resolution',
      );
    });
  });
});
