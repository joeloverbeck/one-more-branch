import {
  createEmptyAccumulatedStructureState,
  parsePageId,
  StructureVersionId,
} from '@/models';
import type { FinalPageGenerationResult } from '@/llm/types';
import {
  buildFirstPage,
  buildContinuationPage,
  createEmptyStructureContext,
  FirstPageBuildContext,
  ContinuationPageBuildContext,
} from '@/engine/page-builder';

function buildMockGenerationResult(
  overrides?: Partial<FinalPageGenerationResult>,
): FinalPageGenerationResult {
  return {
    narrative: 'You step into the shadowed corridor.',
    choices: [
      { text: 'Go left', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
      { text: 'Go right', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
    ],
    currentLocation: 'Shadowed corridor',
    threatsAdded: [],
    threatsRemoved: [],
    constraintsAdded: [],
    constraintsRemoved: [],
    threadsAdded: [],
    threadsResolved: [],
    newCanonFacts: ['The corridor echoes with distant footsteps'],
    newCharacterCanonFacts: {},
    inventoryAdded: ['Rusty key'],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    characterStateChangesAdded: [],
    characterStateChangesRemoved: [],
    protagonistAffect: {
      primaryEmotion: 'curiosity',
      primaryIntensity: 'moderate',
      primaryCause: 'Exploring the unknown corridor',
      secondaryEmotions: [],
      dominantMotivation: 'Discover what lies ahead',
    },
    isEnding: false,
    sceneSummary: 'Test summary of the scene events and consequences.',
    rawResponse: 'raw-response',
    reconciliationDiagnostics: [],
    ...overrides,
  };
}

describe('page-builder', () => {
  describe('buildFirstPage', () => {
    it('creates first page with keyed accumulated state', () => {
      const result = buildMockGenerationResult({
        currentLocation: 'Ancient treasury',
        threatsAdded: ['Guardian awakened'],
        constraintsAdded: ['Must remain silent'],
        threadsAdded: [{ text: 'Mystery of the vault', threadType: 'MYSTERY', urgency: 'HIGH' }],
        inventoryAdded: ['Sword', 'Shield'],
        healthAdded: ['Minor wound'],
        characterStateChangesAdded: [{ characterName: 'Ally', states: ['Trusting'] }],
        characterStateChangesRemoved: ['cs-7'],
      });
      const context: FirstPageBuildContext = {
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
      };

      const page = buildFirstPage(result, context);

      expect(page.id).toBe(1);
      expect(page.accumulatedActiveState.currentLocation).toBe('Ancient treasury');
      expect(page.accumulatedActiveState.activeThreats).toEqual([{ id: 'th-1', text: 'Guardian awakened' }]);
      expect(page.accumulatedInventory).toEqual([{ id: 'inv-1', text: 'Sword' }, { id: 'inv-2', text: 'Shield' }]);
      expect(page.accumulatedHealth).toEqual([{ id: 'hp-1', text: 'Minor wound' }]);
      expect(page.accumulatedCharacterState['Ally']).toEqual([{ id: 'cs-1', text: 'Trusting' }]);
      expect(page.characterStateChanges.removed).toEqual(['cs-7']);
    });

    it('assigns structure state and version from context', () => {
      const result = buildMockGenerationResult();
      const structureState = {
        currentActIndex: 0,
        currentBeatIndex: 0,
        beatProgressions: [{ beatId: '1.1', status: 'active' as const }],
        pagesInCurrentBeat: 0,
        pacingNudge: null as string | null,
      };
      const versionId = 'sv-12345-abcdef' as StructureVersionId;
      const context: FirstPageBuildContext = {
        structureState,
        structureVersionId: versionId,
      };

      const page = buildFirstPage(result, context);
      expect(page.accumulatedStructureState).toEqual(structureState);
      expect(page.structureVersionId).toBe(versionId);
    });
  });

  describe('buildContinuationPage', () => {
    it('creates continuation page and accumulates parent keyed state', () => {
      const result = buildMockGenerationResult({
        currentLocation: 'Hidden chamber',
        threatsAdded: ['Trap triggered'],
        threadsAdded: [{ text: 'Ancient secret revealed', threadType: 'INFORMATION', urgency: 'MEDIUM' }],
        characterStateChangesRemoved: ['cs-1'],
      });
      const context: ContinuationPageBuildContext = {
        pageId: parsePageId(2),
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedActiveState: {
          currentLocation: 'Entrance hall',
          activeThreats: [{ id: 'th-1', text: 'Guardian patrol' }],
          activeConstraints: [{ id: 'cn-1', text: 'Noise attracts guards' }],
          openThreads: [{ id: 'td-1', text: 'Missing key' }],
        },
        parentAccumulatedInventory: [{ id: 'inv-1', text: 'Map' }],
        parentAccumulatedHealth: [],
        parentAccumulatedCharacterState: {},
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
        analystResult: null,
      };

      const page = buildContinuationPage(result, context);

      expect(page.id).toBe(2);
      expect(page.parentPageId).toBe(1);
      expect(page.parentChoiceIndex).toBe(0);
      expect(page.accumulatedActiveState.currentLocation).toBe('Hidden chamber');
      expect(page.accumulatedActiveState.activeThreats.map(t => t.text)).toEqual([
        'Guardian patrol',
        'Trap triggered',
      ]);
      expect(page.accumulatedActiveState.openThreads.map(t => t.text)).toEqual([
        'Missing key',
        'Ancient secret revealed',
      ]);
      expect(page.accumulatedInventory).toEqual([{ id: 'inv-1', text: 'Map' }, { id: 'inv-2', text: 'Rusty key' }]);
      expect(page.characterStateChanges.removed).toEqual(['cs-1']);
    });
  });

  describe('createEmptyStructureContext', () => {
    it('returns empty structure context', () => {
      expect(createEmptyStructureContext()).toEqual({
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
      });
    });
  });
});
