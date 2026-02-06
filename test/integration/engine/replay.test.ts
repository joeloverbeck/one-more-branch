import { StoryEngine, storyEngine } from '@/engine';
import { generateContinuationPage, generateOpeningPage } from '@/llm';
import { parsePageId, StoryId } from '@/models';

jest.mock('@/llm', () => ({
  generateOpeningPage: jest.fn(),
  generateContinuationPage: jest.fn(),
}));

const mockedGenerateOpeningPage = generateOpeningPage as jest.MockedFunction<typeof generateOpeningPage>;
const mockedGenerateContinuationPage =
  generateContinuationPage as jest.MockedFunction<typeof generateContinuationPage>;

const TEST_PREFIX = 'TEST STOENG-008 replay integration';

const openingResult = {
  narrative:
    'At first bell you cross the bridge into Brightwater and the river mirrors an unfamiliar constellation that shifts whenever you speak your own name.',
  choices: ['Follow the mirrored stars', 'Consult the archivist'],
  stateChangesAdded: ['Entered Brightwater before sunrise'],
  stateChangesRemoved: [],
  newCanonFacts: ['Brightwater river reflects impossible constellations'],
  newCharacterCanonFacts: {},
  inventoryAdded: [],
  inventoryRemoved: [],
  isEnding: false,
  storyArc: 'Decode the mirrored constellation before the festival ends.',
  rawResponse: 'opening',
};

const continuationResult = {
  narrative:
    'You pursue the mirrored stars along the embankment until engraved mile markers begin counting backward and a hidden gate rises from the riverbank.',
  choices: ['Open the hidden gate', 'Mark the location and retreat'],
  stateChangesAdded: ['Found the hidden riverside gate'],
  stateChangesRemoved: [],
  newCanonFacts: ['Brightwater has a hidden gate beneath the embankment'],
  newCharacterCanonFacts: {},
  inventoryAdded: [],
  inventoryRemoved: [],
  isEnding: false,
  storyArc: 'Decode the mirrored constellation before the festival ends.',
  rawResponse: 'continuation',
};

describe('story replay integration', () => {
  const createdStoryIds = new Set<StoryId>();

  beforeEach(() => {
    jest.clearAllMocks();
    storyEngine.init();

    mockedGenerateOpeningPage.mockResolvedValue(openingResult);
    mockedGenerateContinuationPage.mockResolvedValue(continuationResult);
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
      characterConcept: `${TEST_PREFIX} restart`,
      worldbuilding: 'A canal city built around old astronomical locks.',
      tone: 'reflective mystery',
      apiKey: 'test-api-key',
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
      characterConcept: `${TEST_PREFIX} persist-across-instance`,
      worldbuilding: 'A river city where maps rewrite themselves at dawn.',
      tone: 'investigative',
      apiKey: 'test-api-key',
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
      characterConcept: `${TEST_PREFIX} list-stories`,
      worldbuilding: 'A market city where barges carry sealed prophecies.',
      tone: 'adventure',
      apiKey: 'test-api-key',
    });
    createdStoryIds.add(start.story.id);

    const stories = await storyEngine.listStories();
    const listed = stories.find((story) => story.id === start.story.id);

    expect(listed).toBeDefined();
    expect(listed?.characterConcept).toBe(start.story.characterConcept);
    expect(listed?.pageCount).toBe(1);
  });
});
