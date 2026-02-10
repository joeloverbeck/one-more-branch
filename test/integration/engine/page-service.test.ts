import { generateAnalystEvaluation, generateOpeningPage, generateWriterPage } from '@/llm';
import {
  createChoice,
  createPage,
  createStory,
  parsePageId,
  StoryId,
  updateStoryStructure,
} from '@/models';
import { storage } from '@/persistence';
import {
  generateFirstPage,
  generateNextPage,
  getOrGeneratePage,
  createInitialStructureState,
} from '@/engine';
import type { StoryStructure } from '@/models/story-arc';
import { LLMError } from '@/llm/types';
import type { AnalystResult, WriterResult } from '@/llm/types';

jest.mock('@/llm', () => ({
  generateOpeningPage: jest.fn(),
  generateWriterPage: jest.fn(),
  generateAnalystEvaluation: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  mergeWriterAndAnalystResults: jest.requireActual('@/llm').mergeWriterAndAnalystResults,
}));

jest.mock('@/logging/index', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  logPrompt: jest.fn(),
}));

const mockedGenerateOpeningPage = generateOpeningPage as jest.MockedFunction<typeof generateOpeningPage>;
const mockedGenerateWriterPage = generateWriterPage as jest.MockedFunction<typeof generateWriterPage>;
const mockedGenerateAnalystEvaluation = generateAnalystEvaluation as jest.MockedFunction<
  typeof generateAnalystEvaluation
>;

const TEST_PREFIX = 'TEST PGSVC-INT page-service integration';

function buildStructure(): StoryStructure {
  return {
    overallTheme: 'Navigate political intrigue in a city of shadows.',
    premise: 'A courier uncovers a conspiracy while navigating rival factions.',
    pacingBudget: { targetPagesMin: 12, targetPagesMax: 24 },
    generatedAt: new Date('2026-01-01T00:00:00.000Z'),
    acts: [
      {
        id: '1',
        name: 'Discovery',
        objective: 'Uncover the conspiracy',
        stakes: 'Ignorance means death',
        entryCondition: 'Arrived in the city',
        beats: [
          {
            id: '1.1',
            name: 'First clue',
            description: 'Find the first clue',
            objective: 'Establish the mystery',
            role: 'setup',
          },
          {
            id: '1.2',
            name: 'Ally secured',
            description: 'Secure an ally',
            objective: 'Build support network',
            role: 'escalation',
          },
        ],
      },
      {
        id: '2',
        name: 'Escalation',
        objective: 'Confront the conspirators',
        stakes: 'Allies at risk',
        entryCondition: 'Evidence gathered',
        beats: [
          {
            id: '2.1',
            name: 'Enemy territory infiltration',
            description: 'Infiltrate enemy territory',
            objective: 'Gather critical intel',
            role: 'turning_point',
          },
        ],
      },
    ],
  };
}

function buildOpeningResult(): WriterResult {
  return {
    narrative: 'You step into the fog-shrouded city as whispers follow your every step.',
    choices: [
      { text: 'Follow the whispers', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
      { text: 'Seek shelter in the tavern', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
    ],
    currentLocation: 'The fog-shrouded city entrance',
    threatsAdded: ['THREAT_whispers: The whispers seem to know your name'],
    threatsRemoved: [],
    constraintsAdded: [],
    constraintsRemoved: [],
    threadsAdded: [{ text: 'THREAD_fog: The mystery of the whispering fog', threadType: 'INFORMATION', urgency: 'MEDIUM' }],
    threadsResolved: [],
    newCanonFacts: ['The city fog carries voices of the dead'],
    newCharacterCanonFacts: { 'The Watcher': ['Observes from the bell tower'] },
    inventoryAdded: ['Weathered map'],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    characterStateChangesAdded: [],
    characterStateChangesRemoved: [],
    protagonistAffect: {
      primaryEmotion: 'curiosity',
      primaryIntensity: 'moderate' as const,
      primaryCause: 'the mysterious whispers',
      secondaryEmotions: [],
      dominantMotivation: 'uncover the truth',
    },
    sceneSummary: 'Test summary of the scene events and consequences.',
    isEnding: false,
    rawResponse: 'opening-raw',
  };
}

function buildContinuationResult(overrides?: Partial<WriterResult>): WriterResult {
  return {
    narrative: 'The whispers lead you deeper into the maze of alleys.',
    choices: [
      { text: 'Enter the marked door', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
      { text: 'Double back to the square', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
    ],
    currentLocation: 'Maze of alleys',
    threatsAdded: ['THREAT_shadows: Shadows move with purpose in the alleyways'],
    threatsRemoved: [],
    constraintsAdded: [],
    constraintsRemoved: [],
    threadsAdded: [{ text: 'THREAD_door: The marked door mystery', threadType: 'INFORMATION', urgency: 'MEDIUM' }],
    threadsResolved: [],
    newCanonFacts: ['Marked doors hide resistance cells'],
    newCharacterCanonFacts: {},
    inventoryAdded: [],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    characterStateChangesAdded: [],
    characterStateChangesRemoved: [],
    protagonistAffect: {
      primaryEmotion: 'determination',
      primaryIntensity: 'strong' as const,
      primaryCause: 'getting closer to the truth',
      secondaryEmotions: [],
      dominantMotivation: 'reach the resistance',
    },
    sceneSummary: 'Test summary of the scene events and consequences.',
    isEnding: false,
    rawResponse: 'continuation-raw',
    ...overrides,
  };
}

function buildAnalystResult(overrides?: Partial<AnalystResult>): AnalystResult {
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
    sceneMomentum: 'STASIS',
    objectiveEvidenceStrength: 'NONE',
    commitmentStrength: 'NONE',
    structuralPositionSignal: 'WITHIN_ACTIVE_BEAT',
    entryConditionReadiness: 'NOT_READY',
    objectiveAnchors: ['Establish the mystery'],
    anchorEvidence: [''],
    completionGateSatisfied: false,
    completionGateFailureReason: '',
    rawResponse: 'analyst-raw',
    ...overrides,
  };
}

function createRewriteFetchResponse(): Response {
  const rewrittenStructure = {
    overallTheme: 'Survive after betrayal.',
    acts: [
      {
        name: 'Act I Reframed',
        objective: 'Escape the hunters.',
        stakes: 'Capture means execution.',
        entryCondition: 'Cover blown.',
        beats: [
          { name: 'Emergency shelter', description: 'Find emergency shelter', objective: 'Avoid immediate capture.' },
          { name: 'New identity', description: 'Establish new identity', objective: 'Move freely again.' },
        ],
      },
      {
        name: 'Act II Reframed',
        objective: 'Build new network.',
        stakes: 'Isolation means death.',
        entryCondition: 'New identity secured.',
        beats: [
          { name: 'Underground contact', description: 'Find underground contact', objective: 'Access resistance.' },
          { name: 'Loyalty proof', description: 'Prove loyalty', objective: 'Gain trust.' },
        ],
      },
      {
        name: 'Act III Reframed',
        objective: 'Strike back.',
        stakes: 'Final chance.',
        entryCondition: 'Network ready.',
        beats: [
          { name: 'Plan execution', description: 'Execute plan', objective: 'Destroy evidence.' },
          { name: 'Escape route', description: 'Escape or die', objective: 'Survive the aftermath.' },
        ],
      },
    ],
  };

  return {
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        choices: [{ message: { content: JSON.stringify(rewrittenStructure) } }],
      }),
  } as Response;
}

describe('page-service integration', () => {
  const createdStoryIds = new Set<StoryId>();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue(createRewriteFetchResponse()) as typeof fetch;
  });

  afterEach(async () => {
    for (const storyId of createdStoryIds) {
      try {
        await storage.deleteStory(storyId);
      } catch {
        // Ignore cleanup failures
      }
    }
    createdStoryIds.clear();
    jest.restoreAllMocks();

    // Clean up any leaked test stories
    const stories = await storage.listStories();
    for (const storyMeta of stories) {
      const story = await storage.loadStory(storyMeta.id);
      if (story?.characterConcept.startsWith(TEST_PREFIX)) {
        try {
          await storage.deleteStory(story.id);
        } catch {
          // Ignore cleanup failures
        }
      }
    }
  });

  describe('generateFirstPage integration', () => {
    it('assembles page with correct structure state for structured stories', async () => {
      const structure = buildStructure();
      const baseStory = createStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} structured-first-page`,
        worldbuilding: 'A city where shadows have memory.',
        tone: 'dark mystery',
      });
      const storyWithStructure = updateStoryStructure(baseStory, structure);
      await storage.saveStory(storyWithStructure);
      createdStoryIds.add(storyWithStructure.id);

      mockedGenerateOpeningPage.mockResolvedValue(buildOpeningResult());

      const { page, updatedStory } = await generateFirstPage(storyWithStructure, 'test-api-key');
      for (const act of storyWithStructure.structure?.acts ?? []) {
        for (const beat of act.beats) {
          expect(beat.name).toBeTruthy();
        }
      }

      // Verify page assembly
      expect(page.id).toBe(1);
      expect(page.narrativeText).toContain('fog-shrouded city');
      expect(page.choices).toHaveLength(2);
      expect(page.parentPageId).toBeNull();
      expect(page.parentChoiceIndex).toBeNull();

      // Verify structure state initialization
      expect(page.accumulatedStructureState.currentActIndex).toBe(0);
      expect(page.accumulatedStructureState.currentBeatIndex).toBe(0);
      expect(page.accumulatedStructureState.beatProgressions).toContainEqual({
        beatId: '1.1',
        status: 'active',
      });

      // Verify structure version ID assignment
      expect(page.structureVersionId).not.toBeNull();
      expect(page.structureVersionId).toBe(storyWithStructure.structureVersions?.[0]?.id);

      // Verify inventory changes
      expect(page.inventoryChanges.added).toContain('Weathered map');

      // Verify canon updates
      expect(updatedStory.globalCanon).toContain('The city fog carries voices of the dead');
      expect(updatedStory.globalCharacterCanon['The Watcher']).toContain('Observes from the bell tower');
    });

    it('uses empty structure state for unstructured stories', async () => {
      const baseStory = createStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} unstructured-first-page`,
        worldbuilding: 'A freeform world.',
        tone: 'adventurous',
      });
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      mockedGenerateOpeningPage.mockResolvedValue(buildOpeningResult());

      const { page } = await generateFirstPage(baseStory, 'test-api-key');

      // Verify empty structure state for unstructured story
      expect(page.accumulatedStructureState).toEqual({
        currentActIndex: 0,
        currentBeatIndex: 0,
        beatProgressions: [],
        pagesInCurrentBeat: 0,
        pacingNudge: null,
      });
      expect(page.structureVersionId).toBeNull();
    });

    it('updates story with canon facts from LLM result', async () => {
      const baseStory = createStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} canon-update`,
        worldbuilding: 'A world of secrets.',
        tone: 'mysterious',
      });
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      mockedGenerateOpeningPage.mockResolvedValue({
        ...buildOpeningResult(),
        newCanonFacts: ['Fact One', 'Fact Two'],
        newCharacterCanonFacts: {
          'Hero': ['Has a scar'],
          'Villain': ['Wears a mask'],
        },
      });

      const { updatedStory } = await generateFirstPage(baseStory, 'test-api-key');

      expect(updatedStory.globalCanon).toContain('Fact One');
      expect(updatedStory.globalCanon).toContain('Fact Two');
      expect(updatedStory.globalCharacterCanon['Hero']).toContain('Has a scar');
      expect(updatedStory.globalCharacterCanon['Villain']).toContain('Wears a mask');
    });
  });

  describe('generateNextPage integration', () => {
    it('collects all parent accumulated state correctly', async () => {
      const structure = buildStructure();
      const baseStory = createStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} parent-state-collection`,
        worldbuilding: 'A city of layers.',
        tone: 'intrigue',
      });
      const storyWithStructure = updateStoryStructure(baseStory, structure);
      await storage.saveStory(storyWithStructure);
      createdStoryIds.add(storyWithStructure.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'The journey begins.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Go left'), createChoice('Go right')],
        inventoryChanges: { added: ['Torch'], removed: [] },
        healthChanges: { added: ['Minor fatigue'], removed: [] },
        characterStateChanges: {
          added: [{ characterName: 'Companion', states: ['Loyal'] }],
          removed: [],
        },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: createInitialStructureState(structure),
        structureVersionId: storyWithStructure.structureVersions?.[0]?.id ?? null,
      });
      await storage.savePage(storyWithStructure.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());
      mockedGenerateAnalystEvaluation.mockResolvedValue(buildAnalystResult());

      const { page } = await generateNextPage(storyWithStructure, parentPage, 0, 'test-api-key');

      // Verify parent state was collected and passed to LLM
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect(mockedGenerateWriterPage).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          accumulatedInventory: expect.arrayContaining([expect.objectContaining({ text: 'Torch' })]),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          accumulatedHealth: expect.arrayContaining([expect.objectContaining({ text: 'Minor fatigue' })]),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          accumulatedCharacterState: expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            'Companion': expect.arrayContaining([expect.objectContaining({ text: 'Loyal' })]),
          }),
        }),
        expect.objectContaining({
          apiKey: 'test-api-key',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          writerValidationContext: expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            removableIds: expect.objectContaining({
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              threats: expect.any(Array),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              constraints: expect.any(Array),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              threads: expect.any(Array),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              inventory: expect.any(Array),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              health: expect.any(Array),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              characterState: expect.any(Array),
            }),
          }),
        }),
      );
      const writerOptions = mockedGenerateWriterPage.mock.calls[0]?.[1];
      expect(writerOptions?.observability).toEqual({
        storyId: storyWithStructure.id,
        pageId: parentPage.id,
      });

      // Verify active state accumulates correctly
      expect(page.accumulatedActiveState.currentLocation).toBe('Maze of alleys');
      expect(page.accumulatedActiveState.activeThreats).toHaveLength(1);
      expect(page.accumulatedInventory).toEqual(
        expect.arrayContaining([expect.objectContaining({ text: 'Torch' })]),
      );
      expect(page.accumulatedHealth).toEqual(
        expect.arrayContaining([expect.objectContaining({ text: 'Minor fatigue' })]),
      );
      expect(page.accumulatedCharacterState['Companion']).toEqual(
        expect.arrayContaining([expect.objectContaining({ text: 'Loyal' })]),
      );
    });

    it('passes npcs from story to writer prompt after disk roundtrip', async () => {
      const baseStory = createStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} npcs-passthrough`,
        worldbuilding: 'A world with memorable characters.',
        tone: 'dramatic',
        npcs: [{ name: 'Holt', description: 'Grizzled barkeep who knows everyone' }],
      });
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      // Reload from disk to prove persistence roundtrip
      const reloadedStory = await storage.loadStory(baseStory.id);
      expect(reloadedStory).not.toBeNull();
      expect(reloadedStory!.npcs).toEqual([{ name: 'Holt', description: 'Grizzled barkeep who knows everyone' }]);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Holt pours you a drink.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Ask about the rumor'), createChoice('Leave quietly')],
        stateChanges: { added: ['Met Holt'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      await storage.savePage(reloadedStory!.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());

      await generateNextPage(reloadedStory!, parentPage, 0, 'test-api-key');

      expect(mockedGenerateWriterPage).toHaveBeenCalledWith(
        expect.objectContaining({
          npcs: [{ name: 'Holt', description: 'Grizzled barkeep who knows everyone' }],
        }),
        expect.objectContaining({
          apiKey: 'test-api-key',
        }),
      );
      const writerOptions = mockedGenerateWriterPage.mock.calls[0]?.[1];
      expect(writerOptions?.observability).toEqual({
        storyId: reloadedStory!.id,
        pageId: parentPage.id,
      });
    });

    it('uses parent structureVersionId for branch isolation', async () => {
      const structure = buildStructure();
      const baseStory = createStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} branch-isolation`,
        worldbuilding: 'A branching world.',
        tone: 'complex',
      });
      const storyWithStructure = updateStoryStructure(baseStory, structure);
      const initialVersionId = storyWithStructure.structureVersions?.[0]?.id ?? null;
      await storage.saveStory(storyWithStructure);
      createdStoryIds.add(storyWithStructure.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'At the crossroads.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Path A'), createChoice('Path B')],
        stateChanges: { added: ['Reached crossroads'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: createInitialStructureState(structure),
        structureVersionId: initialVersionId,
      });
      await storage.savePage(storyWithStructure.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());
      mockedGenerateAnalystEvaluation.mockResolvedValue(buildAnalystResult());

      const { page } = await generateNextPage(storyWithStructure, parentPage, 0, 'test-api-key');

      // Child page inherits parent's structure version
      expect(page.structureVersionId).toBe(initialVersionId);
    });

    it('triggers structure rewrite on deviation and creates new version', async () => {
      const structure = buildStructure();
      const baseStory = createStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} deviation-rewrite`,
        worldbuilding: 'A mutable world.',
        tone: 'dramatic',
      });
      const storyWithStructure = updateStoryStructure(baseStory, structure);
      const initialVersionId = storyWithStructure.structureVersions?.[0]?.id ?? null;
      await storage.saveStory(storyWithStructure);
      createdStoryIds.add(storyWithStructure.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'A pivotal moment.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Betray allies'), createChoice('Stay loyal')],
        stateChanges: { added: ['At pivotal moment'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: createInitialStructureState(structure),
        structureVersionId: initialVersionId,
      });
      await storage.savePage(storyWithStructure.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());
      mockedGenerateAnalystEvaluation.mockResolvedValue(
        buildAnalystResult({
          deviationDetected: true,
          deviationReason: 'Betrayal invalidates trust-based beats.',
          invalidatedBeatIds: ['1.2', '2.1'],
          narrativeSummary: 'The protagonist chose betrayal.',
        }),
      );

      const { page, updatedStory, deviationInfo } = await generateNextPage(
        storyWithStructure,
        parentPage,
        0,
        'test-api-key',
      );

      // Verify new structure version was created
      expect(updatedStory.structureVersions).toHaveLength(2);
      const newVersion = updatedStory.structureVersions?.[1];
      expect(newVersion?.previousVersionId).toBe(initialVersionId);
      expect(newVersion?.rewriteReason).toBe('Betrayal invalidates trust-based beats.');
      expect(newVersion?.createdAtPageId).toBe(page.id);

      // Verify page uses new version
      expect(page.structureVersionId).toBe(newVersion?.id);
      expect(page.structureVersionId).not.toBe(initialVersionId);

      // Verify deviationInfo is returned
      expect(deviationInfo).toBeDefined();
      expect(deviationInfo?.detected).toBe(true);
      expect(deviationInfo?.reason).toBe('Betrayal invalidates trust-based beats.');
      expect(deviationInfo?.beatsInvalidated).toBe(2);
    });

    it('advances structure state when beat is concluded', async () => {
      const structure = buildStructure();
      const baseStory = createStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} beat-advancement`,
        worldbuilding: 'A progressing world.',
        tone: 'epic',
      });
      const storyWithStructure = updateStoryStructure(baseStory, structure);
      await storage.saveStory(storyWithStructure);
      createdStoryIds.add(storyWithStructure.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Working on the first beat.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Complete the beat'), createChoice('Wait for opportunity')],
        stateChanges: { added: ['Working on beat'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: createInitialStructureState(structure),
        structureVersionId: storyWithStructure.structureVersions?.[0]?.id ?? null,
      });
      await storage.savePage(storyWithStructure.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());
      mockedGenerateAnalystEvaluation.mockResolvedValue(
        buildAnalystResult({
          beatConcluded: true,
          beatResolution: 'The first clue was found successfully.',
          objectiveEvidenceStrength: 'CLEAR_EXPLICIT',
          completionGateSatisfied: true,
          objectiveAnchors: ['Establish the mystery'],
          anchorEvidence: ['The first clue was found successfully.'],
        }),
      );

      const { page } = await generateNextPage(storyWithStructure, parentPage, 0, 'test-api-key');

      // Verify beat advancement
      expect(page.accumulatedStructureState.currentBeatIndex).toBe(1);
      expect(page.accumulatedStructureState.beatProgressions).toContainEqual({
        beatId: '1.1',
        status: 'concluded',
        resolution: 'The first clue was found successfully.',
      });
      expect(page.accumulatedStructureState.beatProgressions).toContainEqual({
        beatId: '1.2',
        status: 'active',
      });
    });

    it('action-heavy scene without explicit objective evidence does not conclude beat', async () => {
      const structure = buildStructure();
      const baseStory = createStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} gating-false-positive`,
        worldbuilding: 'A war-torn capital with collapsing checkpoints.',
        tone: 'high-intensity thriller',
      });
      const storyWithStructure = updateStoryStructure(baseStory, structure);
      await storage.saveStory(storyWithStructure);
      createdStoryIds.add(storyWithStructure.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'The team races through exploding streets to reach the archive.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Rush the archive gate'), createChoice('Take rooftop route')],
        stateChanges: { added: ['Under pursuit'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: createInitialStructureState(structure),
        structureVersionId: storyWithStructure.structureVersions?.[0]?.id ?? null,
      });
      await storage.savePage(storyWithStructure.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(
        buildContinuationResult({
          narrative:
            'Gunfire tears across the boulevard as the team sprints between burning vehicles and collapsing barricades.',
        }),
      );
      mockedGenerateAnalystEvaluation.mockResolvedValue(
        buildAnalystResult({
          beatConcluded: false,
          sceneMomentum: 'MAJOR_PROGRESS',
          objectiveEvidenceStrength: 'WEAK_IMPLICIT',
          commitmentStrength: 'TENTATIVE',
          structuralPositionSignal: 'WITHIN_ACTIVE_BEAT',
          entryConditionReadiness: 'PARTIAL',
          objectiveAnchors: ['Establish the mystery'],
          anchorEvidence: [''],
          completionGateSatisfied: false,
          completionGateFailureReason: 'Action escalation occurred without explicit objective completion.',
        }),
      );

      const { page } = await generateNextPage(storyWithStructure, parentPage, 0, 'test-api-key');

      expect(page.accumulatedStructureState.currentActIndex).toBe(0);
      expect(page.accumulatedStructureState.currentBeatIndex).toBe(0);
      expect(page.accumulatedStructureState.beatProgressions).toContainEqual({
        beatId: '1.1',
        status: 'active',
      });
      expect(page.accumulatedStructureState.beatProgressions).not.toContainEqual(
        expect.objectContaining({ beatId: '1.1', status: 'concluded' }),
      );
    });

    it('turning_point with explicit commitment and anchor evidence can conclude beat', async () => {
      const baseStructure = buildStructure();
      const structure: StoryStructure = {
        ...baseStructure,
        acts: [
          {
            ...baseStructure.acts[0],
            beats: [
              {
                ...baseStructure.acts[0]!.beats[0]!,
                role: 'turning_point',
                objective: 'Publicly commit to exposing the conspiracy',
              },
              baseStructure.acts[0]!.beats[1]!,
            ],
          },
          baseStructure.acts[1]!,
        ],
      };
      const baseStory = createStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} gating-turning-point`,
        worldbuilding: 'A capital where every vow is a political weapon.',
        tone: 'political thriller',
      });
      const storyWithStructure = updateStoryStructure(baseStory, structure);
      await storage.saveStory(storyWithStructure);
      createdStoryIds.add(storyWithStructure.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'The council chamber waits in tense silence.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Make the accusation publicly'), createChoice('Delay and gather more proof')],
        stateChanges: { added: ['Conspiracy evidence prepared'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: createInitialStructureState(structure),
        structureVersionId: storyWithStructure.structureVersions?.[0]?.id ?? null,
      });
      await storage.savePage(storyWithStructure.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(
        buildContinuationResult({
          narrative:
            'Before the full council, you name the conspirators and swear to release the ledgers, accepting exile if you fail.',
        }),
      );
      mockedGenerateAnalystEvaluation.mockResolvedValue(
        buildAnalystResult({
          beatConcluded: true,
          beatResolution: 'The protagonist publicly commits to exposing the conspiracy despite irreversible consequences.',
          sceneMomentum: 'MAJOR_PROGRESS',
          objectiveEvidenceStrength: 'CLEAR_EXPLICIT',
          commitmentStrength: 'EXPLICIT_IRREVERSIBLE',
          structuralPositionSignal: 'BRIDGING_TO_NEXT_BEAT',
          entryConditionReadiness: 'READY',
          objectiveAnchors: ['Publicly commit to exposing the conspiracy'],
          anchorEvidence: ['You publicly accuse the conspirators and swear to release the ledgers.'],
          completionGateSatisfied: true,
        }),
      );

      const { page } = await generateNextPage(storyWithStructure, parentPage, 0, 'test-api-key');

      expect(page.accumulatedStructureState.currentBeatIndex).toBe(1);
      expect(page.accumulatedStructureState.beatProgressions).toContainEqual({
        beatId: '1.1',
        status: 'concluded',
        resolution:
          'The protagonist publicly commits to exposing the conspiracy despite irreversible consequences.',
      });
      expect(page.accumulatedStructureState.beatProgressions).toContainEqual({
        beatId: '1.2',
        status: 'active',
      });
    });

    it.each([
      {
        label: 'political thriller',
        concept: 'A whistleblower tries to survive a corrupt ministry purge.',
        worldbuilding: 'A surveillance state where ministries erase dissent overnight.',
        tone: 'tense political thriller',
        narrative:
          'Black sedans close in as leaked dossiers trigger a citywide crackdown, but no proof reaches the tribunal yet.',
      },
      {
        label: 'wilderness survival',
        concept: 'A stranded climber searches for a pass before winter closes in.',
        worldbuilding: 'An alpine range with unstable weather and no rescue corridor.',
        tone: 'gritty survival drama',
        narrative:
          'An avalanche forces a desperate sprint across breaking ice, but no secure route beyond the ridge is established.',
      },
      {
        label: 'romance drama',
        concept: 'Former lovers navigate a high-stakes reunion amid family pressure.',
        worldbuilding: 'A coastal city where family alliances shape every relationship.',
        tone: 'emotional romance drama',
        narrative:
          'The reunion erupts into confessions and confrontation, but neither character makes an explicit commitment to rebuild trust.',
      },
    ])('applies the same completion-gate semantics for $label domain scenarios', async scenario => {
      const structure = buildStructure();
      const baseStory = createStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} cross-domain-${scenario.label}`,
        worldbuilding: scenario.worldbuilding,
        tone: scenario.tone,
      });
      const storyWithStructure = updateStoryStructure(baseStory, structure);
      await storage.saveStory(storyWithStructure);
      createdStoryIds.add(storyWithStructure.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: scenario.concept,
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Push forward under pressure'), createChoice('Hold position and reassess')],
        stateChanges: { added: ['Pressure escalates'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: createInitialStructureState(structure),
        structureVersionId: storyWithStructure.structureVersions?.[0]?.id ?? null,
      });
      await storage.savePage(storyWithStructure.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult({ narrative: scenario.narrative }));
      mockedGenerateAnalystEvaluation.mockResolvedValue(
        buildAnalystResult({
          beatConcluded: false,
          sceneMomentum: 'MAJOR_PROGRESS',
          objectiveEvidenceStrength: 'WEAK_IMPLICIT',
          commitmentStrength: 'TENTATIVE',
          structuralPositionSignal: 'WITHIN_ACTIVE_BEAT',
          entryConditionReadiness: 'PARTIAL',
          objectiveAnchors: ['Establish the mystery'],
          anchorEvidence: [''],
          completionGateSatisfied: false,
          completionGateFailureReason: 'Escalation alone is insufficient without explicit objective evidence.',
        }),
      );

      const { page } = await generateNextPage(storyWithStructure, parentPage, 0, 'test-api-key');

      expect(page.accumulatedStructureState.currentActIndex).toBe(0);
      expect(page.accumulatedStructureState.currentBeatIndex).toBe(0);
      expect(page.accumulatedStructureState.beatProgressions).toContainEqual({
        beatId: '1.1',
        status: 'active',
      });
      expect(page.accumulatedStructureState.beatProgressions).not.toContainEqual(
        expect.objectContaining({ beatId: '1.1', status: 'concluded' }),
      );
    });
  });

  describe('getOrGeneratePage integration', () => {
    it('persists page and updates choice link correctly', async () => {
      const baseStory = createStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} persistence-test`,
        worldbuilding: 'A persistent world.',
        tone: 'adventure',
      });
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'The starting point.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Explore'), createChoice('Wait')],
        stateChanges: { added: ['Started'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      await storage.savePage(baseStory.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());

      const result = await getOrGeneratePage(baseStory, parentPage, 0, 'test-api-key');

      // Verify generation occurred
      expect(result.wasGenerated).toBe(true);
      expect(result.page.id).toBe(2);
      expect(result.page.parentPageId).toBe(1);
      expect(result.page.parentChoiceIndex).toBe(0);

      // Verify page was persisted
      const loadedPage = await storage.loadPage(baseStory.id, result.page.id);
      expect(loadedPage).not.toBeNull();
      expect(loadedPage?.narrativeText).toBe(result.page.narrativeText);

      // Verify choice link was updated
      const updatedParent = await storage.loadPage(baseStory.id, parentPage.id);
      expect(updatedParent?.choices[0]?.nextPageId).toBe(result.page.id);
    });

    it('returns cached page without regeneration', async () => {
      const baseStory = createStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} cache-test`,
        worldbuilding: 'A cached world.',
        tone: 'replay',
      });
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Root page.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Already explored', parsePageId(2)), createChoice('New path')],
        stateChanges: { added: ['At root'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      await storage.savePage(baseStory.id, parentPage);

      const existingChildPage = createPage({
        id: parsePageId(2),
        narrativeText: 'Previously generated content.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Continue'), createChoice('Go back')],
        stateChanges: { added: ['Explored before'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
      });
      await storage.savePage(baseStory.id, existingChildPage);

      // Call getOrGeneratePage for already-linked choice
      const result = await getOrGeneratePage(baseStory, parentPage, 0, 'test-api-key');

      // Verify no regeneration
      expect(result.wasGenerated).toBe(false);
      expect(result.page.id).toBe(2);
      expect(result.page.narrativeText).toBe('Previously generated content.');
      expect(mockedGenerateWriterPage).not.toHaveBeenCalled();
    });

    it('persists story when canon is updated', async () => {
      const baseStory = createStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} canon-persistence`,
        worldbuilding: 'A world with growing lore.',
        tone: 'epic',
      });
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'The lore begins.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Discover more'), createChoice('Rest first')],
        stateChanges: { added: ['Started'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      await storage.savePage(baseStory.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue({
        ...buildContinuationResult(),
        newCanonFacts: ['A new world fact discovered'],
        newCharacterCanonFacts: { 'Sage': ['Knows ancient secrets'] },
      });

      const result = await getOrGeneratePage(baseStory, parentPage, 0, 'test-api-key');

      // Verify story was updated with new canon
      expect(result.story.globalCanon).toContain('A new world fact discovered');
      expect(result.story.globalCharacterCanon['Sage']).toContain('Knows ancient secrets');

      // Verify persistence
      const reloadedStory = await storage.loadStory(baseStory.id);
      expect(reloadedStory?.globalCanon).toContain('A new world fact discovered');
      expect(reloadedStory?.globalCharacterCanon['Sage']).toContain('Knows ancient secrets');
    });

    it('does not persist page or choice link when writer validation fails', async () => {
      const baseStory = createStory({
        title: `${TEST_PREFIX} Title`,
        characterConcept: `${TEST_PREFIX} validation-failure`,
        worldbuilding: 'A world with strict validation.',
        tone: 'tense',
      });
      await storage.saveStory(baseStory);
      createdStoryIds.add(baseStory.id);

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Parent page.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Explore'), createChoice('Wait')],
        stateChanges: { added: ['Started'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      await storage.savePage(baseStory.id, parentPage);

      mockedGenerateWriterPage.mockRejectedValue(
        new LLMError('Deterministic validation failed', 'VALIDATION_ERROR', false, {
          ruleKeys: ['writer_output.choice_pair.duplicate'],
          validationIssues: [
            {
              ruleKey: 'writer_output.choice_pair.duplicate',
              fieldPath: 'choices[1]',
            },
          ],
        }),
      );

      await expect(getOrGeneratePage(baseStory, parentPage, 0, 'test-api-key')).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
      });

      const child = await storage.loadPage(baseStory.id, parsePageId(2));
      expect(child).toBeNull();

      const parentAfter = await storage.loadPage(baseStory.id, parentPage.id);
      expect(parentAfter?.choices[0]?.nextPageId).toBeNull();
    });
  });
});
