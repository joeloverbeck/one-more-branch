import { createStoryStructure } from '../../../src/engine/structure-factory';
import {
  advanceStructureState,
  advanceWithBeatSkip,
  applyStructureProgression,
} from '../../../src/engine/structure-state';
import type { StructureGenerationResult } from '../../../src/engine/structure-types';
import {
  createInitialStructureState,
} from '../../../src/models/story-arc';
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
          {
            name: 'Messenger arrives',
            description: 'A warning arrives',
            objective: 'Hear the warning',
            role: 'setup',
          },
          {
            name: 'Choose departure',
            description: 'A difficult choice',
            objective: 'Leave home',
            role: 'turning_point',
          },
        ],
      },
      {
        name: 'Act Two',
        objective: 'Survive the campaign',
        stakes: 'The kingdom may fall',
        entryCondition: 'The journey begins',
        beats: [
          {
            name: 'First setback',
            description: 'First major setback',
            objective: 'Recover from loss',
            role: 'escalation',
          },
        ],
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

      const result = advanceStructureState(
        structure,
        currentState,
        'The hero recovers and rallies.'
      );

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
        'Cannot advance structure without a non-empty beat resolution'
      );
    });

    it('throws for whitespace-only beat resolution', () => {
      const structure = createStructure();
      const state = createInitialStructureState(structure);

      expect(() => advanceStructureState(structure, state, '   ')).toThrow(
        'Cannot advance structure without a non-empty beat resolution'
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
        'The warning is accepted.'
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
        'Cannot advance structure without a non-empty beat resolution'
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

  describe('advanceWithBeatSkip', () => {
    function createMultiBeatStructure(): StoryStructure {
      return createStoryStructure({
        overallTheme: 'Epic journey',
        premise: 'A hero crosses many thresholds.',
        pacingBudget: { targetPagesMin: 20, targetPagesMax: 50 },
        acts: [
          {
            name: 'Act One',
            objective: 'Begin journey',
            stakes: 'Miss the chance',
            entryCondition: 'Call arrives',
            beats: [
              { name: 'Call', description: 'Hear the call', objective: 'Hear it', role: 'setup' },
              { name: 'Prep', description: 'Prepare', objective: 'Gather supplies', role: 'escalation' },
              { name: 'Depart', description: 'Leave home', objective: 'Cross threshold', role: 'turning_point' },
              { name: 'First trial', description: 'Face trial', objective: 'Survive trial', role: 'escalation' },
            ],
          },
          {
            name: 'Act Two',
            objective: 'Survive',
            stakes: 'Kingdom falls',
            entryCondition: 'Enter the wilds',
            beats: [
              { name: 'Ally', description: 'Meet ally', objective: 'Gain trust', role: 'setup' },
              { name: 'Betrayal', description: 'Betrayal', objective: 'Survive betrayal', role: 'turning_point' },
            ],
          },
        ],
        rawResponse: '{}',
      });
    }

    it('skips intermediate beats to reach the target beat within the same act', () => {
      const structure = createMultiBeatStructure();
      const state = createInitialStructureState(structure);

      // At beat 1.1, skip to beat 1.4
      const result = advanceWithBeatSkip(
        structure,
        state,
        'Call answered.',
        '1.4',
        'Implicitly resolved by narrative advancement'
      );

      expect(result.isComplete).toBe(false);
      expect(result.updatedState.currentActIndex).toBe(0);
      expect(result.updatedState.currentBeatIndex).toBe(3);
      expect(result.updatedState.beatProgressions).toContainEqual({
        beatId: '1.1',
        status: 'concluded',
        resolution: 'Call answered.',
      });
      expect(result.updatedState.beatProgressions).toContainEqual({
        beatId: '1.2',
        status: 'concluded',
        resolution: 'Implicitly resolved by narrative advancement',
      });
      expect(result.updatedState.beatProgressions).toContainEqual({
        beatId: '1.3',
        status: 'concluded',
        resolution: 'Implicitly resolved by narrative advancement',
      });
      expect(result.updatedState.beatProgressions).toContainEqual({
        beatId: '1.4',
        status: 'active',
      });
      expect(result.beatAdvanced).toBe(true);
      expect(result.actAdvanced).toBe(false);
    });

    it('skips across act boundaries to reach a target in a later act', () => {
      const structure = createMultiBeatStructure();
      const state = createInitialStructureState(structure);

      // At beat 1.1, skip to beat 2.1
      const result = advanceWithBeatSkip(
        structure,
        state,
        'Call answered.',
        '2.1',
        'Bridged'
      );

      expect(result.isComplete).toBe(false);
      expect(result.updatedState.currentActIndex).toBe(1);
      expect(result.updatedState.currentBeatIndex).toBe(0);
      expect(result.actAdvanced).toBe(true);
      expect(result.beatAdvanced).toBe(true);
    });

    it('returns complete when the target is the last beat and it gets concluded along the way', () => {
      const structure = createMultiBeatStructure();
      // Start at beat 2.1 (last act, first beat)
      const state: AccumulatedStructureState = {
        currentActIndex: 1,
        currentBeatIndex: 0,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Done.' },
          { beatId: '1.2', status: 'concluded', resolution: 'Done.' },
          { beatId: '1.3', status: 'concluded', resolution: 'Done.' },
          { beatId: '1.4', status: 'concluded', resolution: 'Done.' },
          { beatId: '2.1', status: 'active' },
          { beatId: '2.2', status: 'pending' },
        ],
        pagesInCurrentBeat: 2,
        pacingNudge: null,
      };

      // Skip from 2.1 past 2.2 — since 2.2 is the last beat, this triggers completion
      const result = advanceWithBeatSkip(
        structure,
        state,
        'Trust gained.',
        '2.2',
        'Bridged'
      );

      // Should land on 2.2 as active (not complete, since target reached)
      expect(result.updatedState.currentActIndex).toBe(1);
      expect(result.updatedState.currentBeatIndex).toBe(1);
      expect(result.isComplete).toBe(false);
    });

    it('falls back to normal advancement for invalid beat ID format', () => {
      const structure = createMultiBeatStructure();
      const state = createInitialStructureState(structure);

      const result = advanceWithBeatSkip(
        structure,
        state,
        'Call answered.',
        'invalid',
        'Bridged'
      );

      // Should just do a normal single advance
      expect(result.updatedState.currentBeatIndex).toBe(1);
      expect(result.beatAdvanced).toBe(true);
    });
  });

  describe('applyStructureProgression with alignmentSkip', () => {
    it('uses normal advancement when alignmentSkip is undefined', () => {
      const structure = createStructure();
      const parentState = createInitialStructureState(structure);

      const result = applyStructureProgression(
        structure,
        parentState,
        true,
        'Beat resolved.',
        undefined
      );

      expect(result.currentBeatIndex).toBe(1);
    });

    it('uses beat skip when alignmentSkip is provided', () => {
      const multiStructure = createStoryStructure({
        overallTheme: 'Journey',
        premise: 'A hero.',
        pacingBudget: { targetPagesMin: 10, targetPagesMax: 30 },
        acts: [
          {
            name: 'Act One',
            objective: 'Begin',
            stakes: 'Fail',
            entryCondition: 'Start',
            beats: [
              { name: 'B1', description: 'First', objective: 'Start', role: 'setup' },
              { name: 'B2', description: 'Second', objective: 'Middle', role: 'escalation' },
              { name: 'B3', description: 'Third', objective: 'End', role: 'turning_point' },
            ],
          },
        ],
        rawResponse: '{}',
      });
      const parentState = createInitialStructureState(multiStructure);

      const result = applyStructureProgression(
        multiStructure,
        parentState,
        true,
        'First beat resolved.',
        { targetBeatId: '1.3', bridgedResolution: 'Skipped' }
      );

      expect(result.currentBeatIndex).toBe(2);
      expect(result.beatProgressions).toContainEqual({
        beatId: '1.2',
        status: 'concluded',
        resolution: 'Skipped',
      });
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
