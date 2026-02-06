import { storyEngine } from '@/engine';
import { generateContinuationPage, generateOpeningPage } from '@/llm';
import { Page, PageId, StoryId, parsePageId } from '@/models';

jest.mock('@/llm', () => ({
  generateOpeningPage: jest.fn(),
  generateContinuationPage: jest.fn(),
}));

const mockedGenerateOpeningPage = generateOpeningPage as jest.MockedFunction<typeof generateOpeningPage>;
const mockedGenerateContinuationPage = generateContinuationPage as jest.MockedFunction<
  typeof generateContinuationPage
>;

const TEST_PREFIX = 'E2E TEST STOENG-009';

const openingResult = {
  narrative:
    'The time fractures shimmer at the district boundary as you check your sibling is still hidden in the cellar. Patrol searchlights sweep the fog-choked streets.',
  choices: [
    'Scout the beacon tower before midnight',
    'Check the patrol schedules at the border checkpoint',
    'Search for a safer hiding spot deeper in the stalled district',
  ],
  stateChangesAdded: ['Sibling hidden in cellar', 'Time fractures detected at district boundary'],
  stateChangesRemoved: [],
  newCanonFacts: ['Districts shift at midnight based on beacon towers', 'Patrols use searchlights in fog'],
  newCharacterCanonFacts: {},
  characterStateChangesAdded: [],
  characterStateChangesRemoved: [],
  inventoryAdded: [],
  inventoryRemoved: [],
  healthAdded: [],
  healthRemoved: [],
  isEnding: false,
  storyArc: 'Map the time fractures while keeping your sibling safe from patrols.',
  rawResponse: 'opening',
};

function buildContinuationResult(selectedChoice: string, stepIndex: number): typeof openingResult {
  if (selectedChoice.includes('beacon tower')) {
    return {
      narrative:
        'You reach the beacon tower as the last light fades. The machinery hums with temporal energy, and you spot a patrol approaching from the east.',
      choices: ['Climb the tower to disable the beacon', 'Hide and observe the patrol pattern'],
      stateChangesAdded: ['Reached beacon tower', 'Patrol spotted approaching'],
      stateChangesRemoved: [],
      newCanonFacts: ['Beacon towers emit temporal energy'],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      isEnding: false,
      storyArc: 'Map the time fractures while keeping your sibling safe from patrols.',
      rawResponse: `continuation-beacon-${stepIndex}`,
    };
  }

  if (selectedChoice.includes('patrol schedules') || selectedChoice.includes('checkpoint')) {
    return {
      narrative:
        'The checkpoint guard is distracted by a commotion. You slip past and find the schedule board, memorizing the patrol routes.',
      choices: ['Copy the full schedule and escape', 'Sabotage the schedule board'],
      stateChangesAdded: ['Infiltrated checkpoint', 'Learned patrol routes'],
      stateChangesRemoved: [],
      newCanonFacts: ['Checkpoints store patrol schedules on physical boards'],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      isEnding: false,
      storyArc: 'Map the time fractures while keeping your sibling safe from patrols.',
      rawResponse: `continuation-checkpoint-${stepIndex}`,
    };
  }

  if (selectedChoice.includes('hiding spot') || selectedChoice.includes('stalled district')) {
    return {
      narrative:
        'The stalled district is eerily quiet—time moves slowly here. You find an abandoned warehouse where clocks tick once per hour.',
      choices: ['Set up a long-term hideout', 'Use the time dilation to plan your next move'],
      stateChangesAdded: ['Entered stalled district', 'Found time-dilated warehouse'],
      stateChangesRemoved: [],
      newCanonFacts: ['Stalled districts experience severe time dilation'],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      isEnding: false,
      storyArc: 'Map the time fractures while keeping your sibling safe from patrols.',
      rawResponse: `continuation-stalled-${stepIndex}`,
    };
  }

  // Default continuation for any other choice
  return {
    narrative:
      'Your actions draw attention. A patrol closes in, and you must make a critical decision that will determine your fate.',
    choices: ['Surrender to protect your sibling', 'Make a desperate escape attempt'],
    stateChangesAdded: ['Patrol alerted', 'Critical decision point reached'],
    stateChangesRemoved: [],
    newCanonFacts: ['Patrols can track movement through time fractures'],
    newCharacterCanonFacts: {},
    characterStateChangesAdded: [],
    characterStateChangesRemoved: [],
    inventoryAdded: [],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    isEnding: false,
    storyArc: 'Map the time fractures while keeping your sibling safe from patrols.',
    rawResponse: `continuation-default-${stepIndex}`,
  };
}

const replayOpeningResult = {
  narrative:
    'The canal waters rise as the dawn siren sounds. You clutch the testimony documents, watching political agents argue on the bridge above.',
  choices: ['Swim under the bridge while they argue', 'Wait for the water level to change'],
  stateChangesAdded: ['Carrying testimony documents', 'Canal waters rising'],
  stateChangesRemoved: [],
  newCanonFacts: ['Canals respond to civic votes at dawn sirens', 'Political factions alter street reality'],
  newCharacterCanonFacts: {},
  characterStateChangesAdded: [],
  characterStateChangesRemoved: [],
  inventoryAdded: [],
  inventoryRemoved: [],
  healthAdded: [],
  healthRemoved: [],
  isEnding: false,
  storyArc: 'Deliver the testimony before the factions discover you.',
  rawResponse: 'replay-opening',
};

function buildReplayContinuationResult(): ReturnType<typeof buildContinuationResult> {
  return {
    narrative:
      'You slip beneath the murky water, the documents sealed in waterproof wrapping. The agents never notice your passage.',
    choices: ['Surface at the safe house dock', 'Continue underwater to the testimony hall'],
    stateChangesAdded: ['Passed under the bridge undetected', 'Documents still secure'],
    stateChangesRemoved: [],
    newCanonFacts: ['Safe houses have underwater access points'],
    newCharacterCanonFacts: {},
    characterStateChangesAdded: [],
    characterStateChangesRemoved: [],
    inventoryAdded: [],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    isEnding: false,
    storyArc: 'Deliver the testimony before the factions discover you.',
    rawResponse: 'replay-continuation',
  };
}

function expectAccumulatedStatePrefix(parent: Page, child: Page): void {
  expect(child.accumulatedState.changes.length).toBeGreaterThanOrEqual(parent.accumulatedState.changes.length);
  expect(child.accumulatedState.changes.slice(0, parent.accumulatedState.changes.length)).toEqual(
    parent.accumulatedState.changes,
  );
}

describe('story engine e2e full playthrough', () => {
  const createdStoryIds = new Set<StoryId>();
  let continuationCallCount = 0;

  beforeAll(() => {
    storyEngine.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    continuationCallCount = 0;

    mockedGenerateOpeningPage.mockImplementation((context) => {
      if (context.characterConcept.includes('courier smuggling')) {
        return Promise.resolve(replayOpeningResult);
      }
      return Promise.resolve(openingResult);
    });

    mockedGenerateContinuationPage.mockImplementation((context) => {
      continuationCallCount += 1;
      if (context.characterConcept.includes('courier smuggling')) {
        return Promise.resolve(buildReplayContinuationResult());
      }
      return Promise.resolve(buildContinuationResult(context.selectedChoice, continuationCallCount));
    });
  });

  afterAll(async () => {
    for (const storyId of createdStoryIds) {
      try {
        await storyEngine.deleteStory(storyId);
      } catch {
        // Keep cleanup errors from masking test failures.
      }
    }
  });

  it('should complete a multi-page story journey', async () => {
    const start = await storyEngine.startStory({
      title: `${TEST_PREFIX} Multi-Page Journey`,
      characterConcept: `${TEST_PREFIX}: A disciplined scout mapping unstable time fractures in an occupied city while trying to keep a sibling hidden from patrols.`,
      worldbuilding:
        'The city is divided into districts that rewind, stall, or accelerate each midnight depending on beacon towers.',
      tone: 'tense, character-driven speculative thriller',
      apiKey: 'mock-api-key',
    });
    createdStoryIds.add(start.story.id);

    const visitedPageIds: PageId[] = [start.page.id];
    let transitionsMade = 0;
    let currentPage = start.page;

    for (let step = 0; step < 3; step += 1) {
      if (currentPage.isEnding) {
        expect(currentPage.choices).toHaveLength(0);
        break;
      }

      const result = await storyEngine.makeChoice({
        storyId: start.story.id,
        pageId: currentPage.id,
        choiceIndex: 0,
        apiKey: 'mock-api-key',
      });

      expect(result.page.parentPageId).toBe(currentPage.id);
      expect(result.page.parentChoiceIndex).toBe(0);
      expectAccumulatedStatePrefix(currentPage, result.page);

      transitionsMade += 1;
      visitedPageIds.push(result.page.id);
      currentPage = result.page;
    }

    const stats = await storyEngine.getStoryStats(start.story.id);

    const uniqueVisited = new Set(visitedPageIds);
    expect(stats.pageCount).toBe(uniqueVisited.size);
    expect(stats.exploredBranches).toBe(transitionsMade);

    if (currentPage.isEnding) {
      expect(currentPage.choices).toHaveLength(0);
    } else {
      expect(stats.pageCount).toBeGreaterThanOrEqual(4);
    }

    const restarted = await storyEngine.restartStory(start.story.id);
    expect(restarted.id).toBe(parsePageId(1));
    expect(restarted.narrativeText).toBe(start.page.narrativeText);

    if (!start.page.isEnding) {
      const replay = await storyEngine.makeChoice({
        storyId: start.story.id,
        pageId: start.page.id,
        choiceIndex: 0,
        apiKey: 'mock-api-key',
      });

      expect(replay.page.id).toBe(visitedPageIds[1]);
      expect(replay.wasGenerated).toBe(false);
    }
  });

  it('should replay an already-linked root choice deterministically', async () => {
    const start = await storyEngine.startStory({
      title: `${TEST_PREFIX} Replay Test`,
      characterConcept: `${TEST_PREFIX}: A courier smuggling testimony through a flood-locked republic while political factions alter street-level reality.`,
      worldbuilding: 'Canals rise and fall based on civic votes cast at dawn sirens.',
      tone: 'political intrigue with survival pressure',
      apiKey: 'mock-api-key',
    });
    createdStoryIds.add(start.story.id);

    if (start.page.isEnding) {
      expect(start.page.choices).toHaveLength(0);
      return;
    }

    const first = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: start.page.id,
      choiceIndex: 0,
      apiKey: 'mock-api-key',
    });

    const second = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: start.page.id,
      choiceIndex: 0,
      apiKey: 'mock-api-key',
    });

    expect(first.page.id).toBe(second.page.id);
    expect(second.wasGenerated).toBe(false);
    expect(second.page.narrativeText).toBe(first.page.narrativeText);
  });
});
