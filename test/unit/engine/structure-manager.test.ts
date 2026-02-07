import {
  advanceStructureState,
  applyStructureProgression,
  buildRewriteContext,
  createInitialStructureState,
  createStoryStructure,
  extractCompletedBeats,
  getPreservedBeatIds,
  StructureGenerationResult,
  validatePreservedBeats,
} from '../../../src/engine/structure-manager';
import { createStory } from '../../../src/models/story';
import { createInitialVersionedStructure } from '../../../src/models/structure-version';
import { createBeatDeviation } from '../../../src/models/story-arc';
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

describe('structure-manager', () => {
  describe('createStoryStructure', () => {
    it('creates structure from generation result with hierarchical beat IDs', () => {
      const result = createStoryStructure(createGenerationResult());

      expect(result.overallTheme).toBe('Restore the broken kingdom');
      expect(result.acts[0]?.id).toBe('1');
      expect(result.acts[1]?.id).toBe('2');
      expect(result.acts[0]?.beats[0]?.id).toBe('1.1');
      expect(result.acts[0]?.beats[1]?.id).toBe('1.2');
      expect(result.acts[1]?.beats[0]?.id).toBe('2.1');
      expect(result.acts[0]?.name).toBe('Act One');
      expect(result.acts[0]?.beats[0]?.description).toBe('A warning arrives');
    });

    it('sets generatedAt to current date', () => {
      const before = Date.now();
      const result = createStoryStructure(createGenerationResult());
      const after = Date.now();

      expect(result.generatedAt).toBeInstanceOf(Date);
      expect(result.generatedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.generatedAt.getTime()).toBeLessThanOrEqual(after);
    });
  });

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

  describe('extractCompletedBeats', () => {
    it('returns empty array when no beats are concluded', () => {
      const structure = createStructure();
      const state = createInitialStructureState(structure);

      const completed = extractCompletedBeats(structure, state);

      expect(completed).toEqual([]);
    });

    it('returns concluded beats with indices, beat IDs, and resolutions in beat order', () => {
      const structure = createStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 1,
        currentBeatIndex: 0,
        beatProgressions: [
          { beatId: '2.1', status: 'concluded', resolution: 'Recovered from loss.' },
          { beatId: '1.2', status: 'concluded', resolution: 'Left home.' },
          { beatId: '1.1', status: 'concluded', resolution: 'Heard the warning.' },
        ],
      };

      const completed = extractCompletedBeats(structure, state);

      expect(completed).toEqual([
        {
          actIndex: 0,
          beatIndex: 0,
          beatId: '1.1',
          description: 'A warning arrives',
          objective: 'Hear the warning',
          resolution: 'Heard the warning.',
        },
        {
          actIndex: 0,
          beatIndex: 1,
          beatId: '1.2',
          description: 'A difficult choice',
          objective: 'Leave home',
          resolution: 'Left home.',
        },
        {
          actIndex: 1,
          beatIndex: 0,
          beatId: '2.1',
          description: 'First major setback',
          objective: 'Recover from loss',
          resolution: 'Recovered from loss.',
        },
      ]);
    });

    it('skips missing beats and warns without throwing', () => {
      const structure = createStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 0,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Resolved first beat.' },
          { beatId: '9.9', status: 'concluded', resolution: 'Invalid beat reference.' },
        ],
      };
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

      const completed = extractCompletedBeats(structure, state);

      expect(completed).toHaveLength(1);
      expect(completed[0]?.beatId).toBe('1.1');
      expect(warnSpy).toHaveBeenCalledWith('Beat 9.9 not found in structure');

      warnSpy.mockRestore();
    });

    it('excludes pending and active beats', () => {
      const structure = createStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 1,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Resolved first beat.' },
          { beatId: '1.2', status: 'active' },
          { beatId: '2.1', status: 'pending' },
        ],
      };

      const completed = extractCompletedBeats(structure, state);

      expect(completed).toHaveLength(1);
      expect(completed[0]?.beatId).toBe('1.1');
    });
  });

  describe('buildRewriteContext', () => {
    it('includes story fields, completed beats, deviation fields, and structure state positions', () => {
      const structure = createStructure();
      const structureVersion = createInitialVersionedStructure(structure);
      const story = createStory({
        title: 'Rewrite Story',
        characterConcept: 'A reluctant knight',
        worldbuilding: 'A fractured kingdom',
        tone: 'grim fantasy',
      });
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 1,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Accepted the call.' },
          { beatId: '1.2', status: 'active' },
          { beatId: '2.1', status: 'pending' },
        ],
      };
      const deviation = createBeatDeviation(
        'The protagonist switched allegiance.',
        ['1.2', '2.1'],
        'Now aligned with the rival faction.',
      );

      const context = buildRewriteContext(story, structureVersion, state, deviation);

      expect(context.characterConcept).toBe('A reluctant knight');
      expect(context.worldbuilding).toBe('A fractured kingdom');
      expect(context.tone).toBe('grim fantasy');
      expect(context.originalTheme).toBe('Restore the broken kingdom');
      expect(context.narrativeSummary).toBe('Now aligned with the rival faction.');
      expect(context.deviationReason).toBe('The protagonist switched allegiance.');
      expect(context.currentActIndex).toBe(0);
      expect(context.currentBeatIndex).toBe(1);
      expect(context.completedBeats).toEqual([
        {
          actIndex: 0,
          beatIndex: 0,
          beatId: '1.1',
          description: 'A warning arrives',
          objective: 'Hear the warning',
          resolution: 'Accepted the call.',
        },
      ]);
    });
  });

  describe('getPreservedBeatIds', () => {
    it('returns IDs of concluded beats only', () => {
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 1,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Resolved.' },
          { beatId: '1.2', status: 'active' },
          { beatId: '2.1', status: 'concluded', resolution: 'Resolved again.' },
          { beatId: '2.2', status: 'pending' },
        ],
      };

      expect(getPreservedBeatIds(state)).toEqual(['1.1', '2.1']);
    });

    it('returns empty array when no beats are concluded', () => {
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 0,
        beatProgressions: [
          { beatId: '1.1', status: 'active' },
          { beatId: '1.2', status: 'pending' },
        ],
      };

      expect(getPreservedBeatIds(state)).toEqual([]);
    });
  });

  describe('validatePreservedBeats', () => {
    it('returns true when all completed beats are preserved unchanged', () => {
      const original = createStructure();
      const next = createStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 1,
        currentBeatIndex: 0,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Resolved.' },
          { beatId: '1.2', status: 'concluded', resolution: 'Resolved.' },
          { beatId: '2.1', status: 'active' },
        ],
      };

      expect(validatePreservedBeats(original, next, state)).toBe(true);
    });

    it('returns false when a completed beat is missing in the new structure', () => {
      const original = createStructure();
      const next: StoryStructure = {
        ...createStructure(),
        acts: [
          original.acts[0]!,
          { ...original.acts[1]!, beats: [] },
        ],
      };
      const state: AccumulatedStructureState = {
        currentActIndex: 1,
        currentBeatIndex: 0,
        beatProgressions: [{ beatId: '2.1', status: 'concluded', resolution: 'Resolved.' }],
      };

      expect(validatePreservedBeats(original, next, state)).toBe(false);
    });

    it('returns false when completed beat description changes', () => {
      const original = createStructure();
      const next: StoryStructure = {
        ...createStructure(),
        acts: [
          {
            ...original.acts[0]!,
            beats: [
              { ...original.acts[0]!.beats[0]!, description: 'Different description' },
              original.acts[0]!.beats[1]!,
            ],
          },
          original.acts[1]!,
        ],
      };
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 1,
        beatProgressions: [{ beatId: '1.1', status: 'concluded', resolution: 'Resolved.' }],
      };

      expect(validatePreservedBeats(original, next, state)).toBe(false);
    });

    it('returns false when completed beat objective changes', () => {
      const original = createStructure();
      const next: StoryStructure = {
        ...createStructure(),
        acts: [
          {
            ...original.acts[0]!,
            beats: [
              { ...original.acts[0]!.beats[0]!, objective: 'Different objective' },
              original.acts[0]!.beats[1]!,
            ],
          },
          original.acts[1]!,
        ],
      };
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 1,
        beatProgressions: [{ beatId: '1.1', status: 'concluded', resolution: 'Resolved.' }],
      };

      expect(validatePreservedBeats(original, next, state)).toBe(false);
    });

    it('returns true when new beats are added after preserved beats', () => {
      const original = createStructure();
      const next: StoryStructure = {
        ...createStructure(),
        acts: [
          {
            ...original.acts[0]!,
            beats: [
              ...original.acts[0]!.beats,
              { id: '1.3', description: 'Additional beat', objective: 'New objective' },
            ],
          },
          original.acts[1]!,
        ],
      };
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 1,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Resolved.' },
          { beatId: '1.2', status: 'active' },
        ],
      };

      expect(validatePreservedBeats(original, next, state)).toBe(true);
    });

    it('returns true when there are no completed beats', () => {
      const original = createStructure();
      const next = createStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 0,
        beatProgressions: [
          { beatId: '1.1', status: 'active' },
          { beatId: '1.2', status: 'pending' },
          { beatId: '2.1', status: 'pending' },
        ],
      };

      expect(validatePreservedBeats(original, next, state)).toBe(true);
    });

    it('returns false when a concluded beat has an invalid beat ID format', () => {
      const original = createStructure();
      const next = createStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 0,
        beatProgressions: [{ beatId: 'invalid-id', status: 'concluded', resolution: 'Resolved.' }],
      };

      expect(validatePreservedBeats(original, next, state)).toBe(false);
    });
  });
});
