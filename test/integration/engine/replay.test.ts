import { StoryEngine, storyEngine } from '@/engine';
import {
  generatePageWriterOutput,
  generateAnalystEvaluation,
  generateOpeningPage,
  generatePagePlan,
  generateStateAccountant,
  generateStoryStructure,
} from '@/llm';
import type { PageWriterResult } from '@/llm/writer-types';
import { reconcileState } from '@/engine/state-reconciler';
import type { StateReconciliationResult } from '@/engine/state-reconciler-types';
import { parsePageId, StoryId } from '@/models';
import type { StorySpine } from '@/models';
import {
  createMockAnalystResult,
  createMockProtagonistAffect,
  createMockFinalResult,
} from '../../fixtures/llm-results';

jest.mock('@/llm', () => ({
  generateOpeningPage: jest.fn(),
  generatePageWriterOutput: jest.fn(),
  generateAnalystEvaluation: jest.fn(),
  generatePagePlan: jest.fn(),
  generateStateAccountant: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  mergePageWriterAndReconciledStateWithAnalystResults:
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    jest.requireActual('@/llm').mergePageWriterAndReconciledStateWithAnalystResults,
  generateStoryStructure: jest.fn(),
  decomposeEntities: jest.fn().mockResolvedValue({
    decomposedCharacters: [],
    decomposedWorld: { facts: [], rawWorldbuilding: '' },
    rawResponse: '{}',
  }),
}));

jest.mock('@/logging/index', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  logPrompt: jest.fn(),
}));

jest.mock('@/engine/state-reconciler', () => ({
  reconcileState: jest.fn(),
}));

const mockedGenerateOpeningPage = generateOpeningPage as jest.MockedFunction<
  typeof generateOpeningPage
>;
const mockedGenerateWriterPage = generatePageWriterOutput as jest.MockedFunction<
  typeof generatePageWriterOutput
>;
const mockedGenerateAnalystEvaluation = generateAnalystEvaluation as jest.MockedFunction<
  typeof generateAnalystEvaluation
>;
const mockedGeneratePagePlan = generatePagePlan as jest.MockedFunction<typeof generatePagePlan>;
const mockedGenerateStateAccountant = generateStateAccountant as jest.MockedFunction<
  typeof generateStateAccountant
>;
const mockedGenerateStoryStructure = generateStoryStructure as jest.MockedFunction<
  typeof generateStoryStructure
>;
const mockedReconcileState = reconcileState as jest.MockedFunction<typeof reconcileState>;

const TEST_PREFIX = 'TEST STOENG-008 replay integration';

type ReconciliationWriterPayload = PageWriterResult &
  Omit<StateReconciliationResult, 'currentLocation' | 'reconciliationDiagnostics'> & {
    currentLocation?: string | null;
  };

function passthroughReconciledState(
  writer: ReconciliationWriterPayload,
  previousLocation: string
): StateReconciliationResult {
  return {
    currentLocation: writer.currentLocation ?? previousLocation,
    threatsAdded: [...writer.threatsAdded],
    threatsRemoved: [...writer.threatsRemoved],
    constraintsAdded: [...writer.constraintsAdded],
    constraintsRemoved: [...writer.constraintsRemoved],
    threadsAdded: [...writer.threadsAdded],
    threadsResolved: [...writer.threadsResolved],
    inventoryAdded: [...writer.inventoryAdded],
    inventoryRemoved: [...writer.inventoryRemoved],
    healthAdded: [...writer.healthAdded],
    healthRemoved: [...writer.healthRemoved],
    characterStateChangesAdded: [...writer.characterStateChangesAdded],
    characterStateChangesRemoved: [...writer.characterStateChangesRemoved],
    newCanonFacts: [...writer.newCanonFacts],
    newCharacterCanonFacts: writer.newCharacterCanonFacts,
    reconciliationDiagnostics: [],
  };
}
const mockedStructureResult = {
  overallTheme: 'Decode Brightwater’s reflected constellation.',
  acts: [
    {
      name: 'Act I',
      objective: 'Spot the anomaly.',
      stakes: 'Failure hides the true pattern.',
      entryCondition: 'The constellation appears at dawn.',
      beats: [
        { description: 'Track mirrored stars', objective: 'Map first pattern.' },
        { description: 'Verify source', objective: 'Confirm where distortions begin.' },
      ],
    },
    {
      name: 'Act II',
      objective: 'Escalate investigation.',
      stakes: 'Failure loses time before festival ends.',
      entryCondition: 'The first pattern reveals hidden routes.',
      beats: [
        { description: 'Test hidden route', objective: 'Access restricted area.' },
        { description: 'Protect evidence', objective: 'Avoid losing collected proof.' },
      ],
    },
    {
      name: 'Act III',
      objective: 'Conclude the mystery.',
      stakes: 'Failure leaves Brightwater unstable.',
      entryCondition: 'All key clues align.',
      beats: [
        { description: 'Choose final interpretation', objective: 'Commit to a theory.' },
        { description: 'Resolve the anomaly', objective: 'Stabilize the city.' },
      ],
    },
  ],
  rawResponse: 'structure',
};

const mockSpine: StorySpine = {
  centralDramaticQuestion: 'Can justice survive in a corrupt system?',
  protagonistNeedVsWant: { need: 'truth', want: 'safety', dynamic: 'DIVERGENT' },
  primaryAntagonisticForce: {
    description: 'The corrupt tribunal',
    pressureMechanism: 'Controls all records and courts',
  },
  storySpineType: 'MYSTERY',
  conflictAxis: 'INDIVIDUAL_VS_SYSTEM',
  conflictType: 'PERSON_VS_SOCIETY',
  characterArcType: 'POSITIVE_CHANGE',
  toneFeel: ['grim', 'tense', 'political'],
  toneAvoid: ['whimsical', 'comedic'],
};

const openingResult = createMockFinalResult({
  narrative:
    'At first bell you cross the bridge into Brightwater and the river mirrors an unfamiliar constellation that shifts whenever you speak your own name.',
  choices: [
    {
      text: 'Follow the mirrored stars',
      choiceType: 'TACTICAL_APPROACH',
      primaryDelta: 'GOAL_SHIFT',
    },
    {
      text: 'Consult the archivist',
      choiceType: 'INVESTIGATION',
      primaryDelta: 'INFORMATION_REVEALED',
    },
  ],
  protagonistAffect: createMockProtagonistAffect({
    primaryEmotion: 'curious',
    primaryIntensity: 'moderate',
    primaryCause: 'The unfamiliar constellation in the river',
    secondaryEmotions: [],
    dominantMotivation: 'Understand the strange phenomenon',
  }),
  sceneSummary: 'Test summary of the scene events and consequences.',
  isEnding: false,
  rawResponse: 'opening',
  currentLocation: 'Brightwater bridge',
  threadsAdded: [
    {
      text: 'THREAD_CONSTELLATION: Investigate the mirrored constellation',
      threadType: 'INFORMATION',
      urgency: 'MEDIUM',
    },
  ],
});

const writerResult = createMockFinalResult({
  narrative:
    'You pursue the mirrored stars along the embankment until engraved mile markers begin counting backward and a hidden gate rises from the riverbank.',
  choices: [
    { text: 'Open the hidden gate', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
    {
      text: 'Mark the location and retreat',
      choiceType: 'INVESTIGATION',
      primaryDelta: 'INFORMATION_REVEALED',
    },
  ],
  protagonistAffect: createMockProtagonistAffect({
    primaryEmotion: 'intrigued',
    primaryIntensity: 'strong',
    primaryCause: 'Discovery of the hidden gate',
    secondaryEmotions: [],
    dominantMotivation: 'Uncover what lies beyond the gate',
  }),
  sceneSummary: 'Test summary of the scene events and consequences.',
  isEnding: false,
  rawResponse: 'continuation',
  currentLocation: 'Riverside embankment',
  threadsAdded: [
    { text: 'THREAD_GATE: Explore the hidden gate', threadType: 'INFORMATION', urgency: 'MEDIUM' },
  ],
});

const defaultAnalystResult = createMockAnalystResult({
  beatConcluded: false,
  sceneMomentum: 'STASIS',
  objectiveEvidenceStrength: 'NONE',
  commitmentStrength: 'NONE',
});

describe('story replay integration', () => {
  const createdStoryIds = new Set<StoryId>();

  beforeEach(() => {
    jest.clearAllMocks();
    storyEngine.init();

    mockedGenerateStoryStructure.mockResolvedValue(mockedStructureResult);
    mockedGeneratePagePlan.mockResolvedValue({
      sceneIntent: 'Progress the current scene with immediate consequences.',
      continuityAnchors: [],
      writerBrief: {
        openingLineDirective: 'Start with immediate action.',
        mustIncludeBeats: [],
        forbiddenRecaps: [],
      },
      dramaticQuestion: 'Will you confront the danger or seek another path?',
      choiceIntents: [
        {
          hook: 'Face the threat directly',
          choiceType: 'CONFRONTATION',
          primaryDelta: 'THREAT_SHIFT',
        },
        {
          hook: 'Find an alternative route',
          choiceType: 'TACTICAL_APPROACH',
          primaryDelta: 'LOCATION_CHANGE',
        },
      ],
      rawResponse: 'page-plan',
    });
    mockedGenerateStateAccountant.mockResolvedValue({
      stateIntents: {
        currentLocation: '',
        threats: { add: [], removeIds: [] },
        constraints: { add: [], removeIds: [] },
        threads: { add: [], resolveIds: [] },
        inventory: { add: [], removeIds: [] },
        health: { add: [], removeIds: [] },
        characterState: { add: [], removeIds: [] },
        canon: { worldAdd: [], characterAdd: [] },
      },
      rawResponse: 'accountant',
    });
    mockedGenerateOpeningPage.mockResolvedValue(openingResult);
    mockedGenerateWriterPage.mockResolvedValue(writerResult);
    mockedGenerateAnalystEvaluation.mockResolvedValue(defaultAnalystResult);
    mockedReconcileState.mockImplementation((_plan, writer, previousState) =>
      passthroughReconciledState(writer as PageWriterResult, previousState.currentLocation)
    );
  });

  afterEach(async () => {
    for (const storyId of createdStoryIds) {
      try {
        await storyEngine.deleteStory(storyId);
      } catch {
        // Ignore cleanup failures to avoid hiding test errors.
      }
    }

    createdStoryIds.clear();

    const stories = await storyEngine.listStories();
    for (const story of stories) {
      if (story.characterConcept.startsWith(TEST_PREFIX)) {
        try {
          await storyEngine.deleteStory(story.id);
        } catch {
          // Ignore cleanup failures from stale fixtures.
        }
      }
    }
  });

  it('should restart story from page 1', async () => {
    const start = await storyEngine.startStory({
      title: `${TEST_PREFIX} Title`,
      characterConcept: `${TEST_PREFIX} restart`,
      worldbuilding: 'A canal city built around old astronomical locks.',
      tone: 'reflective mystery',
      apiKey: 'test-api-key',
      spine: mockSpine,
    });
    createdStoryIds.add(start.story.id);

    await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: parsePageId(1),
      choiceIndex: 0,
      apiKey: 'test-api-key',
    });

    const restarted = await storyEngine.restartStory(start.story.id);

    expect(restarted.id).toBe(1);
    expect(restarted.narrativeText).toBe(start.page.narrativeText);
  });

  it('should persist story across engine instances', async () => {
    const start = await storyEngine.startStory({
      title: `${TEST_PREFIX} Title`,
      characterConcept: `${TEST_PREFIX} persist-across-instance`,
      worldbuilding: 'A river city where maps rewrite themselves at dawn.',
      tone: 'investigative',
      apiKey: 'test-api-key',
      spine: mockSpine,
    });
    createdStoryIds.add(start.story.id);

    const nextPage = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: parsePageId(1),
      choiceIndex: 0,
      apiKey: 'test-api-key',
    });

    const secondEngine = new StoryEngine();
    secondEngine.init();

    const loadedStory = await secondEngine.loadStory(start.story.id);
    const loadedFirstPage = await secondEngine.getStartingPage(start.story.id);
    const loadedSecondPage = await secondEngine.getPage(start.story.id, nextPage.page.id);

    expect(loadedStory).not.toBeNull();
    expect(loadedStory?.id).toBe(start.story.id);
    expect(loadedFirstPage?.narrativeText).toBe(start.page.narrativeText);
    expect(loadedSecondPage?.narrativeText).toBe(nextPage.page.narrativeText);
  });

  it('should include created stories in listStories', async () => {
    const start = await storyEngine.startStory({
      title: `${TEST_PREFIX} Title`,
      characterConcept: `${TEST_PREFIX} list-stories`,
      worldbuilding: 'A market city where barges carry sealed prophecies.',
      tone: 'adventure',
      apiKey: 'test-api-key',
      spine: mockSpine,
    });
    createdStoryIds.add(start.story.id);

    const stories = await storyEngine.listStories();
    const listed = stories.find((story) => story.id === start.story.id);

    expect(listed).toBeDefined();
    expect(listed?.characterConcept).toBe(start.story.characterConcept);
    expect(listed?.pageCount).toBe(1);
  });
});
