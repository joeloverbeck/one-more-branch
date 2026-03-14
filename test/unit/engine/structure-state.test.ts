import { createStoryStructure } from '../../../src/engine/structure-factory';
import {
  advanceStructureState,
  advanceWithMilestoneSkip,
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
    openingImage: 'An opening image placeholder.',
    closingImage: 'A closing image placeholder.',
    pacingBudget: { targetPagesMin: 15, targetPagesMax: 40 },
    acts: [
      {
        name: 'Act One',
        objective: 'Accept the quest',
        stakes: 'Home is at risk',
        entryCondition: 'A messenger arrives',
        milestones: [
          {
            name: 'Messenger arrives',
            description: 'A warning arrives',
            objective: 'Hear the warning',
            causalLink: 'Establishes the threat that forces the protagonist to choose.',
            role: 'setup',
          },
          {
            name: 'Choose departure',
            description: 'A difficult choice',
            objective: 'Leave home',
            causalLink: 'Responds to the warning by committing to action.',
            role: 'turning_point',
          },
        ],
      },
      {
        name: 'Act Two',
        objective: 'Survive the campaign',
        stakes: 'The kingdom may fall',
        entryCondition: 'The journey begins',
        milestones: [
          {
            name: 'First setback',
            description: 'First major setback',
            objective: 'Recover from loss',
            causalLink: 'Complicates the departure choice with immediate consequences.',
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
    it('creates first milestone as active and all remaining milestones as pending', () => {
      const structure = createStructure();
      const state = createInitialStructureState(structure);

      expect(state.currentActIndex).toBe(0);
      expect(state.currentMilestoneIndex).toBe(0);
      expect(state.milestoneProgressions).toHaveLength(3);
      expect(state.milestoneProgressions[0]).toEqual({ milestoneId: '1.1', status: 'active' });
      expect(state.milestoneProgressions[1]).toEqual({ milestoneId: '1.2', status: 'pending' });
      expect(state.milestoneProgressions[2]).toEqual({ milestoneId: '2.1', status: 'pending' });
    });
  });

  describe('advanceStructureState', () => {
    it('advances to the next milestone in the same act', () => {
      const structure = createStructure();
      const state = createInitialStructureState(structure);

      const result = advanceStructureState(structure, state, 'The hero agrees to leave.');

      expect(result.actAdvanced).toBe(false);
      expect(result.milestoneAdvanced).toBe(true);
      expect(result.isComplete).toBe(false);
      expect(result.updatedState.currentActIndex).toBe(0);
      expect(result.updatedState.currentMilestoneIndex).toBe(1);
      expect(result.updatedState.milestoneProgressions).toContainEqual({
        milestoneId: '1.1',
        status: 'concluded',
        resolution: 'The hero agrees to leave.',
      });
      expect(result.updatedState.milestoneProgressions).toContainEqual({
        milestoneId: '1.2',
        status: 'active',
      });
    });

    it('advances to the next act when the last milestone of current act concludes', () => {
      const structure = createStructure();
      const currentState: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 1,
        milestoneProgressions: [
          { milestoneId: '1.1', status: 'concluded', resolution: 'He heard the warning.' },
          { milestoneId: '1.2', status: 'active' },
          { milestoneId: '2.1', status: 'pending' },
        ],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      const result = advanceStructureState(structure, currentState, 'The hero leaves home.');

      expect(result.actAdvanced).toBe(true);
      expect(result.milestoneAdvanced).toBe(true);
      expect(result.isComplete).toBe(false);
      expect(result.updatedState.currentActIndex).toBe(1);
      expect(result.updatedState.currentMilestoneIndex).toBe(0);
      expect(result.updatedState.milestoneProgressions).toContainEqual({
        milestoneId: '1.2',
        status: 'concluded',
        resolution: 'The hero leaves home.',
      });
      expect(result.updatedState.milestoneProgressions).toContainEqual({
        milestoneId: '2.1',
        status: 'active',
      });
    });

    it('marks the story complete when the last milestone of the last act concludes', () => {
      const structure = createStructure();
      const currentState: AccumulatedStructureState = {
        currentActIndex: 1,
        currentMilestoneIndex: 0,
        milestoneProgressions: [
          { milestoneId: '1.1', status: 'concluded', resolution: 'He heard the warning.' },
          { milestoneId: '1.2', status: 'concluded', resolution: 'He left home.' },
          { milestoneId: '2.1', status: 'active' },
        ],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      const result = advanceStructureState(
        structure,
        currentState,
        'The hero recovers and rallies.'
      );

      expect(result.isComplete).toBe(true);
      expect(result.actAdvanced).toBe(false);
      expect(result.milestoneAdvanced).toBe(false);
      expect(result.updatedState.currentActIndex).toBe(1);
      expect(result.updatedState.currentMilestoneIndex).toBe(0);
      expect(result.updatedState.milestoneProgressions).toContainEqual({
        milestoneId: '2.1',
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
      expect(result.updatedState.milestoneProgressions).not.toBe(currentState.milestoneProgressions);
      expect(currentState).toEqual(before);
    });

    it('throws for empty milestone resolution', () => {
      const structure = createStructure();
      const state = createInitialStructureState(structure);

      expect(() => advanceStructureState(structure, state, '')).toThrow(
        'Cannot advance structure without a non-empty milestone resolution'
      );
    });

    it('throws for whitespace-only milestone resolution', () => {
      const structure = createStructure();
      const state = createInitialStructureState(structure);

      expect(() => advanceStructureState(structure, state, '   ')).toThrow(
        'Cannot advance structure without a non-empty milestone resolution'
      );
    });
  });

  describe('applyStructureProgression', () => {
    it('increments pagesInCurrentMilestone when milestoneConcluded is false', () => {
      const structure = createStructure();
      const parentState = createInitialStructureState(structure);

      const result = applyStructureProgression(structure, parentState, false, '');

      expect(result).not.toBe(parentState);
      expect(result).toEqual({
        ...parentState,
        pagesInCurrentMilestone: parentState.pagesInCurrentMilestone + 1,
      });
    });

    it('advances state with resolution when milestoneConcluded is true', () => {
      const structure = createStructure();
      const parentState = createInitialStructureState(structure);

      const result = applyStructureProgression(
        structure,
        parentState,
        true,
        'The warning is accepted.'
      );

      expect(result.currentActIndex).toBe(0);
      expect(result.currentMilestoneIndex).toBe(1);
      expect(result.milestoneProgressions).toContainEqual({
        milestoneId: '1.1',
        status: 'concluded',
        resolution: 'The warning is accepted.',
      });
    });

    it('throws when milestoneConcluded is true and milestoneResolution is blank', () => {
      const structure = createStructure();
      const parentState = createInitialStructureState(structure);

      expect(() => applyStructureProgression(structure, parentState, true, '   ')).toThrow(
        'Cannot advance structure without a non-empty milestone resolution'
      );
    });

    it('accumulates pagesInCurrentMilestone across successive non-concluded progressions', () => {
      const structure = createStructure();
      const initial = createInitialStructureState(structure);

      const page1 = applyStructureProgression(structure, initial, false, '');
      const page2 = applyStructureProgression(structure, page1, false, '');
      const page3 = applyStructureProgression(structure, page2, false, '');

      expect(initial.pagesInCurrentMilestone).toBe(0);
      expect(page1.pagesInCurrentMilestone).toBe(1);
      expect(page2.pagesInCurrentMilestone).toBe(2);
      expect(page3.pagesInCurrentMilestone).toBe(3);
    });

    it('resets pagesInCurrentMilestone to 0 when milestone is concluded', () => {
      const structure = createStructure();
      const initial = createInitialStructureState(structure);

      const page1 = applyStructureProgression(structure, initial, false, '');
      const page2 = applyStructureProgression(structure, page1, false, '');
      expect(page2.pagesInCurrentMilestone).toBe(2);

      const advanced = applyStructureProgression(structure, page2, true, 'Milestone resolved.');
      expect(advanced.pagesInCurrentMilestone).toBe(0);
    });

    it('initializes pacingNudge as null and resets on milestone advancement', () => {
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

      expect(parentState.pagesInCurrentMilestone).toBe(0);
      expect(branchA.pagesInCurrentMilestone).toBe(1);
      expect(branchB.pagesInCurrentMilestone).toBe(1);
      expect(branchA).not.toBe(branchB);
      expect(branchA).toEqual(branchB);
    });
  });

  describe('createInitialStructureState paging fields', () => {
    it('starts with pagesInCurrentMilestone 0 and pacingNudge null', () => {
      const structure = createStructure();
      const state = createInitialStructureState(structure);

      expect(state.pagesInCurrentMilestone).toBe(0);
      expect(state.pacingNudge).toBeNull();
    });
  });

  describe('advanceWithMilestoneSkip', () => {
    function createMultiBeatStructure(): StoryStructure {
      return createStoryStructure({
        overallTheme: 'Epic journey',
        premise: 'A hero crosses many thresholds.',
        openingImage: 'An opening image placeholder.',
        closingImage: 'A closing image placeholder.',
        pacingBudget: { targetPagesMin: 20, targetPagesMax: 50 },
        acts: [
          {
            name: 'Act One',
            objective: 'Begin journey',
            stakes: 'Miss the chance',
            entryCondition: 'Call arrives',
            milestones: [
              {
                name: 'Call',
                description: 'Hear the call',
                objective: 'Hear it',
                causalLink: 'Introduces the inciting pressure to act.',
                role: 'setup',
              },
              {
                name: 'Prep',
                description: 'Prepare',
                objective: 'Gather supplies',
                causalLink: 'Accepting the call triggers preparation requirements.',
                role: 'escalation',
              },
              {
                name: 'Depart',
                description: 'Leave home',
                objective: 'Cross threshold',
                causalLink: 'Preparation enables departure from the ordinary world.',
                role: 'turning_point',
              },
              {
                name: 'First trial',
                description: 'Face trial',
                objective: 'Survive trial',
                causalLink: 'Departure leads directly into external tests.',
                role: 'escalation',
              },
            ],
          },
          {
            name: 'Act Two',
            objective: 'Survive',
            stakes: 'Kingdom falls',
            entryCondition: 'Enter the wilds',
            milestones: [
              {
                name: 'Ally',
                description: 'Meet ally',
                objective: 'Gain trust',
                causalLink: 'Surviving trials requires partnership.',
                role: 'setup',
              },
              {
                name: 'Betrayal',
                description: 'Betrayal',
                objective: 'Survive betrayal',
                causalLink: 'Trust in the new ally creates vulnerability to betrayal.',
                role: 'turning_point',
              },
            ],
          },
        ],
        rawResponse: '{}',
      });
    }

    it('skips intermediate milestones to reach the target milestone within the same act', () => {
      const structure = createMultiBeatStructure();
      const state = createInitialStructureState(structure);

      // At milestone 1.1, skip to milestone 1.4
      const result = advanceWithMilestoneSkip(
        structure,
        state,
        'Call answered.',
        '1.4',
        'Implicitly resolved by narrative advancement'
      );

      expect(result.isComplete).toBe(false);
      expect(result.updatedState.currentActIndex).toBe(0);
      expect(result.updatedState.currentMilestoneIndex).toBe(3);
      expect(result.updatedState.milestoneProgressions).toContainEqual({
        milestoneId: '1.1',
        status: 'concluded',
        resolution: 'Call answered.',
      });
      expect(result.updatedState.milestoneProgressions).toContainEqual({
        milestoneId: '1.2',
        status: 'concluded',
        resolution: 'Implicitly resolved by narrative advancement',
      });
      expect(result.updatedState.milestoneProgressions).toContainEqual({
        milestoneId: '1.3',
        status: 'concluded',
        resolution: 'Implicitly resolved by narrative advancement',
      });
      expect(result.updatedState.milestoneProgressions).toContainEqual({
        milestoneId: '1.4',
        status: 'active',
      });
      expect(result.milestoneAdvanced).toBe(true);
      expect(result.actAdvanced).toBe(false);
    });

    it('skips across act boundaries to reach a target in a later act', () => {
      const structure = createMultiBeatStructure();
      const state = createInitialStructureState(structure);

      // At milestone 1.1, skip to milestone 2.1
      const result = advanceWithMilestoneSkip(
        structure,
        state,
        'Call answered.',
        '2.1',
        'Bridged'
      );

      expect(result.isComplete).toBe(false);
      expect(result.updatedState.currentActIndex).toBe(1);
      expect(result.updatedState.currentMilestoneIndex).toBe(0);
      expect(result.actAdvanced).toBe(true);
      expect(result.milestoneAdvanced).toBe(true);
    });

    it('returns complete when the target is the last milestone and it gets concluded along the way', () => {
      const structure = createMultiBeatStructure();
      // Start at milestone 2.1 (last act, first milestone)
      const state: AccumulatedStructureState = {
        currentActIndex: 1,
        currentMilestoneIndex: 0,
        milestoneProgressions: [
          { milestoneId: '1.1', status: 'concluded', resolution: 'Done.' },
          { milestoneId: '1.2', status: 'concluded', resolution: 'Done.' },
          { milestoneId: '1.3', status: 'concluded', resolution: 'Done.' },
          { milestoneId: '1.4', status: 'concluded', resolution: 'Done.' },
          { milestoneId: '2.1', status: 'active' },
          { milestoneId: '2.2', status: 'pending' },
        ],
        pagesInCurrentMilestone: 2,
        pacingNudge: null,
      };

      // Skip from 2.1 past 2.2 — since 2.2 is the last milestone, this triggers completion
      const result = advanceWithMilestoneSkip(
        structure,
        state,
        'Trust gained.',
        '2.2',
        'Bridged'
      );

      // Should land on 2.2 as active (not complete, since target reached)
      expect(result.updatedState.currentActIndex).toBe(1);
      expect(result.updatedState.currentMilestoneIndex).toBe(1);
      expect(result.isComplete).toBe(false);
    });

    it('falls back to normal advancement for invalid milestone ID format', () => {
      const structure = createMultiBeatStructure();
      const state = createInitialStructureState(structure);

      const result = advanceWithMilestoneSkip(
        structure,
        state,
        'Call answered.',
        'invalid',
        'Bridged'
      );

      // Should just do a normal single advance
      expect(result.updatedState.currentMilestoneIndex).toBe(1);
      expect(result.milestoneAdvanced).toBe(true);
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
        'Milestone resolved.',
        undefined
      );

      expect(result.currentMilestoneIndex).toBe(1);
    });

    it('uses milestone skip when alignmentSkip is provided', () => {
      const multiStructure = createStoryStructure({
        overallTheme: 'Journey',
        premise: 'A hero.',
        openingImage: 'An opening image placeholder.',
        closingImage: 'A closing image placeholder.',
        pacingBudget: { targetPagesMin: 10, targetPagesMax: 30 },
        acts: [
          {
            name: 'Act One',
            objective: 'Begin',
            stakes: 'Fail',
            entryCondition: 'Start',
            milestones: [
              {
                name: 'B1',
                description: 'First',
                objective: 'Start',
                causalLink: 'Establishes initial action.',
                role: 'setup',
              },
              {
                name: 'B2',
                description: 'Second',
                objective: 'Middle',
                causalLink: 'Initial action escalates into a harder challenge.',
                role: 'escalation',
              },
              {
                name: 'B3',
                description: 'Third',
                objective: 'End',
                causalLink: 'Escalation demands a definitive turning decision.',
                role: 'turning_point',
              },
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
        'First milestone resolved.',
        { targetMilestoneId: '1.3', bridgedResolution: 'Skipped' }
      );

      expect(result.currentMilestoneIndex).toBe(2);
      expect(result.milestoneProgressions).toContainEqual({
        milestoneId: '1.2',
        status: 'concluded',
        resolution: 'Skipped',
      });
    });
  });

  describe('advanceStructureState paging fields', () => {
    it('resets pagesInCurrentMilestone and pacingNudge on normal advancement', () => {
      const structure = createStructure();
      const state = createInitialStructureState(structure);

      const result = advanceStructureState(structure, state, 'The hero agrees.');

      expect(result.updatedState.pagesInCurrentMilestone).toBe(0);
      expect(result.updatedState.pacingNudge).toBeNull();
    });

    it('resets pagesInCurrentMilestone and pacingNudge on story completion', () => {
      const structure = createStructure();
      const currentState: AccumulatedStructureState = {
        currentActIndex: 1,
        currentMilestoneIndex: 0,
        milestoneProgressions: [
          { milestoneId: '1.1', status: 'concluded', resolution: 'Done.' },
          { milestoneId: '1.2', status: 'concluded', resolution: 'Done.' },
          { milestoneId: '2.1', status: 'active' },
        ],
        pagesInCurrentMilestone: 5,
        pacingNudge: null,
      };

      const result = advanceStructureState(structure, currentState, 'Final resolution.');

      expect(result.isComplete).toBe(true);
      expect(result.updatedState.pagesInCurrentMilestone).toBe(0);
      expect(result.updatedState.pacingNudge).toBeNull();
    });
  });
});
