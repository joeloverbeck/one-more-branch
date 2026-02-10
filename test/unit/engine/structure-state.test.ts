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
    premise: 'A reluctant hero must leave home to save a crumbling kingdom.',
    pacingBudget: { targetPagesMin: 15, targetPagesMax: 40 },
    acts: [
      {
        name: 'Act One',
        objective: 'Accept the quest',
        stakes: 'Home is at risk',
        entryCondition: 'A messenger arrives',
        beats: [
          { name: 'Messenger arrives', description: 'A warning arrives', objective: 'Hear the warning', role: 'setup' },
          { name: 'Choose departure', description: 'A difficult choice', objective: 'Leave home', role: 'turning_point' },
        ],
      },
      {
        name: 'Act Two',
        objective: 'Survive the campaign',
        stakes: 'The kingdom may fall',
        entryCondition: 'The journey begins',
        beats: [{ name: 'First setback', description: 'First major setback', objective: 'Recover from loss', role: 'escalation' }],
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
        pagesInCurrentBeat: 0,
        pacingNudge: null,
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
        pagesInCurrentBeat: 0,
        pacingNudge: null,
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
    it('increments pagesInCurrentBeat when beatConcluded is false', () => {
      const structure = createStructure();
      const parentState = createInitialStructureState(structure);

      const result = applyStructureProgression(structure, parentState, false, '');

      expect(result).not.toBe(parentState);
      expect(result).toEqual({
        ...parentState,
        pagesInCurrentBeat: parentState.pagesInCurrentBeat + 1,
      });
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

    it('accumulates pagesInCurrentBeat across successive non-concluded progressions', () => {
      const structure = createStructure();
      const initial = createInitialStructureState(structure);

      const page1 = applyStructureProgression(structure, initial, false, '');
      const page2 = applyStructureProgression(structure, page1, false, '');
      const page3 = applyStructureProgression(structure, page2, false, '');

      expect(initial.pagesInCurrentBeat).toBe(0);
      expect(page1.pagesInCurrentBeat).toBe(1);
      expect(page2.pagesInCurrentBeat).toBe(2);
      expect(page3.pagesInCurrentBeat).toBe(3);
    });

    it('resets pagesInCurrentBeat to 0 when beat is concluded', () => {
      const structure = createStructure();
      const initial = createInitialStructureState(structure);

      const page1 = applyStructureProgression(structure, initial, false, '');
      const page2 = applyStructureProgression(structure, page1, false, '');
      expect(page2.pagesInCurrentBeat).toBe(2);

      const advanced = applyStructureProgression(structure, page2, true, 'Beat resolved.');
      expect(advanced.pagesInCurrentBeat).toBe(0);
    });

    it('initializes pacingNudge as null and resets on beat advancement', () => {
      const structure = createStructure();
      const initial = createInitialStructureState(structure);
      expect(initial.pacingNudge).toBeNull();

      const page1 = applyStructureProgression(structure, initial, false, '');
      expect(page1.pacingNudge).toBeNull();

      const advanced = applyStructureProgression(structure, page1, true, 'Resolved.');
      expect(advanced.pacingNudge).toBeNull();
    });

    it('does not mutate parent state (branch isolation)', () => {
      const structure = createStructure();
      const parentState = createInitialStructureState(structure);

      const branchA = applyStructureProgression(structure, parentState, false, '');
      const branchB = applyStructureProgression(structure, parentState, false, '');

      expect(parentState.pagesInCurrentBeat).toBe(0);
      expect(branchA.pagesInCurrentBeat).toBe(1);
      expect(branchB.pagesInCurrentBeat).toBe(1);
      expect(branchA).not.toBe(branchB);
      expect(branchA).toEqual(branchB);
    });
  });

  describe('createInitialStructureState paging fields', () => {
    it('starts with pagesInCurrentBeat 0 and pacingNudge null', () => {
      const structure = createStructure();
      const state = createInitialStructureState(structure);

      expect(state.pagesInCurrentBeat).toBe(0);
      expect(state.pacingNudge).toBeNull();
    });
  });

  describe('advanceStructureState paging fields', () => {
    it('resets pagesInCurrentBeat and pacingNudge on normal advancement', () => {
      const structure = createStructure();
      const state = createInitialStructureState(structure);

      const result = advanceStructureState(structure, state, 'The hero agrees.');

      expect(result.updatedState.pagesInCurrentBeat).toBe(0);
      expect(result.updatedState.pacingNudge).toBeNull();
    });

    it('resets pagesInCurrentBeat and pacingNudge on story completion', () => {
      const structure = createStructure();
      const currentState: AccumulatedStructureState = {
        currentActIndex: 1,
        currentBeatIndex: 0,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Done.' },
          { beatId: '1.2', status: 'concluded', resolution: 'Done.' },
          { beatId: '2.1', status: 'active' },
        ],
        pagesInCurrentBeat: 5,
        pacingNudge: null,
      };

      const result = advanceStructureState(structure, currentState, 'Final resolution.');

      expect(result.isComplete).toBe(true);
      expect(result.updatedState.pagesInCurrentBeat).toBe(0);
      expect(result.updatedState.pacingNudge).toBeNull();
    });
  });
});
