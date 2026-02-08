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
import type { GenerationResult, WriterResult } from '@/llm/types';

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
            description: 'Find the first clue',
            objective: 'Establish the mystery',
          },
          {
            id: '1.2',
            description: 'Secure an ally',
            objective: 'Build support network',
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
            description: 'Infiltrate enemy territory',
            objective: 'Gather critical intel',
          },
        ],
      },
    ],
  };
}

function buildOpeningResult(): GenerationResult {
  return {
    narrative: 'You step into the fog-shrouded city as whispers follow your every step.',
    choices: ['Follow the whispers', 'Seek shelter in the tavern'],
    currentLocation: 'The fog-shrouded city entrance',
    threatsAdded: ['THREAT_whispers: The whispers seem to know your name'],
    threatsRemoved: [],
    constraintsAdded: [],
    constraintsRemoved: [],
    threadsAdded: ['THREAD_fog: The mystery of the whispering fog'],
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
    isEnding: false,
    beatConcluded: false,
    beatResolution: '',
    rawResponse: 'opening-raw',
  };
}

function buildContinuationResult(overrides?: Partial<WriterResult>): WriterResult {
  return {
    narrative: 'The whispers lead you deeper into the maze of alleys.',
    choices: ['Enter the marked door', 'Double back to the square'],
    currentLocation: 'Maze of alleys',
    threatsAdded: ['THREAT_shadows: Shadows move with purpose in the alleyways'],
    threatsRemoved: [],
    constraintsAdded: [],
    constraintsRemoved: [],
    threadsAdded: ['THREAD_door: The marked door mystery'],
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
    isEnding: false,
    rawResponse: 'continuation-raw',
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
          { description: 'Find emergency shelter', objective: 'Avoid immediate capture.' },
          { description: 'Establish new identity', objective: 'Move freely again.' },
        ],
      },
      {
        name: 'Act II Reframed',
        objective: 'Build new network.',
        stakes: 'Isolation means death.',
        entryCondition: 'New identity secured.',
        beats: [
          { description: 'Find underground contact', objective: 'Access resistance.' },
          { description: 'Prove loyalty', objective: 'Gain trust.' },
        ],
      },
      {
        name: 'Act III Reframed',
        objective: 'Strike back.',
        stakes: 'Final chance.',
        entryCondition: 'Network ready.',
        beats: [
          { description: 'Execute plan', objective: 'Destroy evidence.' },
          { description: 'Escape or die', objective: 'Survive the aftermath.' },
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
        choices: [createChoice('Go left'), createChoice('Go right')],
        inventoryChanges: { added: ['Torch'], removed: [] },
        healthChanges: { added: ['Minor fatigue'], removed: [] },
        characterStateChanges: [
          { characterName: 'Companion', added: ['Loyal'], removed: [] },
        ],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: createInitialStructureState(structure),
        structureVersionId: storyWithStructure.structureVersions?.[0]?.id ?? null,
      });
      await storage.savePage(storyWithStructure.id, parentPage);

      mockedGenerateWriterPage.mockResolvedValue(buildContinuationResult());
      mockedGenerateAnalystEvaluation.mockResolvedValue({
        beatConcluded: false,
        beatResolution: '',
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: '',
        rawResponse: 'analyst-raw',
      });

      const { page } = await generateNextPage(storyWithStructure, parentPage, 0, 'test-api-key');

      // Verify parent state was collected and passed to LLM
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect(mockedGenerateWriterPage).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          accumulatedInventory: expect.arrayContaining(['Torch']),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          accumulatedHealth: expect.arrayContaining(['Minor fatigue']),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          accumulatedCharacterState: expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            'Companion': expect.arrayContaining(['Loyal']),
          }),
        }),
        { apiKey: 'test-api-key' },
      );

      // Verify active state accumulates correctly
      expect(page.accumulatedActiveState.currentLocation).toBe('Maze of alleys');
      // Active state uses tagged entries with prefix/description/raw structure
      expect(page.accumulatedActiveState.activeThreats).toHaveLength(1);
      expect(page.accumulatedInventory).toContain('Torch');
      expect(page.accumulatedHealth).toContain('Minor fatigue');
      expect(page.accumulatedCharacterState['Companion']).toContain('Loyal');
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
      mockedGenerateAnalystEvaluation.mockResolvedValue({
        beatConcluded: false,
        beatResolution: '',
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: '',
        rawResponse: 'analyst-raw',
      });

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
      mockedGenerateAnalystEvaluation.mockResolvedValue({
        beatConcluded: false,
        beatResolution: '',
        deviationDetected: true,
        deviationReason: 'Betrayal invalidates trust-based beats.',
        invalidatedBeatIds: ['1.2', '2.1'],
        narrativeSummary: 'The protagonist chose betrayal.',
        rawResponse: 'analyst-raw',
      });

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
      mockedGenerateAnalystEvaluation.mockResolvedValue({
        beatConcluded: true,
        beatResolution: 'The first clue was found successfully.',
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: '',
        rawResponse: 'analyst-raw',
      });

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
  });
});
