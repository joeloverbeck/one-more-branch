import { createStoryStructure } from '../../../src/engine/structure-factory';
import {
  buildRewriteContext,
  extractCompletedBeats,
  extractPlannedBeats,
  getPreservedBeatIds,
  validatePreservedBeats,
} from '../../../src/engine/structure-rewrite-support';
import type { StructureGenerationResult } from '../../../src/engine/structure-types';
import { createStory } from '../../../src/models/story';
import { createInitialVersionedStructure } from '../../../src/models/structure-version';
import { createBeatDeviation, createInitialStructureState } from '../../../src/models/story-arc';
import type { AccumulatedStructureState, StoryStructure } from '../../../src/models/story-arc';
import { buildMinimalDecomposedCharacter, MINIMAL_DECOMPOSED_WORLD } from '../../fixtures/decomposed';

function createGenerationResult(): StructureGenerationResult {
  return {
    overallTheme: 'Restore the broken kingdom',
    premise:
      'A reluctant hero must leave home to save a crumbling kingdom before it falls to ruin.',
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

describe('structure-rewrite-support', () => {
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
        pagesInCurrentBeat: 0,
        pacingNudge: null,
      };

      const completed = extractCompletedBeats(structure, state);

      expect(completed).toEqual([
        {
          actIndex: 0,
          beatIndex: 0,
          beatId: '1.1',
          name: 'Messenger arrives',
          description: 'A warning arrives',
          objective: 'Hear the warning',
          role: 'setup',
          resolution: 'Heard the warning.',
        },
        {
          actIndex: 0,
          beatIndex: 1,
          beatId: '1.2',
          name: 'Choose departure',
          description: 'A difficult choice',
          objective: 'Leave home',
          role: 'turning_point',
          resolution: 'Left home.',
        },
        {
          actIndex: 1,
          beatIndex: 0,
          beatId: '2.1',
          name: 'First setback',
          description: 'First major setback',
          objective: 'Recover from loss',
          role: 'escalation',
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
        pagesInCurrentBeat: 0,
        pacingNudge: null,
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
        pagesInCurrentBeat: 0,
        pacingNudge: null,
      };

      const completed = extractCompletedBeats(structure, state);

      expect(completed).toHaveLength(1);
      expect(completed[0]?.beatId).toBe('1.1');
    });
  });

  describe('extractPlannedBeats', () => {
    it('returns empty array when all beats are concluded', () => {
      const structure = createStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 1,
        currentBeatIndex: 0,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Done.' },
          { beatId: '1.2', status: 'concluded', resolution: 'Done.' },
          { beatId: '2.1', status: 'concluded', resolution: 'Done.' },
        ],
        pagesInCurrentBeat: 0,
        pacingNudge: null,
      };

      const planned = extractPlannedBeats(structure, state);

      expect(planned).toEqual([]);
    });

    it('returns beats that come after the deviation point', () => {
      const structure = createStructure();
      // Deviation at Act 1, Beat 2 (index 0, 1) — beat 2.1 should be planned
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 1,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Done.' },
          { beatId: '1.2', status: 'active' },
        ],
        pagesInCurrentBeat: 0,
        pacingNudge: null,
      };

      const planned = extractPlannedBeats(structure, state);

      expect(planned).toEqual([
        {
          actIndex: 1,
          beatIndex: 0,
          beatId: '2.1',
          name: 'First setback',
          description: 'First major setback',
          objective: 'Recover from loss',
          role: 'escalation',
        },
      ]);
    });

    it('excludes concluded beats', () => {
      const structure = createStructure();
      // Beat 1.1 concluded, deviation at 1.2, 2.1 is planned
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 1,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Done.' },
          { beatId: '1.2', status: 'active' },
        ],
        pagesInCurrentBeat: 0,
        pacingNudge: null,
      };

      const planned = extractPlannedBeats(structure, state);

      // 1.1 is concluded, 1.2 is current (excluded), only 2.1 remains
      expect(planned).toHaveLength(1);
      expect(planned[0]?.beatId).toBe('2.1');
    });

    it('excludes the currently active beat', () => {
      const structure = createStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 0,
        beatProgressions: [{ beatId: '1.1', status: 'active' }],
        pagesInCurrentBeat: 0,
        pacingNudge: null,
      };

      const planned = extractPlannedBeats(structure, state);

      // 1.1 is current (excluded), 1.2 and 2.1 are planned
      expect(planned).toHaveLength(2);
      expect(planned[0]?.beatId).toBe('1.2');
      expect(planned[1]?.beatId).toBe('2.1');
    });

    it('sorts by act/beat index', () => {
      const structure = createStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 0,
        beatProgressions: [{ beatId: '1.1', status: 'active' }],
        pagesInCurrentBeat: 0,
        pacingNudge: null,
      };

      const planned = extractPlannedBeats(structure, state);

      // Should be sorted: 1.2 before 2.1
      expect(planned[0]?.actIndex).toBe(0);
      expect(planned[0]?.beatIndex).toBe(1);
      expect(planned[1]?.actIndex).toBe(1);
      expect(planned[1]?.beatIndex).toBe(0);
    });

    it('returns empty array when deviation is at the very last beat', () => {
      const structure = createStructure();
      // Deviation at the last beat (Act 2, Beat 1 = index 1, 0)
      const state: AccumulatedStructureState = {
        currentActIndex: 1,
        currentBeatIndex: 0,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Done.' },
          { beatId: '1.2', status: 'concluded', resolution: 'Done.' },
          { beatId: '2.1', status: 'active' },
        ],
        pagesInCurrentBeat: 0,
        pacingNudge: null,
      };

      const planned = extractPlannedBeats(structure, state);

      expect(planned).toEqual([]);
    });
  });

  describe('buildRewriteContext', () => {
    it('includes story fields, completed beats, deviation fields, and structure state positions', () => {
      const structure = createStructure();
      const structureVersion = createInitialVersionedStructure(structure);
      const story = {
        ...createStory({
          title: 'Rewrite Story',
          characterConcept: 'A reluctant knight',
          worldbuilding: 'A fractured kingdom',
          tone: 'grim fantasy',
        }),
        decomposedCharacters: [buildMinimalDecomposedCharacter('A reluctant knight')],
        decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
      };
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 1,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Accepted the call.' },
          { beatId: '1.2', status: 'active' },
          { beatId: '2.1', status: 'pending' },
        ],
        pagesInCurrentBeat: 0,
        pacingNudge: null,
      };
      const deviation = createBeatDeviation(
        'The protagonist switched allegiance.',
        ['1.2', '2.1'],
        'Now aligned with the rival faction.'
      );

      const context = buildRewriteContext(story, structureVersion, state, deviation);

      expect(context.decomposedCharacters).toEqual([buildMinimalDecomposedCharacter('A reluctant knight')]);
      expect(context.decomposedWorld).toEqual(MINIMAL_DECOMPOSED_WORLD);
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
          name: 'Messenger arrives',
          description: 'A warning arrives',
          objective: 'Hear the warning',
          role: 'setup',
          resolution: 'Accepted the call.',
        },
      ]);
      // Beat 2.1 comes after deviation point (0, 1) and is not concluded
      expect(context.plannedBeats).toEqual([
        {
          actIndex: 1,
          beatIndex: 0,
          beatId: '2.1',
          name: 'First setback',
          description: 'First major setback',
          objective: 'Recover from loss',
          role: 'escalation',
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
        pagesInCurrentBeat: 0,
        pacingNudge: null,
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
        pagesInCurrentBeat: 0,
        pacingNudge: null,
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
        pagesInCurrentBeat: 0,
        pacingNudge: null,
      };

      expect(validatePreservedBeats(original, next, state)).toBe(true);
    });

    it('returns false when a completed beat is missing in the new structure', () => {
      const original = createStructure();
      const next: StoryStructure = {
        ...createStructure(),
        acts: [original.acts[0]!, { ...original.acts[1]!, beats: [] }],
      };
      const state: AccumulatedStructureState = {
        currentActIndex: 1,
        currentBeatIndex: 0,
        beatProgressions: [{ beatId: '2.1', status: 'concluded', resolution: 'Resolved.' }],
        pagesInCurrentBeat: 0,
        pacingNudge: null,
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
        pagesInCurrentBeat: 0,
        pacingNudge: null,
      };

      expect(validatePreservedBeats(original, next, state)).toBe(false);
    });

    it('returns false when completed beat name changes', () => {
      const original = createStructure();
      const next: StoryStructure = {
        ...createStructure(),
        acts: [
          {
            ...original.acts[0]!,
            beats: [
              { ...original.acts[0]!.beats[0]!, name: 'Different beat name' },
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
        pagesInCurrentBeat: 0,
        pacingNudge: null,
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
        pagesInCurrentBeat: 0,
        pacingNudge: null,
      };

      expect(validatePreservedBeats(original, next, state)).toBe(false);
    });

    it('returns false when completed beat role changes', () => {
      const original = createStructure();
      const next: StoryStructure = {
        ...createStructure(),
        acts: [
          {
            ...original.acts[0]!,
            beats: [
              { ...original.acts[0]!.beats[0]!, role: 'resolution' as const },
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
        pagesInCurrentBeat: 0,
        pacingNudge: null,
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
              {
                id: '1.3',
                description: 'Additional beat',
                objective: 'New objective',
                role: 'escalation' as const,
              },
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
        pagesInCurrentBeat: 0,
        pacingNudge: null,
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
        pagesInCurrentBeat: 0,
        pacingNudge: null,
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
        pagesInCurrentBeat: 0,
        pacingNudge: null,
      };

      expect(validatePreservedBeats(original, next, state)).toBe(false);
    });
  });
});
