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
import { PromiseType, PromiseScope, Urgency } from '@/models/state/keyed-entry';
import type { AnalystResult } from '@/llm/analyst-types';
import { createEmptyAccumulatedNpcRelationships } from '@/models/state/npc-relationship';
import {
  augmentThreadsResolvedFromAnalyst,
  buildFirstPage,
  buildContinuationPage,
  buildPage,
  computeAccumulatedPromises,
  createEmptyStructureContext,
  FirstPageBuildContext,
  getMaxPromiseIdNumber,
  ContinuationPageBuildContext,
  PageBuildContext,
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
    newCanonFacts: [{ text: 'The corridor echoes with distant footsteps', factType: 'LAW' }],
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
            scope: PromiseScope.BEAT,
            resolutionHint: 'Will the dagger be used?',
            suggestedUrgency: Urgency.HIGH,
            age: 2,
          },
          {
            id: 'pr-2',
            description: 'Unusual silence from northern watchtower',
            promiseType: PromiseType.FORESHADOWING,
            scope: PromiseScope.ACT,
            resolutionHint: 'Will the silence be explained?',
            suggestedUrgency: Urgency.MEDIUM,
            age: 1,
          },
        ],
        analystPromisesDetected: [],
        analystPromisesResolved: ['pr-1'],
      };

      const page = buildContinuationPage(result, context);

      expect(page.resolvedPromiseMeta).toEqual({
        'pr-1': { promiseType: 'CHEKHOV_GUN', scope: 'BEAT', urgency: 'HIGH' },
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
            scope: PromiseScope.BEAT,
            resolutionHint: 'Will the dagger be used?',
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
            scope: PromiseScope.BEAT,
            resolutionHint: 'Will the dagger be used?',
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
      type: TrackedPromise['promiseType'] = PromiseType.FORESHADOWING,
      scope: TrackedPromise['scope'] = PromiseScope.BEAT,
      resolutionHint: string = `Will ${desc.toLowerCase()} resolve?`
    ): TrackedPromise => ({
      id,
      age,
      description: desc,
      promiseType: type,
      scope,
      resolutionHint,
      suggestedUrgency: Urgency.MEDIUM,
    });

    const makeDetectedPromise = (
      desc: string,
      type: DetectedPromise['promiseType'] = PromiseType.FORESHADOWING,
      scope: DetectedPromise['scope'] = PromiseScope.BEAT,
      resolutionHint: string = `Will ${desc.toLowerCase()} resolve?`
    ): DetectedPromise => ({
      description: desc,
      promiseType: type,
      scope,
      resolutionHint,
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
      const detected = [makeDetectedPromise('Fresh setup', PromiseType.UNRESOLVED_TENSION)];
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
          promiseType: PromiseType.UNRESOLVED_TENSION,
          scope: PromiseScope.BEAT,
          resolutionHint: 'Will fresh setup resolve?',
          suggestedUrgency: Urgency.MEDIUM,
          age: 0,
        },
      ]);
    });

    it('filters out empty descriptions', () => {
      const detected = [
        makeDetectedPromise('   '),
        makeDetectedPromise('  valid promise  ', PromiseType.TICKING_CLOCK),
      ];
      const result = computeAccumulatedPromises([], [], detected, 0);
      expect(result).toEqual([
        {
          id: 'pr-1',
          description: 'valid promise',
          promiseType: PromiseType.TICKING_CLOCK,
          scope: PromiseScope.BEAT,
          resolutionHint: 'Will   valid promise   resolve?',
          suggestedUrgency: Urgency.MEDIUM,
          age: 0,
        },
      ]);
    });

    it('returns empty when no promises exist', () => {
      const result = computeAccumulatedPromises([], [], [], 0);
      expect(result).toEqual([]);
    });

    it('auto-expires SCENE-scoped promises after 4 pages', () => {
      // age 4 -> aged to 5. The filter is `promise.age > sceneExpiryThreshold` where threshold is 4.
      // So age 5 > 4, SCENE promise expires. BEAT has no expiry -> survives.
      const trackedExpiring = [
        makeTrackedPromise('pr-1', 'Scene promise expiring', 4, PromiseType.FORESHADOWING, PromiseScope.SCENE),
        makeTrackedPromise('pr-2', 'Beat promise same age', 4, PromiseType.FORESHADOWING, PromiseScope.BEAT),
      ];
      const result = computeAccumulatedPromises(trackedExpiring, [], [], getMaxPromiseIdNumber(trackedExpiring));
      // pr-1 aged to 5 > 4 (SCENE threshold) -> expired
      // pr-2 aged to 5 but BEAT has no expiry -> survives
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('pr-2');
      expect(result[0]!.age).toBe(5);
    });
  });

  describe('buildPage (opening page promises)', () => {
    it('accumulates analyst-detected promises on an opening page', () => {
      const result = buildMockGenerationResult();
      const context: PageBuildContext = {
        pageId: parsePageId(1),
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedActiveState: {
          currentLocation: '',
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
        parentAccumulatedPromises: [],
        analystPromisesDetected: [
          {
            description: 'A mysterious key glints in the shadows',
            promiseType: 'CHEKHOV_GUN',
            scope: 'BEAT',
            resolutionHint: 'Will the key unlock something?',
            suggestedUrgency: 'MEDIUM',
          },
          {
            description: 'The villain hints at a hidden alliance',
            promiseType: 'FORESHADOWING',
            scope: 'ACT',
            resolutionHint: 'Will the alliance be revealed?',
            suggestedUrgency: 'HIGH',
          },
        ],
        analystPromisesResolved: [],
        parentAccumulatedNpcAgendas: {},
      };

      const page = buildPage(result, context);

      expect(page.accumulatedPromises).toHaveLength(2);
      expect(page.accumulatedPromises[0]).toEqual({
        id: 'pr-1',
        description: 'A mysterious key glints in the shadows',
        promiseType: PromiseType.CHEKHOV_GUN,
        scope: PromiseScope.BEAT,
        resolutionHint: 'Will the key unlock something?',
        suggestedUrgency: Urgency.MEDIUM,
        age: 0,
      });
      expect(page.accumulatedPromises[1]).toEqual({
        id: 'pr-2',
        description: 'The villain hints at a hidden alliance',
        promiseType: PromiseType.FORESHADOWING,
        scope: PromiseScope.ACT,
        resolutionHint: 'Will the alliance be revealed?',
        suggestedUrgency: Urgency.HIGH,
        age: 0,
      });
    });
  });

  describe('augmentThreadsResolvedFromAnalyst', () => {
    function makeAnalystResult(
      threadPayoffAssessments: AnalystResult['threadPayoffAssessments']
    ): AnalystResult {
      return {
        beatConcluded: false,
        beatResolution: '',
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: '',
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none',
        sceneMomentum: 'INCREMENTAL_PROGRESS',
        objectiveEvidenceStrength: 'NONE',
        commitmentStrength: 'NONE',
        structuralPositionSignal: 'WITHIN_ACTIVE_BEAT',
        entryConditionReadiness: 'NOT_READY',
        objectiveAnchors: [],
        anchorEvidence: [],
        completionGateSatisfied: false,
        completionGateFailureReason: '',
        toneAdherent: true,
        toneDriftDescription: '',
        promisesDetected: [],
        promisesResolved: [],
        promisePayoffAssessments: [],
        threadPayoffAssessments,
        npcCoherenceAdherent: true,
        npcCoherenceIssues: '',
        relationshipShiftsDetected: [],
        spineDeviationDetected: false,
        spineDeviationReason: '',
        spineInvalidatedElement: null,
        rawResponse: '',
      };
    }

    it('returns unchanged when analystResult is null', () => {
      const result = augmentThreadsResolvedFromAnalyst([], null, []);
      expect(result).toEqual([]);
    });

    it('returns unchanged when threadPayoffAssessments is empty', () => {
      const original = ['td-5'];
      const analyst = makeAnalystResult([]);
      const result = augmentThreadsResolvedFromAnalyst(original, analyst, []);
      expect(result).toBe(original);
    });

    it('adds analyst-detected thread IDs when threadsResolved is empty', () => {
      const analyst = makeAnalystResult([
        { threadId: 'td-13', threadText: 'Thread 13', satisfactionLevel: 'ADEQUATE', reasoning: 'r' },
        { threadId: 'td-14', threadText: 'Thread 14', satisfactionLevel: 'WELL_EARNED', reasoning: 'r' },
      ]);
      const parentOpenThreads = [
        { id: 'td-13', text: 'Thread 13' },
        { id: 'td-14', text: 'Thread 14' },
      ];
      const result = augmentThreadsResolvedFromAnalyst([], analyst, parentOpenThreads);
      expect(result).toEqual(['td-13', 'td-14']);
    });

    it('does not duplicate IDs already in threadsResolved', () => {
      const analyst = makeAnalystResult([
        { threadId: 'td-5', threadText: 'Thread 5', satisfactionLevel: 'ADEQUATE', reasoning: 'r' },
        { threadId: 'td-13', threadText: 'Thread 13', satisfactionLevel: 'ADEQUATE', reasoning: 'r' },
      ]);
      const parentOpenThreads = [
        { id: 'td-5', text: 'Thread 5' },
        { id: 'td-13', text: 'Thread 13' },
      ];
      const result = augmentThreadsResolvedFromAnalyst(['td-5'], analyst, parentOpenThreads);
      expect(result).toEqual(['td-5', 'td-13']);
    });

    it('skips analyst thread IDs not present in parent open threads', () => {
      const analyst = makeAnalystResult([
        { threadId: 'td-99', threadText: 'Ghost thread', satisfactionLevel: 'ADEQUATE', reasoning: 'r' },
      ]);
      const parentOpenThreads = [{ id: 'td-1', text: 'Thread 1' }];
      const result = augmentThreadsResolvedFromAnalyst([], analyst, parentOpenThreads);
      expect(result).toEqual([]);
    });

    it('does not mutate original arrays', () => {
      const original: string[] = ['td-1'];
      const analyst = makeAnalystResult([
        { threadId: 'td-2', threadText: 'Thread 2', satisfactionLevel: 'ADEQUATE', reasoning: 'r' },
      ]);
      const parentOpenThreads = [
        { id: 'td-1', text: 'Thread 1' },
        { id: 'td-2', text: 'Thread 2' },
      ];
      const result = augmentThreadsResolvedFromAnalyst(original, analyst, parentOpenThreads);
      expect(original).toEqual(['td-1']);
      expect(result).toEqual(['td-1', 'td-2']);
      expect(result).not.toBe(original);
    });

    it('returns original reference when no augmentation needed', () => {
      const original = ['td-5'];
      const analyst = makeAnalystResult([
        { threadId: 'td-5', threadText: 'Thread 5', satisfactionLevel: 'ADEQUATE', reasoning: 'r' },
      ]);
      const parentOpenThreads = [{ id: 'td-5', text: 'Thread 5' }];
      const result = augmentThreadsResolvedFromAnalyst(original, analyst, parentOpenThreads);
      expect(result).toBe(original);
    });
  });

  describe('buildPage augments threadsResolved from analyst', () => {
    function makeAnalystResultFull(
      threadPayoffAssessments: AnalystResult['threadPayoffAssessments']
    ): AnalystResult {
      return {
        beatConcluded: false,
        beatResolution: '',
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: '',
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none',
        sceneMomentum: 'INCREMENTAL_PROGRESS',
        objectiveEvidenceStrength: 'NONE',
        commitmentStrength: 'NONE',
        structuralPositionSignal: 'WITHIN_ACTIVE_BEAT',
        entryConditionReadiness: 'NOT_READY',
        objectiveAnchors: [],
        anchorEvidence: [],
        completionGateSatisfied: false,
        completionGateFailureReason: '',
        toneAdherent: true,
        toneDriftDescription: '',
        promisesDetected: [],
        promisesResolved: [],
        promisePayoffAssessments: [],
        threadPayoffAssessments,
        npcCoherenceAdherent: true,
        npcCoherenceIssues: '',
        relationshipShiftsDetected: [],
        spineDeviationDetected: false,
        spineDeviationReason: '',
        spineInvalidatedElement: null,
        rawResponse: '',
      };
    }

    it('augments threadsResolved, resolvedThreadMeta, and removes from openThreads', () => {
      const result = buildMockGenerationResult({
        threadsResolved: [],
      });
      const analystResult = makeAnalystResultFull([
        {
          threadId: 'td-13',
          threadText: 'Find the hidden passage',
          satisfactionLevel: 'WELL_EARNED',
          reasoning: 'Thread was addressed narratively',
        },
        {
          threadId: 'td-14',
          threadText: 'Rescue the prisoner',
          satisfactionLevel: 'ADEQUATE',
          reasoning: 'Resolved through dialogue',
        },
      ]);
      const context: PageBuildContext = {
        pageId: parsePageId(15),
        parentPageId: parsePageId(14),
        parentChoiceIndex: 1,
        parentAccumulatedActiveState: {
          currentLocation: 'Dungeon',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [
            { id: 'td-12', text: 'Explore the castle', threadType: 'QUEST', urgency: 'LOW' },
            { id: 'td-13', text: 'Find the hidden passage', threadType: 'MYSTERY', urgency: 'HIGH' },
            { id: 'td-14', text: 'Rescue the prisoner', threadType: 'QUEST', urgency: 'MEDIUM' },
          ],
        },
        parentAccumulatedInventory: [],
        parentAccumulatedHealth: [],
        parentAccumulatedCharacterState: {},
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
        storyBible: null,
        analystResult,
        parentThreadAges: { 'td-12': 3, 'td-13': 5, 'td-14': 2 },
        parentAccumulatedPromises: [],
        analystPromisesDetected: [],
        analystPromisesResolved: [],
        parentAccumulatedNpcAgendas: {},
        parentAccumulatedNpcRelationships: createEmptyAccumulatedNpcRelationships(),
        pageActIndex: 0,
        pageBeatIndex: 0,
      };

      const page = buildPage(result, context);

      // threadsResolved should be augmented with td-13 and td-14
      expect(page.activeStateChanges.threadsResolved).toEqual(['td-13', 'td-14']);

      // resolvedThreadMeta should have entries for both
      expect(page.resolvedThreadMeta).toEqual({
        'td-13': { threadType: 'MYSTERY', urgency: 'HIGH' },
        'td-14': { threadType: 'QUEST', urgency: 'MEDIUM' },
      });

      // openThreads should NOT contain td-13 or td-14
      const openThreadIds = page.accumulatedActiveState.openThreads.map((t) => t.id);
      expect(openThreadIds).not.toContain('td-13');
      expect(openThreadIds).not.toContain('td-14');
      expect(openThreadIds).toContain('td-12');
    });
  });
});
