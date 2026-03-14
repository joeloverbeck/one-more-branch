/**
 * Integration tests for structure module boundaries.
 * Verifies that the refactored modules work correctly together.
 */
import { createStoryStructure } from '../../../src/engine/structure-factory';
import {
  buildRewriteContext,
  extractCompletedBeats,
  getPreservedMilestoneIds,
  validatePreservedBeats,
} from '../../../src/engine/structure-rewrite-support';
import {
  advanceStructureState,
  applyStructureProgression,
} from '../../../src/engine/structure-state';
import {
  getMilestoneOrThrow,
  parseMilestoneIndices,
  upsertMilestoneProgression,
} from '../../../src/engine/milestone-utils';
import type { StructureGenerationResult } from '../../../src/engine/structure-types';
import { createStory } from '../../../src/models/story';
import { createInitialVersionedStructure } from '../../../src/models/structure-version';
import { createMilestoneDeviation, createInitialStructureState } from '../../../src/models/story-arc';

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
        milestones: [
          {
            name: 'Omen in the valley',
            description: 'Strange omens appear',
            objective: 'Notice the signs',
            causalLink: 'Because of prior events.',
            role: 'setup',
          },
          {
            name: 'Challenge declared',
            description: 'A challenge is issued',
            objective: 'Accept or reject',
            causalLink: 'Because of prior events.',
            role: 'turning_point',
          },
        ],
      },
      {
        name: 'The Journey',
        objective: 'Reach the destination',
        stakes: 'Running out of time',
        entryCondition: 'Hero departs',
        milestones: [
          {
            name: 'Broken pass',
            description: 'First obstacle',
            objective: 'Overcome the barrier',
            causalLink: 'Because of prior events.',
            role: 'escalation',
          },
          {
            name: 'Uneasy ally',
            description: 'Unexpected ally',
            objective: 'Form alliance',
            causalLink: 'Because of prior events.',
            role: 'turning_point',
          },
        ],
      },
      {
        name: 'The Climax',
        objective: 'Confront the threat',
        stakes: 'Everything at risk',
        entryCondition: 'Final confrontation',
        milestones: [
          {
            name: 'Final battle',
            description: 'Final battle',
            objective: 'Defeat the enemy',
            causalLink: 'Because of prior events.',
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
      expect(state.currentMilestoneIndex).toBe(0);
      expect(state.milestoneProgressions).toHaveLength(5); // 2 + 2 + 1 milestones
      expect(state.milestoneProgressions[0]?.status).toBe('active');
      expect(state.milestoneProgressions[1]?.status).toBe('pending');
    });

    it('milestone IDs match between factory and state', () => {
      const structure = createStoryStructure(createGenerationResult());
      const state = createInitialStructureState(structure);

      // All milestone IDs in state should exist in structure
      for (const progression of state.milestoneProgressions) {
        const indices = parseMilestoneIndices(progression.milestoneId);
        expect(indices).not.toBeNull();
        expect(() =>
          getMilestoneOrThrow(structure, indices!.actIndex, indices!.milestoneIndex)
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

      // Advance through first milestone
      const result1 = advanceStructureState(structure, state, 'The hero noticed the dark clouds.');
      state = result1.updatedState;

      // Advance through second milestone
      const result2 = advanceStructureState(structure, state, 'The challenge was accepted.');
      state = result2.updatedState;

      // Now at Act 2, Milestone 1 - create deviation and build context
      const deviation = createMilestoneDeviation(
        'Unexpected plot twist',
        ['2.1', '2.2', '3.1'],
        'The ally turns out to be the villain in disguise.'
      );

      const context = buildRewriteContext(story, structureVersion, state, deviation);

      // Verify context contains completed milestones
      expect(context.completedBeats).toHaveLength(2);
      expect(context.completedBeats[0]?.milestoneId).toBe('1.1');
      expect(context.completedBeats[1]?.milestoneId).toBe('1.2');
      expect(context.currentActIndex).toBe(1);
      expect(context.currentMilestoneIndex).toBe(0);
    });
  });

  describe('complete milestone extraction → validation flow', () => {
    it('extracts completed milestones and validates preservation', () => {
      const structure = createStoryStructure(createGenerationResult());

      // Simulate state after completing first two milestones
      let state = createInitialStructureState(structure);
      state = advanceStructureState(structure, state, 'Milestone 1 resolved.').updatedState;
      state = advanceStructureState(structure, state, 'Milestone 2 resolved.').updatedState;

      // Extract completed milestones
      const completedBeats = extractCompletedBeats(structure, state);
      expect(completedBeats).toHaveLength(2);

      // Get preserved milestone IDs
      const preservedIds = getPreservedMilestoneIds(state);
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

      // Child page concludes milestone
      const childState = applyStructureProgression(
        structure,
        parentState,
        true,
        'The omens were heeded.'
      );

      expect(childState).not.toBe(parentState);
      expect(childState.currentMilestoneIndex).toBe(1);
      expect(childState.milestoneProgressions.find((p) => p.milestoneId === '1.1')?.status).toBe('concluded');

      // Grandchild page without milestone conclusion inherits state
      const grandchildState = applyStructureProgression(structure, childState, false, '');

      expect(grandchildState).toEqual({
        ...childState,
        pagesInCurrentMilestone: childState.pagesInCurrentMilestone + 1,
      });
    });
  });

  describe('milestone-utils integration with state modules', () => {
    it('upsertMilestoneProgression works correctly with state machine output', () => {
      const structure = createStoryStructure(createGenerationResult());
      const initialState = createInitialStructureState(structure);

      // Manually update a progression
      const updatedProgressions = upsertMilestoneProgression(initialState.milestoneProgressions, {
        milestoneId: '1.1',
        status: 'concluded',
        resolution: 'Manual resolution.',
      });

      // The updated progressions should work with advanceStructureState
      const manualState = {
        ...initialState,
        milestoneProgressions: updatedProgressions,
      };

      // Can still advance from this state (though 1.1 is already concluded)
      // The next milestone should become active
      expect(manualState.milestoneProgressions.find((p) => p.milestoneId === '1.1')?.status).toBe(
        'concluded'
      );
    });

    it('parseMilestoneIndices correctly parses IDs created by factory', () => {
      const structure = createStoryStructure(createGenerationResult());

      for (const act of structure.acts) {
        for (const milestone of act.milestones) {
          const indices = parseMilestoneIndices(milestone.id);
          expect(indices).not.toBeNull();

          // Verify indices point to correct milestone
          const retrievedBeat = getMilestoneOrThrow(structure, indices!.actIndex, indices!.milestoneIndex);
          expect(retrievedBeat.id).toBe(milestone.id);
        }
      }
    });
  });

  describe('full story progression flow', () => {
    it('progresses through all milestones to completion', () => {
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

      // All milestones should be concluded
      const preservedIds = getPreservedMilestoneIds(state);
      expect(preservedIds).toHaveLength(5);

      // Extract all completed milestones
      const completedBeats = extractCompletedBeats(structure, state);
      expect(completedBeats).toHaveLength(5);
      expect(completedBeats.map((b) => b.resolution)).toEqual(resolutions);
    });
  });
});
