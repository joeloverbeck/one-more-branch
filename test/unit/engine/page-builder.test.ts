import {
  createEmptyAccumulatedStructureState,
  parsePageId,
  StructureVersionId,
} from '@/models';
import type { GenerationResult } from '@/llm/types';
import {
  buildFirstPage,
  buildContinuationPage,
  createEmptyStructureContext,
  FirstPageBuildContext,
  ContinuationPageBuildContext,
} from '@/engine/page-builder';

function buildMockGenerationResult(overrides?: Partial<GenerationResult>): GenerationResult {
  return {
    narrative: 'You step into the shadowed corridor.',
    choices: ['Go left', 'Go right'],
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
    beatConcluded: false,
    beatResolution: '',
    rawResponse: 'raw-response',
    ...overrides,
  };
}

describe('page-builder', () => {
  describe('buildFirstPage', () => {
    it('creates page with id 1 and null parent fields', () => {
      const result = buildMockGenerationResult();
      const context: FirstPageBuildContext = {
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
      };

      const page = buildFirstPage(result, context);

      expect(page.id).toBe(1);
      expect(page.parentPageId).toBeNull();
      expect(page.parentChoiceIndex).toBeNull();
    });

    it('maps narrative and choices from generation result', () => {
      const result = buildMockGenerationResult({
        narrative: 'The adventure begins.',
        choices: ['Enter the cave', 'Climb the mountain', 'Rest by the river'],
      });
      const context: FirstPageBuildContext = {
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
      };

      const page = buildFirstPage(result, context);

      expect(page.narrativeText).toBe('The adventure begins.');
      expect(page.choices).toHaveLength(3);
      expect(page.choices.map(c => c.text)).toEqual([
        'Enter the cave',
        'Climb the mountain',
        'Rest by the river',
      ]);
    });

    it('applies active state fields from generation result', () => {
      const result = buildMockGenerationResult({
        currentLocation: 'Ancient treasury',
        threatsAdded: ['THREAT_guardian: Guardian awakened'],
        constraintsAdded: ['CONSTRAINT_noise: Must remain silent'],
        threadsAdded: ['THREAD_mystery: Mystery of the vault'],
      });
      const context: FirstPageBuildContext = {
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
      };

      const page = buildFirstPage(result, context);

      expect(page.accumulatedActiveState.currentLocation).toBe('Ancient treasury');
      expect(page.accumulatedActiveState.activeThreats).toHaveLength(1);
      expect(page.accumulatedActiveState.activeThreats[0].description).toBe('Guardian awakened');
      expect(page.accumulatedActiveState.activeConstraints).toHaveLength(1);
      expect(page.accumulatedActiveState.activeConstraints[0].description).toBe('Must remain silent');
      expect(page.accumulatedActiveState.openThreads).toHaveLength(1);
      expect(page.accumulatedActiveState.openThreads[0].description).toBe('Mystery of the vault');
    });

    it('applies inventory changes from generation result', () => {
      const result = buildMockGenerationResult({
        inventoryAdded: ['Sword', 'Shield'],
        inventoryRemoved: [],
      });
      const context: FirstPageBuildContext = {
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
      };

      const page = buildFirstPage(result, context);

      expect(page.inventoryChanges.added).toContain('Sword');
      expect(page.inventoryChanges.added).toContain('Shield');
      expect(page.accumulatedInventory).toContain('Sword');
      expect(page.accumulatedInventory).toContain('Shield');
    });

    it('applies health changes from generation result', () => {
      const result = buildMockGenerationResult({
        healthAdded: ['Minor wound'],
        healthRemoved: [],
      });
      const context: FirstPageBuildContext = {
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
      };

      const page = buildFirstPage(result, context);

      expect(page.healthChanges.added).toContain('Minor wound');
      expect(page.accumulatedHealth).toContain('Minor wound');
    });

    it('applies character state changes from generation result', () => {
      const result = buildMockGenerationResult({
        characterStateChangesAdded: [
          { characterName: 'Ally', states: ['Trusting'] },
        ],
        characterStateChangesRemoved: [],
      });
      const context: FirstPageBuildContext = {
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
      };

      const page = buildFirstPage(result, context);

      expect(page.accumulatedCharacterState['Ally']).toContain('Trusting');
    });

    it('assigns structure state and version from context', () => {
      const result = buildMockGenerationResult();
      const structureState = {
        currentActIndex: 0,
        currentBeatIndex: 0,
        beatProgressions: [{ beatId: '1.1', status: 'active' as const }],
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

    it('sets isEnding from generation result', () => {
      const result = buildMockGenerationResult({
        isEnding: true,
        choices: [],
      });
      const context: FirstPageBuildContext = {
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
      };

      const page = buildFirstPage(result, context);

      expect(page.isEnding).toBe(true);
      expect(page.choices).toHaveLength(0);
    });

    it('applies protagonist affect from generation result', () => {
      const result = buildMockGenerationResult({
        protagonistAffect: {
          primaryEmotion: 'fear',
          primaryIntensity: 'strong',
          primaryCause: 'The guardian looms ahead',
          secondaryEmotions: [{ emotion: 'determination', cause: 'Must protect allies' }],
          dominantMotivation: 'escape',
        },
      });
      const context: FirstPageBuildContext = {
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
      };

      const page = buildFirstPage(result, context);

      expect(page.protagonistAffect.primaryEmotion).toBe('fear');
      expect(page.protagonistAffect.primaryIntensity).toBe('strong');
      expect(page.protagonistAffect.primaryCause).toBe('The guardian looms ahead');
      expect(page.protagonistAffect.secondaryEmotions).toHaveLength(1);
      expect(page.protagonistAffect.dominantMotivation).toBe('escape');
    });
  });

  describe('buildContinuationPage', () => {
    it('creates page with specified id and parent linkage', () => {
      const result = buildMockGenerationResult();
      const context: ContinuationPageBuildContext = {
        pageId: parsePageId(5),
        parentPageId: parsePageId(3),
        parentChoiceIndex: 1,
        parentAccumulatedState: { changes: ['Previous state'] },
        parentAccumulatedActiveState: {
          currentLocation: 'Starting area',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        },
        parentAccumulatedInventory: ['Map'],
        parentAccumulatedHealth: [],
        parentAccumulatedCharacterState: {},
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
      };

      const page = buildContinuationPage(result, context);

      expect(page.id).toBe(5);
      expect(page.parentPageId).toBe(3);
      expect(page.parentChoiceIndex).toBe(1);
    });

    it('accumulates active state on top of parent active state', () => {
      const result = buildMockGenerationResult({
        currentLocation: 'Hidden chamber',
        threatsAdded: ['THREAT_trap: Trap triggered'],
        threadsAdded: ['THREAD_secret: Ancient secret revealed'],
      });
      const context: ContinuationPageBuildContext = {
        pageId: parsePageId(2),
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedState: { changes: ['Previous state'] },
        parentAccumulatedActiveState: {
          currentLocation: 'Entrance hall',
          activeThreats: [{ prefix: 'THREAT_patrol', description: 'Guardian patrol', raw: 'THREAT_patrol: Guardian patrol' }],
          activeConstraints: [{ prefix: 'CONSTRAINT_noise', description: 'Noise attracts guards', raw: 'CONSTRAINT_noise: Noise attracts guards' }],
          openThreads: [{ prefix: 'THREAD_key', description: 'Missing key', raw: 'THREAD_key: Missing key' }],
        },
        parentAccumulatedInventory: [],
        parentAccumulatedHealth: [],
        parentAccumulatedCharacterState: {},
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
      };

      const page = buildContinuationPage(result, context);

      expect(page.accumulatedActiveState.currentLocation).toBe('Hidden chamber');
      expect(page.accumulatedActiveState.activeThreats).toHaveLength(2);
      expect(page.accumulatedActiveState.activeThreats.map(t => t.description)).toContain('Guardian patrol');
      expect(page.accumulatedActiveState.activeThreats.map(t => t.description)).toContain('Trap triggered');
      expect(page.accumulatedActiveState.openThreads).toHaveLength(2);
      expect(page.accumulatedActiveState.openThreads.map(t => t.description)).toContain('Missing key');
      expect(page.accumulatedActiveState.openThreads.map(t => t.description)).toContain('Ancient secret revealed');
    });

    it('accumulates inventory on top of parent inventory', () => {
      const result = buildMockGenerationResult({
        inventoryAdded: ['Compass'],
        inventoryRemoved: [],
      });
      const context: ContinuationPageBuildContext = {
        pageId: parsePageId(2),
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedState: { changes: [] },
        parentAccumulatedActiveState: {
          currentLocation: 'Corridor',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        },
        parentAccumulatedInventory: ['Torch', 'Rope'],
        parentAccumulatedHealth: [],
        parentAccumulatedCharacterState: {},
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
      };

      const page = buildContinuationPage(result, context);

      expect(page.accumulatedInventory).toContain('Torch');
      expect(page.accumulatedInventory).toContain('Rope');
      expect(page.accumulatedInventory).toContain('Compass');
    });

    it('accumulates health on top of parent health', () => {
      const result = buildMockGenerationResult({
        healthAdded: ['Poison'],
        healthRemoved: [],
      });
      const context: ContinuationPageBuildContext = {
        pageId: parsePageId(2),
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedState: { changes: [] },
        parentAccumulatedActiveState: {
          currentLocation: 'Poisoned chamber',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        },
        parentAccumulatedInventory: [],
        parentAccumulatedHealth: ['Minor wound'],
        parentAccumulatedCharacterState: {},
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
      };

      const page = buildContinuationPage(result, context);

      expect(page.accumulatedHealth).toContain('Minor wound');
      expect(page.accumulatedHealth).toContain('Poison');
    });

    it('accumulates character state on top of parent character state', () => {
      const result = buildMockGenerationResult({
        characterStateChangesAdded: [
          { characterName: 'Ally', states: ['Angry'] },
        ],
        characterStateChangesRemoved: [],
      });
      const context: ContinuationPageBuildContext = {
        pageId: parsePageId(2),
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedState: { changes: [] },
        parentAccumulatedActiveState: {
          currentLocation: 'Meeting room',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        },
        parentAccumulatedInventory: [],
        parentAccumulatedHealth: [],
        parentAccumulatedCharacterState: { 'Ally': ['Trusting'] },
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
      };

      const page = buildContinuationPage(result, context);

      expect(page.accumulatedCharacterState['Ally']).toContain('Trusting');
      expect(page.accumulatedCharacterState['Ally']).toContain('Angry');
    });

    it('uses provided structure state and version', () => {
      const result = buildMockGenerationResult();
      const structureState = {
        currentActIndex: 1,
        currentBeatIndex: 0,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded' as const, resolution: 'Done' },
          { beatId: '2.1', status: 'active' as const },
        ],
      };
      const versionId = 'sv-67890-xyz123' as StructureVersionId;
      const context: ContinuationPageBuildContext = {
        pageId: parsePageId(3),
        parentPageId: parsePageId(2),
        parentChoiceIndex: 0,
        parentAccumulatedState: { changes: [] },
        parentAccumulatedActiveState: {
          currentLocation: 'Act 2 location',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        },
        parentAccumulatedInventory: [],
        parentAccumulatedHealth: [],
        parentAccumulatedCharacterState: {},
        structureState,
        structureVersionId: versionId,
      };

      const page = buildContinuationPage(result, context);

      expect(page.accumulatedStructureState).toEqual(structureState);
      expect(page.structureVersionId).toBe(versionId);
    });
  });

  describe('createEmptyStructureContext', () => {
    it('returns empty structure state with null version', () => {
      const context = createEmptyStructureContext();

      expect(context.structureState).toEqual({
        currentActIndex: 0,
        currentBeatIndex: 0,
        beatProgressions: [],
      });
      expect(context.structureVersionId).toBeNull();
    });
  });
});
