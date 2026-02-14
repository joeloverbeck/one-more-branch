import { buildContinuationContext, buildRemovableIds } from '@/engine/continuation-context-builder';
import type { CollectedParentState } from '@/engine/parent-state-collector';
import type { AncestorContext } from '@/engine/ancestor-collector';
import {
  createChoice,
  createEmptyAccumulatedStructureState,
  createEmptyActiveState,
  createPage,
  parsePageId,
  Story,
} from '@/models';
import type { VersionedStoryStructure } from '@/models';
import { PromiseType, Urgency } from '@/models/state';

function makeStory(overrides: Partial<Story> = {}): Story {
  return {
    id: 'story-1',
    title: 'Test Story',
    characterConcept: 'A brave warrior',
    worldbuilding: 'Medieval fantasy realm',
    tone: 'dark',
    npcs: [{ name: 'Guide', description: 'A helpful guide' }],
    startingSituation: 'You awaken in a dungeon.',
    globalCanon: ['The king is dead'],
    globalCharacterCanon: { Guide: ['Knows the way'] },
    structure: null,
    structureVersions: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeParentState(overrides: Partial<CollectedParentState> = {}): CollectedParentState {
  return {
    accumulatedActiveState: {
      ...createEmptyActiveState(),
      currentLocation: 'Dungeon',
      activeThreats: [{ id: 'th-1', text: 'Goblin patrol' }],
      activeConstraints: [{ id: 'cn-1', text: 'Locked door' }],
      openThreads: [
        {
          id: 'tw-1',
          text: 'Find exit',
          threadType: 'QUEST',
          urgency: 'HIGH',
          displayLabel: 'Find exit',
        },
      ],
    },
    accumulatedInventory: [{ id: 'inv-1', text: 'Torch' }],
    accumulatedHealth: [{ id: 'hp-1', text: 'Minor wound' }],
    accumulatedCharacterState: {
      Guide: [{ id: 'cs-1', text: 'Nervous' }],
    },
    structureState: createEmptyAccumulatedStructureState(),
    ...overrides,
  };
}

function makeAncestorContext(overrides: Partial<AncestorContext> = {}): AncestorContext {
  return {
    parentNarrative: 'Parent narrative text',
    grandparentNarrative: 'Grandparent narrative text',
    ancestorSummaries: [{ pageId: parsePageId(1), summary: 'Summary of page 1' }],
    momentumTrajectory: [],
    ...overrides,
  };
}

describe('continuation-context-builder', () => {
  describe('buildContinuationContext', () => {
    it('assembles all story and state fields into ContinuationContext', () => {
      const story = makeStory();
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You see a corridor.',
        sceneSummary: 'The corridor stretches ahead.',
        choices: [createChoice('Go left'), createChoice('Go right')],
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
      });
      const parentState = makeParentState();
      const ancestorContext = makeAncestorContext();

      const result = buildContinuationContext(
        story,
        parentPage,
        'Go left',
        parentState,
        ancestorContext,
        null,
        { suggestedSpeech: 'I demand you release me!' }
      );

      expect(result.characterConcept).toBe('A brave warrior');
      expect(result.worldbuilding).toBe('Medieval fantasy realm');
      expect(result.tone).toBe('dark');
      expect(result.npcs).toEqual(story.npcs);
      expect(result.globalCanon).toEqual(['The king is dead']);
      expect(result.globalCharacterCanon).toEqual({ Guide: ['Knows the way'] });
      expect(result.previousNarrative).toBe('You see a corridor.');
      expect(result.selectedChoice).toBe('Go left');
      expect(result.protagonistGuidance).toEqual({
        suggestedSpeech: 'I demand you release me!',
      });
      expect(result.accumulatedInventory).toEqual([{ id: 'inv-1', text: 'Torch' }]);
      expect(result.accumulatedHealth).toEqual([{ id: 'hp-1', text: 'Minor wound' }]);
      expect(result.accumulatedCharacterState).toEqual({
        Guide: [{ id: 'cs-1', text: 'Nervous' }],
      });
      expect(result.activeState).toBe(parentState.accumulatedActiveState);
      expect(result.grandparentNarrative).toBe('Grandparent narrative text');
      expect(result.ancestorSummaries).toEqual(ancestorContext.ancestorSummaries);
      expect(result.parentProtagonistAffect).toBe(parentPage.protagonistAffect);
      expect(result.accumulatedPromises).toEqual(parentPage.accumulatedPromises);
      expect(result.parentThreadPayoffAssessments).toEqual([]);
    });

    it('uses structure from version when available', () => {
      const story = makeStory();
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'Test.',
        sceneSummary: 'Test.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
      });
      const versionStructure = {
        theme: 'test',
        acts: [],
        pacingBudget: { minPages: 5, maxPages: 20 },
      };
      const structureVersion: VersionedStoryStructure = {
        id: 'sv-1',
        structure: versionStructure,
        createdAtPageId: parsePageId(1),
        reason: 'initial',
      };

      const result = buildContinuationContext(
        story,
        parentPage,
        'A',
        makeParentState(),
        makeAncestorContext(),
        structureVersion
      );

      expect(result.structure).toBe(versionStructure);
    });

    it('falls back to story.structure when no version', () => {
      const storyStructure = {
        theme: 'story-level',
        acts: [],
        pacingBudget: { minPages: 3, maxPages: 10 },
      };
      const story = makeStory({ structure: storyStructure });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'Test.',
        sceneSummary: 'Test.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
      });

      const result = buildContinuationContext(
        story,
        parentPage,
        'A',
        makeParentState(),
        makeAncestorContext(),
        null
      );

      expect(result.structure).toBe(storyStructure);
    });

    it('omits protagonistGuidance when undefined', () => {
      const story = makeStory();
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'Test.',
        sceneSummary: 'Test.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
      });

      const result = buildContinuationContext(
        story,
        parentPage,
        'A',
        makeParentState(),
        makeAncestorContext(),
        null
      );

      expect(result.protagonistGuidance).toBeUndefined();
    });

    it('preserves parent accumulatedPromises when present', () => {
      const story = makeStory();
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'A glint catches your eye beneath the rubble.',
        sceneSummary: 'The scene introduces a suspiciously polished locket.',
        choices: [createChoice('Take the locket'), createChoice('Leave it buried')],
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        accumulatedPromises: [
          {
            id: 'pr-1',
            description: 'The silver locket feels narratively significant.',
            promiseType: PromiseType.CHEKHOV_GUN,
            suggestedUrgency: Urgency.MEDIUM,
            age: 2,
          },
        ],
      });

      const result = buildContinuationContext(
        story,
        parentPage,
        'Take the locket',
        makeParentState(),
        makeAncestorContext(),
        null
      );

      expect(result.accumulatedPromises).toEqual(parentPage.accumulatedPromises);
      expect(result.accumulatedPromises).toHaveLength(1);
      expect(result.accumulatedPromises[0]?.id).toBe('pr-1');
    });
  });

  describe('buildRemovableIds', () => {
    it('extracts all keyed IDs from parent state', () => {
      const parentState = makeParentState();

      const removableIds = buildRemovableIds(parentState);

      expect(removableIds.threats).toEqual(['th-1']);
      expect(removableIds.constraints).toEqual(['cn-1']);
      expect(removableIds.threads).toEqual(['tw-1']);
      expect(removableIds.inventory).toEqual(['inv-1']);
      expect(removableIds.health).toEqual(['hp-1']);
      expect(removableIds.characterState).toEqual(['cs-1']);
    });

    it('returns empty arrays when parent state has no entries', () => {
      const emptyState: CollectedParentState = {
        accumulatedActiveState: createEmptyActiveState(),
        accumulatedInventory: [],
        accumulatedHealth: [],
        accumulatedCharacterState: {},
        structureState: createEmptyAccumulatedStructureState(),
      };

      const removableIds = buildRemovableIds(emptyState);

      expect(removableIds.threats).toEqual([]);
      expect(removableIds.constraints).toEqual([]);
      expect(removableIds.threads).toEqual([]);
      expect(removableIds.inventory).toEqual([]);
      expect(removableIds.health).toEqual([]);
      expect(removableIds.characterState).toEqual([]);
    });

    it('flattens character state IDs across multiple characters', () => {
      const parentState = makeParentState({
        accumulatedCharacterState: {
          Guard: [
            { id: 'cs-1', text: 'Alert' },
            { id: 'cs-2', text: 'Armed' },
          ],
          Merchant: [{ id: 'cs-3', text: 'Friendly' }],
        },
      });

      const removableIds = buildRemovableIds(parentState);

      expect(removableIds.characterState).toEqual(['cs-1', 'cs-2', 'cs-3']);
    });
  });
});
