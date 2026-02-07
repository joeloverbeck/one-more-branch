import { storyEngine } from '@/engine';
import { generateContinuationPage, generateOpeningPage, generateStoryStructure } from '@/llm';
import { parsePageId, StoryId } from '@/models';

jest.mock('@/llm', () => ({
  generateOpeningPage: jest.fn(),
  generateContinuationPage: jest.fn(),
  generateStoryStructure: jest.fn(),
}));

const mockedGenerateOpeningPage = generateOpeningPage as jest.MockedFunction<typeof generateOpeningPage>;
const mockedGenerateContinuationPage =
  generateContinuationPage as jest.MockedFunction<typeof generateContinuationPage>;
const mockedGenerateStoryStructure = generateStoryStructure as jest.MockedFunction<
  typeof generateStoryStructure
>;

const TEST_PREFIX = 'TEST STOENG-008 engine integration';
const mockedStructureResult = {
  overallTheme: 'Uncover the harbor conspiracy before dawn.',
  acts: [
    {
      name: 'Act I',
      objective: 'Establish the threat.',
      stakes: 'Failure leaves the hero blind to danger.',
      entryCondition: 'A disturbing event forces involvement.',
      beats: [
        { description: 'Find first clue', objective: 'Confirm the mystery is real.' },
        { description: 'Secure local help', objective: 'Gain support to continue.' },
      ],
    },
    {
      name: 'Act II',
      objective: 'Escalate conflict.',
      stakes: 'Failure strengthens the antagonist.',
      entryCondition: 'The first clues reveal a wider network.',
      beats: [
        { description: 'Infiltrate hostile zone', objective: 'Collect decisive evidence.' },
        { description: 'Survive counterattack', objective: 'Keep momentum.' },
      ],
    },
    {
      name: 'Act III',
      objective: 'Resolve final confrontation.',
      stakes: 'Failure causes irreversible loss.',
      entryCondition: 'Evidence is strong enough to act publicly.',
      beats: [
        { description: 'Commit final plan', objective: 'Coordinate allies.' },
        { description: 'Execute resolution', objective: 'End central threat.' },
      ],
    },
  ],
  rawResponse: 'structure',
};

const openingResult = {
  narrative:
    'You step into Lanternport as the harbor lights ignite in impossible colors and every captain in the bay turns to watch your arrival in uneasy silence.',
  choices: ['Investigate the ember trail', 'Question the ferryman'],
  stateChangesAdded: ['Arrived in Lanternport under crimson fog'],
  stateChangesRemoved: [],
  newCanonFacts: ['Lanternport fog glows crimson at sunset'],
  newCharacterCanonFacts: {},
  characterStateChangesAdded: [],
  characterStateChangesRemoved: [],
  inventoryAdded: [],
  inventoryRemoved: [],
  healthAdded: [],
  healthRemoved: [],
  isEnding: false,
  storyArc: 'Find the source of the harbor fire before dawn.',
  rawResponse: 'opening',
};

function buildContinuationResult(selectedChoice: string): typeof openingResult {
  if (selectedChoice === 'Investigate the ember trail') {
    return {
      narrative:
        'You follow embers down alleys of wet stone, where shuttered windows open just enough for whispered warnings and the ash forms a map beneath your boots.',
      choices: ['Enter the ash-marked chapel', 'Return to the docks with proof'],
      stateChangesAdded: ['Tracked embers to the chapel district'],
      stateChangesRemoved: [],
      newCanonFacts: ['Ash in Lanternport drifts against the wind'],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      isEnding: false,
      storyArc: 'Find the source of the harbor fire before dawn.',
      rawResponse: 'continuation-ember',
    };
  }

  return {
    narrative:
      'The ferryman speaks in a voice like scraped iron and admits he has rowed passengers to a pier that does not exist on any map, then offers you passage.',
    choices: ['Accept passage to the hidden pier', 'Detain the ferryman for answers'],
    stateChangesAdded: ['Learned of an unmapped hidden pier'],
    stateChangesRemoved: [],
    newCanonFacts: ['A hidden pier appears only during red fog'],
    newCharacterCanonFacts: {},
    characterStateChangesAdded: [],
    characterStateChangesRemoved: [],
    inventoryAdded: [],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    isEnding: false,
    storyArc: 'Find the source of the harbor fire before dawn.',
    rawResponse: 'continuation-ferryman',
  };
}

describe('story-engine integration', () => {
  const createdStoryIds = new Set<StoryId>();

  beforeEach(() => {
    jest.clearAllMocks();
    storyEngine.init();

    mockedGenerateStoryStructure.mockResolvedValue(mockedStructureResult);
    mockedGenerateOpeningPage.mockResolvedValue(openingResult);
    mockedGenerateContinuationPage.mockImplementation((context) =>
      Promise.resolve(buildContinuationResult(context.selectedChoice)),
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

  it('should create new story with first page', async () => {
    const result = await storyEngine.startStory({
      title: `${TEST_PREFIX} Title`,
      characterConcept: `${TEST_PREFIX} create-first-page`,
      worldbuilding: 'A city where harbor lights can remember names.',
      tone: 'mystery adventure',
      apiKey: 'test-api-key',
    });

    createdStoryIds.add(result.story.id);

    expect(result.story.characterConcept).toContain('create-first-page');
    expect(result.page.id).toBe(1);
    expect(result.page.narrativeText.length).toBeGreaterThan(50);
    expect(result.page.choices.length).toBeGreaterThanOrEqual(2);
    expect(result.page.isEnding).toBe(false);
    expect(mockedGenerateOpeningPage).toHaveBeenCalledTimes(1);
  });

  it('should make choice and generate new page', async () => {
    const start = await storyEngine.startStory({
      title: `${TEST_PREFIX} Title`,
      characterConcept: `${TEST_PREFIX} make-choice`,
      worldbuilding: 'A coast where fog preserves memories as sparks.',
      tone: 'tense mystery',
      apiKey: 'test-api-key',
    });
    createdStoryIds.add(start.story.id);

    const result = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: parsePageId(1),
      choiceIndex: 0,
      apiKey: 'test-api-key',
    });

    expect(result.page.id).toBe(2);
    expect(result.wasGenerated).toBe(true);
    expect(result.page.parentPageId).toBe(1);
    expect(result.page.parentChoiceIndex).toBe(0);
    expect(mockedGenerateContinuationPage).toHaveBeenCalledTimes(1);
  });

  it('should load existing page without regeneration', async () => {
    const start = await storyEngine.startStory({
      title: `${TEST_PREFIX} Title`,
      characterConcept: `${TEST_PREFIX} replay-choice`,
      worldbuilding: 'A harbor where fire leaves written clues in the air.',
      tone: 'investigative fantasy',
      apiKey: 'test-api-key',
    });
    createdStoryIds.add(start.story.id);

    const first = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: parsePageId(1),
      choiceIndex: 0,
      apiKey: 'test-api-key',
    });

    const second = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: parsePageId(1),
      choiceIndex: 0,
      apiKey: 'test-api-key',
    });

    expect(first.wasGenerated).toBe(true);
    expect(second.wasGenerated).toBe(false);
    expect(second.page.id).toBe(first.page.id);
    expect(second.page.narrativeText).toBe(first.page.narrativeText);
    expect(mockedGenerateContinuationPage).toHaveBeenCalledTimes(1);
  });

  it('should maintain branch isolation', async () => {
    const start = await storyEngine.startStory({
      title: `${TEST_PREFIX} Title`,
      characterConcept: `${TEST_PREFIX} branch-isolation`,
      worldbuilding: 'An old port where every alley leads to a different rumor.',
      tone: 'suspenseful',
      apiKey: 'test-api-key',
    });
    createdStoryIds.add(start.story.id);

    const branchA = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: parsePageId(1),
      choiceIndex: 0,
      apiKey: 'test-api-key',
    });

    const branchB = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: parsePageId(1),
      choiceIndex: 1,
      apiKey: 'test-api-key',
    });

    expect(branchA.page.id).not.toBe(branchB.page.id);
    expect(branchA.page.narrativeText).not.toBe(branchB.page.narrativeText);
    expect(branchA.page.parentPageId).toBe(1);
    expect(branchB.page.parentPageId).toBe(1);
    expect(branchA.page.parentChoiceIndex).toBe(0);
    expect(branchB.page.parentChoiceIndex).toBe(1);
    expect(mockedGenerateContinuationPage).toHaveBeenCalledTimes(2);
  });
});
