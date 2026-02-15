import {
  ConstraintType,
  createEmptyAccumulatedStructureState,
  parsePageId,
  StructureVersionId,
  ThreatType,
} from '@/models';
import type { FinalPageGenerationResult } from '@/llm/writer-types';
import type { DetectedPromise } from '@/llm/analyst-types';
import type { TrackedPromise } from '@/models/state/keyed-entry';
import { PromiseType, Urgency } from '@/models/state/keyed-entry';
import {
  buildFirstPage,
  buildContinuationPage,
  computeAccumulatedPromises,
  createEmptyStructureContext,
  FirstPageBuildContext,
  getMaxPromiseIdNumber,
  ContinuationPageBuildContext,
} from '@/engine/page-builder';

function buildMockGenerationResult(
  overrides?: Partial<FinalPageGenerationResult>
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
        threatsAdded: [{ text: 'Guardian awakened', threatType: ThreatType.CREATURE }],
        constraintsAdded: [{ text: 'Must remain silent', constraintType: ConstraintType.PHYSICAL }],
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
      expect(page.accumulatedActiveState.activeThreats).toEqual([
        { id: 'th-1', text: 'Guardian awakened', threatType: ThreatType.CREATURE },
      ]);
      expect(page.accumulatedInventory).toEqual([
        { id: 'inv-1', text: 'Sword' },
        { id: 'inv-2', text: 'Shield' },
      ]);
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
        threatsAdded: [{ text: 'Trap triggered', threatType: ThreatType.ENVIRONMENTAL }],
        threadsAdded: [
          { text: 'Ancient secret revealed', threadType: 'INFORMATION', urgency: 'MEDIUM' },
        ],
        characterStateChangesRemoved: ['cs-1'],
      });
      const context: ContinuationPageBuildContext = {
        pageId: parsePageId(2),
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedActiveState: {
          currentLocation: 'Entrance hall',
          activeThreats: [
            { id: 'th-1', text: 'Guardian patrol', threatType: ThreatType.HOSTILE_AGENT },
          ],
          activeConstraints: [
            { id: 'cn-1', text: 'Noise attracts guards', constraintType: ConstraintType.ENVIRONMENTAL },
          ],
          openThreads: [{ id: 'td-1', text: 'Missing key' }],
        },
        parentAccumulatedInventory: [{ id: 'inv-1', text: 'Map' }],
        parentAccumulatedHealth: [],
        parentAccumulatedCharacterState: {},
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
        storyBible: null,
        analystResult: null,
        parentThreadAges: { 'td-1': 0 },
        parentAccumulatedPromises: [],
        analystPromisesDetected: [],
        analystPromisesResolved: [],
      };

      const page = buildContinuationPage(result, context);

      expect(page.id).toBe(2);
      expect(page.parentPageId).toBe(1);
      expect(page.parentChoiceIndex).toBe(0);
      expect(page.accumulatedActiveState.currentLocation).toBe('Hidden chamber');
      expect(page.accumulatedActiveState.activeThreats.map((t) => t.text)).toEqual([
        'Guardian patrol',
        'Trap triggered',
      ]);
      expect(page.accumulatedActiveState.openThreads.map((t) => t.text)).toEqual([
        'Missing key',
        'Ancient secret revealed',
      ]);
      expect(page.accumulatedInventory).toEqual([
        { id: 'inv-1', text: 'Map' },
        { id: 'inv-2', text: 'Rusty key' },
      ]);
      expect(page.characterStateChanges.removed).toEqual(['cs-1']);
    });
  });

  describe('resolvedThreadMeta', () => {
    it('populates resolvedThreadMeta when threads are resolved', () => {
      const result = buildMockGenerationResult({
        threadsResolved: ['td-1'],
      });
      const context: ContinuationPageBuildContext = {
        pageId: parsePageId(2),
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedActiveState: {
          currentLocation: 'Forest',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [
            { id: 'td-1', text: 'Find the gem', threadType: 'QUEST', urgency: 'HIGH' },
            { id: 'td-2', text: 'Side plot', threadType: 'MYSTERY', urgency: 'LOW' },
          ],
        },
        parentAccumulatedInventory: [],
        parentAccumulatedHealth: [],
        parentAccumulatedCharacterState: {},
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
        storyBible: null,
        analystResult: null,
        parentThreadAges: { 'td-1': 2, 'td-2': 1 },
        parentAccumulatedPromises: [],
        analystPromisesDetected: [],
        analystPromisesResolved: [],
      };

      const page = buildContinuationPage(result, context);

      expect(page.resolvedThreadMeta).toEqual({
        'td-1': { threadType: 'QUEST', urgency: 'HIGH' },
      });
    });

    it('returns empty resolvedThreadMeta when no threads resolved', () => {
      const result = buildMockGenerationResult({
        threadsResolved: [],
      });
      const context: ContinuationPageBuildContext = {
        pageId: parsePageId(2),
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedActiveState: {
          currentLocation: 'Forest',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [
            { id: 'td-1', text: 'Find the gem', threadType: 'QUEST', urgency: 'HIGH' },
          ],
        },
        parentAccumulatedInventory: [],
        parentAccumulatedHealth: [],
        parentAccumulatedCharacterState: {},
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
        storyBible: null,
        analystResult: null,
        parentThreadAges: { 'td-1': 0 },
        parentAccumulatedPromises: [],
        analystPromisesDetected: [],
        analystPromisesResolved: [],
      };

      const page = buildContinuationPage(result, context);

      expect(page.resolvedThreadMeta).toEqual({});
    });
  });

  describe('resolvedPromiseMeta', () => {
    it('populates resolvedPromiseMeta when promises are resolved', () => {
      const result = buildMockGenerationResult();
      const context: ContinuationPageBuildContext = {
        pageId: parsePageId(2),
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedActiveState: {
          currentLocation: 'Forest',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        },
        parentAccumulatedInventory: [],
        parentAccumulatedHealth: [],
        parentAccumulatedCharacterState: {},
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
        storyBible: null,
        analystResult: null,
        parentThreadAges: {},
        parentAccumulatedPromises: [
          {
            id: 'pr-1',
            description: 'A silver dagger was introduced with emphasis',
            promiseType: PromiseType.CHEKHOV_GUN,
            suggestedUrgency: Urgency.HIGH,
            age: 2,
          },
          {
            id: 'pr-2',
            description: 'Unusual silence from northern watchtower',
            promiseType: PromiseType.FORESHADOWING,
            suggestedUrgency: Urgency.MEDIUM,
            age: 1,
          },
        ],
        analystPromisesDetected: [],
        analystPromisesResolved: ['pr-1'],
      };

      const page = buildContinuationPage(result, context);

      expect(page.resolvedPromiseMeta).toEqual({
        'pr-1': { promiseType: 'CHEKHOV_GUN', urgency: 'HIGH' },
      });
    });

    it('returns empty resolvedPromiseMeta when no promises resolved', () => {
      const result = buildMockGenerationResult();
      const context: ContinuationPageBuildContext = {
        pageId: parsePageId(2),
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedActiveState: {
          currentLocation: 'Forest',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        },
        parentAccumulatedInventory: [],
        parentAccumulatedHealth: [],
        parentAccumulatedCharacterState: {},
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
        storyBible: null,
        analystResult: null,
        parentThreadAges: {},
        parentAccumulatedPromises: [
          {
            id: 'pr-1',
            description: 'A silver dagger was introduced with emphasis',
            promiseType: PromiseType.CHEKHOV_GUN,
            suggestedUrgency: Urgency.HIGH,
            age: 2,
          },
        ],
        analystPromisesDetected: [],
        analystPromisesResolved: [],
      };

      const page = buildContinuationPage(result, context);

      expect(page.resolvedPromiseMeta).toEqual({});
    });

    it('ignores resolved IDs that do not match any parent promise', () => {
      const result = buildMockGenerationResult();
      const context: ContinuationPageBuildContext = {
        pageId: parsePageId(2),
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedActiveState: {
          currentLocation: 'Forest',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        },
        parentAccumulatedInventory: [],
        parentAccumulatedHealth: [],
        parentAccumulatedCharacterState: {},
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
        storyBible: null,
        analystResult: null,
        parentThreadAges: {},
        parentAccumulatedPromises: [
          {
            id: 'pr-1',
            description: 'A silver dagger was introduced with emphasis',
            promiseType: PromiseType.CHEKHOV_GUN,
            suggestedUrgency: Urgency.HIGH,
            age: 2,
          },
        ],
        analystPromisesDetected: [],
        analystPromisesResolved: ['pr-999'],
      };

      const page = buildContinuationPage(result, context);

      expect(page.resolvedPromiseMeta).toEqual({});
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

  describe('computeAccumulatedPromises', () => {
    const makeTrackedPromise = (
      id: string,
      desc: string,
      age: number,
      type: TrackedPromise['promiseType'] = PromiseType.FORESHADOWING
    ): TrackedPromise => ({
      id,
      age,
      description: desc,
      promiseType: type,
      suggestedUrgency: Urgency.MEDIUM,
    });

    const makeDetectedPromise = (
      desc: string,
      type: DetectedPromise['promiseType'] = PromiseType.FORESHADOWING
    ): DetectedPromise => ({
      description: desc,
      promiseType: type,
      suggestedUrgency: Urgency.MEDIUM,
    });

    it('ages survivors and adds analyst-detected promises with new IDs', () => {
      const tracked = [makeTrackedPromise('pr-1', 'Old promise', 2)];
      const detected = [makeDetectedPromise('New foreshadowing')];
      const result = computeAccumulatedPromises(tracked, [], detected, getMaxPromiseIdNumber(tracked));
      expect(result).toHaveLength(2);
      expect(result[0]!.description).toBe('Old promise');
      expect(result[0]!.age).toBe(3);
      expect(result[1]!.description).toBe('New foreshadowing');
      expect(result[1]!.id).toBe('pr-2');
      expect(result[1]!.age).toBe(0);
    });

    it('does not cap inherited promises', () => {
      const tracked = Array.from({ length: 4 }, (_, i) =>
        makeTrackedPromise(`pr-${i + 1}`, `Tracked ${i}`, i)
      );
      const detected = Array.from({ length: 3 }, (_, i) => makeDetectedPromise(`Detected ${i}`));
      const result = computeAccumulatedPromises(tracked, [], detected, getMaxPromiseIdNumber(tracked));
      expect(result).toHaveLength(7);
      expect(result[0]!.description).toBe('Tracked 0');
      expect(result[6]!.description).toBe('Detected 2');
    });

    it('removes promises explicitly resolved by analyst', () => {
      const tracked = [
        makeTrackedPromise('pr-1', 'A silver dagger was introduced with emphasis', 1),
        makeTrackedPromise('pr-2', 'Unusual silence from northern watchtower', 0),
      ];
      const result = computeAccumulatedPromises(
        tracked,
        ['pr-1'],
        [],
        getMaxPromiseIdNumber(tracked)
      );
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('pr-2');
      expect(result[0]!.description).toBe('Unusual silence from northern watchtower');
      expect(result[0]!.age).toBe(1);
    });

    it('handles resolve + detect in the same page', () => {
      const tracked = [makeTrackedPromise('pr-7', 'Existing setup', 5, PromiseType.CHEKHOV_GUN)];
      const detected = [makeDetectedPromise('Fresh setup', PromiseType.DRAMATIC_IRONY)];
      const result = computeAccumulatedPromises(
        tracked,
        ['pr-7'],
        detected,
        getMaxPromiseIdNumber(tracked)
      );
      expect(result).toEqual([
        {
          id: 'pr-8',
          description: 'Fresh setup',
          promiseType: PromiseType.DRAMATIC_IRONY,
          suggestedUrgency: Urgency.MEDIUM,
          age: 0,
        },
      ]);
    });

    it('filters out empty descriptions', () => {
      const detected = [
        makeDetectedPromise('   '),
        makeDetectedPromise('  valid promise  ', PromiseType.SETUP_PAYOFF),
      ];
      const result = computeAccumulatedPromises([], [], detected, 0);
      expect(result).toEqual([
        {
          id: 'pr-1',
          description: 'valid promise',
          promiseType: PromiseType.SETUP_PAYOFF,
          suggestedUrgency: Urgency.MEDIUM,
          age: 0,
        },
      ]);
    });

    it('returns empty when no promises exist', () => {
      const result = computeAccumulatedPromises([], [], [], 0);
      expect(result).toEqual([]);
    });
  });
});
