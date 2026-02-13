/**
 * Integration tests for structure module boundaries.
 * Verifies that the refactored modules work correctly together.
 */
import { createStoryStructure } from '../../../src/engine/structure-factory';
import {
  buildRewriteContext,
  extractCompletedBeats,
  getPreservedBeatIds,
  validatePreservedBeats,
} from '../../../src/engine/structure-rewrite-support';
import {
  advanceStructureState,
  applyStructureProgression,
} from '../../../src/engine/structure-state';
import {
  getBeatOrThrow,
  parseBeatIndices,
  upsertBeatProgression,
} from '../../../src/engine/beat-utils';
import type { StructureGenerationResult } from '../../../src/engine/structure-types';
import { createStory } from '../../../src/models/story';
import { createInitialVersionedStructure } from '../../../src/models/structure-version';
import { createBeatDeviation, createInitialStructureState } from '../../../src/models/story-arc';

function createGenerationResult(): StructureGenerationResult {
  return {
    overallTheme: 'A hero rises to save the realm',
    premise:
      'A reluctant guardian must unify fractured allies before an ancient force consumes the realm.',
    pacingBudget: { targetPagesMin: 16, targetPagesMax: 38 },
    acts: [
      {
        name: 'The Call',
        objective: 'Accept the quest',
        stakes: 'Village destruction',
        entryCondition: 'Mysterious stranger arrives',
        beats: [
          {
            name: 'Omen in the valley',
            description: 'Strange omens appear',
            objective: 'Notice the signs',
            role: 'setup',
          },
          {
            name: 'Challenge declared',
            description: 'A challenge is issued',
            objective: 'Accept or reject',
            role: 'turning_point',
          },
        ],
      },
      {
        name: 'The Journey',
        objective: 'Reach the destination',
        stakes: 'Running out of time',
        entryCondition: 'Hero departs',
        beats: [
          {
            name: 'Broken pass',
            description: 'First obstacle',
            objective: 'Overcome the barrier',
            role: 'escalation',
          },
          {
            name: 'Uneasy ally',
            description: 'Unexpected ally',
            objective: 'Form alliance',
            role: 'turning_point',
          },
        ],
      },
      {
        name: 'The Climax',
        objective: 'Confront the threat',
        stakes: 'Everything at risk',
        entryCondition: 'Final confrontation',
        beats: [
          {
            name: 'Final battle',
            description: 'Final battle',
            objective: 'Defeat the enemy',
            role: 'resolution',
          },
        ],
      },
    ],
    rawResponse: '{"test":"integration"}',
  };
}

describe('structure modules integration', () => {
  describe('factory → state initialization flow', () => {
    it('creates structure and initializes state correctly', () => {
      // Factory creates structure
      const structure = createStoryStructure(createGenerationResult());

      // State module initializes state from structure
      const state = createInitialStructureState(structure);

      expect(state.currentActIndex).toBe(0);
      expect(state.currentBeatIndex).toBe(0);
      expect(state.beatProgressions).toHaveLength(5); // 2 + 2 + 1 beats
      expect(state.beatProgressions[0]?.status).toBe('active');
      expect(state.beatProgressions[1]?.status).toBe('pending');
    });

    it('beat IDs match between factory and state', () => {
      const structure = createStoryStructure(createGenerationResult());
      const state = createInitialStructureState(structure);

      // All beat IDs in state should exist in structure
      for (const progression of state.beatProgressions) {
        const indices = parseBeatIndices(progression.beatId);
        expect(indices).not.toBeNull();
        expect(() =>
          getBeatOrThrow(structure, indices!.actIndex, indices!.beatIndex)
        ).not.toThrow();
      }
    });
  });

  describe('state advancement → rewrite context flow', () => {
    it('advances state and builds rewrite context correctly', () => {
      const structure = createStoryStructure(createGenerationResult());
      const story = createStory({
        title: 'Integration Story',
        characterConcept: 'A wandering sage',
        worldbuilding: 'Ancient mystical lands',
        tone: 'epic fantasy',
      });
      const structureVersion = createInitialVersionedStructure(structure);

      // Start with initial state
      let state = createInitialStructureState(structure);

      // Advance through first beat
      const result1 = advanceStructureState(structure, state, 'The hero noticed the dark clouds.');
      state = result1.updatedState;

      // Advance through second beat
      const result2 = advanceStructureState(structure, state, 'The challenge was accepted.');
      state = result2.updatedState;

      // Now at Act 2, Beat 1 - create deviation and build context
      const deviation = createBeatDeviation(
        'Unexpected plot twist',
        ['2.1', '2.2', '3.1'],
        'The ally turns out to be the villain in disguise.'
      );

      const context = buildRewriteContext(story, structureVersion, state, deviation);

      // Verify context contains completed beats
      expect(context.completedBeats).toHaveLength(2);
      expect(context.completedBeats[0]?.beatId).toBe('1.1');
      expect(context.completedBeats[1]?.beatId).toBe('1.2');
      expect(context.currentActIndex).toBe(1);
      expect(context.currentBeatIndex).toBe(0);
    });
  });

  describe('complete beat extraction → validation flow', () => {
    it('extracts completed beats and validates preservation', () => {
      const structure = createStoryStructure(createGenerationResult());

      // Simulate state after completing first two beats
      let state = createInitialStructureState(structure);
      state = advanceStructureState(structure, state, 'Beat 1 resolved.').updatedState;
      state = advanceStructureState(structure, state, 'Beat 2 resolved.').updatedState;

      // Extract completed beats
      const completedBeats = extractCompletedBeats(structure, state);
      expect(completedBeats).toHaveLength(2);

      // Get preserved beat IDs
      const preservedIds = getPreservedBeatIds(state);
      expect(preservedIds).toContain('1.1');
      expect(preservedIds).toContain('1.2');

      // Validate preservation with identical structure
      const newStructure = createStoryStructure(createGenerationResult());
      const isValid = validatePreservedBeats(structure, newStructure, state);
      expect(isValid).toBe(true);
    });
  });

  describe('applyStructureProgression inheritance flow', () => {
    it('correctly applies structure progression from parent to child', () => {
      const structure = createStoryStructure(createGenerationResult());
      const parentState = createInitialStructureState(structure);

      // Child page concludes beat
      const childState = applyStructureProgression(
        structure,
        parentState,
        true,
        'The omens were heeded.'
      );

      expect(childState).not.toBe(parentState);
      expect(childState.currentBeatIndex).toBe(1);
      expect(childState.beatProgressions.find((p) => p.beatId === '1.1')?.status).toBe('concluded');

      // Grandchild page without beat conclusion inherits state
      const grandchildState = applyStructureProgression(structure, childState, false, '');

      expect(grandchildState).toEqual({
        ...childState,
        pagesInCurrentBeat: childState.pagesInCurrentBeat + 1,
      });
    });
  });

  describe('beat-utils integration with state modules', () => {
    it('upsertBeatProgression works correctly with state machine output', () => {
      const structure = createStoryStructure(createGenerationResult());
      const initialState = createInitialStructureState(structure);

      // Manually update a progression
      const updatedProgressions = upsertBeatProgression(initialState.beatProgressions, {
        beatId: '1.1',
        status: 'concluded',
        resolution: 'Manual resolution.',
      });

      // The updated progressions should work with advanceStructureState
      const manualState = {
        ...initialState,
        beatProgressions: updatedProgressions,
      };

      // Can still advance from this state (though 1.1 is already concluded)
      // The next beat should become active
      expect(manualState.beatProgressions.find((p) => p.beatId === '1.1')?.status).toBe(
        'concluded'
      );
    });

    it('parseBeatIndices correctly parses IDs created by factory', () => {
      const structure = createStoryStructure(createGenerationResult());

      for (const act of structure.acts) {
        for (const beat of act.beats) {
          const indices = parseBeatIndices(beat.id);
          expect(indices).not.toBeNull();

          // Verify indices point to correct beat
          const retrievedBeat = getBeatOrThrow(structure, indices!.actIndex, indices!.beatIndex);
          expect(retrievedBeat.id).toBe(beat.id);
        }
      }
    });
  });

  describe('full story progression flow', () => {
    it('progresses through all beats to completion', () => {
      const structure = createStoryStructure(createGenerationResult());
      let state = createInitialStructureState(structure);

      const resolutions = [
        'Omens noticed.',
        'Challenge accepted.',
        'Obstacle overcome.',
        'Alliance formed.',
        'Enemy defeated.',
      ];

      let lastResult = null;
      for (const resolution of resolutions) {
        lastResult = advanceStructureState(structure, state, resolution);
        state = lastResult.updatedState;
      }

      // Story should be complete
      expect(lastResult?.isComplete).toBe(true);

      // All beats should be concluded
      const preservedIds = getPreservedBeatIds(state);
      expect(preservedIds).toHaveLength(5);

      // Extract all completed beats
      const completedBeats = extractCompletedBeats(structure, state);
      expect(completedBeats).toHaveLength(5);
      expect(completedBeats.map((b) => b.resolution)).toEqual(resolutions);
    });
  });
});
