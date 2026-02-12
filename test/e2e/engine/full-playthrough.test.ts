import { storyEngine } from '@/engine';
import {
  generatePageWriterOutput,
  generateAnalystEvaluation,
  generateOpeningPage,
  generatePagePlan,
  generateStoryStructure,
} from '@/llm';
import { Page, PageId, StoryId, parsePageId } from '@/models';
import type { WriterResult } from '@/llm/types';

jest.mock('@/llm', () => ({
  generateOpeningPage: jest.fn(),
  generatePageWriterOutput: jest.fn(),
  generateAnalystEvaluation: jest.fn(),
  generatePagePlan: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  mergePageWriterAndReconciledStateWithAnalystResults:
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    jest.requireActual('@/llm').mergePageWriterAndReconciledStateWithAnalystResults,
  generateStoryStructure: jest.fn(),
}));

jest.mock('@/logging/index', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  logPrompt: jest.fn(),
}));

const mockedGenerateOpeningPage = generateOpeningPage as jest.MockedFunction<typeof generateOpeningPage>;
const mockedGenerateWriterPage = generatePageWriterOutput as jest.MockedFunction<typeof generatePageWriterOutput>;
const mockedGenerateAnalystEvaluation = generateAnalystEvaluation as jest.MockedFunction<typeof generateAnalystEvaluation>;
const mockedGeneratePagePlan = generatePagePlan as jest.MockedFunction<typeof generatePagePlan>;
const mockedGenerateStoryStructure = generateStoryStructure as jest.MockedFunction<
  typeof generateStoryStructure
>;

const TEST_PREFIX = 'E2E TEST STOENG-009';

const openingResult = {
  narrative:
    'The time fractures shimmer at the district boundary as you check your sibling is still hidden in the cellar. Patrol searchlights sweep the fog-choked streets.',
  choices: [
    { text: 'Scout the beacon tower before midnight', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
    { text: 'Check the patrol schedules at the border checkpoint', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
    { text: 'Search for a safer hiding spot deeper in the stalled district', choiceType: 'PATH_DIVERGENCE', primaryDelta: 'LOCATION_CHANGE' },
  ],
  currentLocation: 'District boundary near cellar hideout',
  threatsAdded: ['Patrol searchlights sweeping fog'],
  threatsRemoved: [],
  constraintsAdded: ['Sibling hidden in cellar'],
  constraintsRemoved: [],
  threadsAdded: [{ text: 'Time fractures detected at district boundary', threadType: 'INFORMATION', urgency: 'MEDIUM' }],
  threadsResolved: [],
  protagonistAffect: {
    primaryEmotion: 'anxiety',
    primaryIntensity: 7,
    primaryCause: 'Protecting hidden sibling from patrols',
    secondaryEmotions: ['vigilance', 'determination'],
    dominantMotivation: 'Keep sibling safe while navigating fractured districts',
  },
  newCanonFacts: ['Districts shift at midnight based on beacon towers', 'Patrols use searchlights in fog'],
  newCharacterCanonFacts: {},
  characterStateChangesAdded: [],
  characterStateChangesRemoved: [],
  inventoryAdded: [],
  inventoryRemoved: [],
  healthAdded: [],
  healthRemoved: [],
  sceneSummary: 'Test summary of the scene events and consequences.',
  isEnding: false,
  beatConcluded: false,
  beatResolution: '',
  rawResponse: 'opening',
};

function buildWriterResult(selectedChoice: string, stepIndex: number): WriterResult {
  if (selectedChoice.includes('beacon tower')) {
    return {
      narrative:
        'You reach the beacon tower as the last light fades. The machinery hums with temporal energy, and you spot a patrol approaching from the east.',
      choices: [
        { text: 'Climb the tower to disable the beacon', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
        { text: 'Hide and observe the patrol pattern', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
      ],
      currentLocation: 'Beacon tower base',
      threatsAdded: ['Patrol approaching from the east'],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [{ text: 'Beacon machinery humming with temporal energy', threadType: 'INFORMATION', urgency: 'MEDIUM' }],
      threadsResolved: [],
      protagonistAffect: {
        primaryEmotion: 'tension',
        primaryIntensity: 6,
        primaryCause: 'Patrol approaching while near beacon tower',
        secondaryEmotions: ['curiosity', 'caution'],
        dominantMotivation: 'Disable beacon while avoiding detection',
      },
      newCanonFacts: ['Beacon towers emit temporal energy'],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      sceneSummary: 'Test summary of the scene events and consequences.',
      isEnding: false,
      rawResponse: `continuation-beacon-${stepIndex}`,
    };
  }

  if (selectedChoice.includes('patrol schedules') || selectedChoice.includes('checkpoint')) {
    return {
      narrative:
        'The checkpoint guard is distracted by a commotion. You slip past and find the schedule board, memorizing the patrol routes.',
      choices: [
        { text: 'Copy the full schedule and escape', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
        { text: 'Sabotage the schedule board', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
      ],
      currentLocation: 'Border checkpoint interior',
      threatsAdded: [],
      threatsRemoved: ['Checkpoint guard attention'],
      constraintsAdded: ['Patrol routes memorized'],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
      protagonistAffect: {
        primaryEmotion: 'focus',
        primaryIntensity: 7,
        primaryCause: 'Successfully infiltrating checkpoint undetected',
        secondaryEmotions: ['satisfaction', 'urgency'],
        dominantMotivation: 'Gather intelligence on patrol patterns',
      },
      newCanonFacts: ['Checkpoints store patrol schedules on physical boards'],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      sceneSummary: 'Test summary of the scene events and consequences.',
      isEnding: false,
      rawResponse: `continuation-checkpoint-${stepIndex}`,
    };
  }

  if (selectedChoice.includes('hiding spot') || selectedChoice.includes('stalled district')) {
    return {
      narrative:
        'The stalled district is eerily quiet—time moves slowly here. You find an abandoned warehouse where clocks tick once per hour.',
      choices: [
        { text: 'Set up a long-term hideout', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
        { text: 'Use the time dilation to plan your next move', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
      ],
      currentLocation: 'Time-dilated warehouse in stalled district',
      threatsAdded: [],
      threatsRemoved: ['Immediate patrol threat'],
      constraintsAdded: ['Time moves slowly here'],
      constraintsRemoved: [],
      threadsAdded: [{ text: 'Abandoned warehouse discovered', threadType: 'INFORMATION', urgency: 'MEDIUM' }],
      threadsResolved: [],
      protagonistAffect: {
        primaryEmotion: 'relief',
        primaryIntensity: 5,
        primaryCause: 'Finding a safe location in the stalled district',
        secondaryEmotions: ['unease', 'contemplation'],
        dominantMotivation: 'Establish a secure base for operations',
      },
      newCanonFacts: ['Stalled districts experience severe time dilation'],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      sceneSummary: 'Test summary of the scene events and consequences.',
      isEnding: false,
      rawResponse: `continuation-stalled-${stepIndex}`,
    };
  }

  // Default continuation for any other choice
  return {
    narrative:
      'Your actions draw attention. A patrol closes in, and you must make a critical decision that will determine your fate.',
    choices: [
      { text: 'Surrender to protect your sibling', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
      { text: 'Make a desperate escape attempt', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
    ],
    currentLocation: 'Exposed position near patrol route',
    threatsAdded: ['Patrol closing in'],
    threatsRemoved: [],
    constraintsAdded: ['Critical decision point reached'],
    constraintsRemoved: [],
    threadsAdded: [],
    threadsResolved: [],
    protagonistAffect: {
      primaryEmotion: 'fear',
      primaryIntensity: 9,
      primaryCause: 'Patrol closing in on position',
      secondaryEmotions: ['desperation', 'protectiveness'],
      dominantMotivation: 'Protect sibling at any cost',
    },
    newCanonFacts: ['Patrols can track movement through time fractures'],
    newCharacterCanonFacts: {},
    characterStateChangesAdded: [],
    characterStateChangesRemoved: [],
    inventoryAdded: [],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    sceneSummary: 'Test summary of the scene events and consequences.',
    isEnding: false,
    rawResponse: `continuation-default-${stepIndex}`,
  };
}

const defaultAnalystResult = {
  beatConcluded: false,
  beatResolution: '',
  deviationDetected: false,
  deviationReason: '',
  invalidatedBeatIds: [] as string[],
  narrativeSummary: 'The protagonist continues the current scene.',
  pacingIssueDetected: false,
  pacingIssueReason: '',
  recommendedAction: 'none' as const,
  rawResponse: 'analyst-raw',
};

const replayOpeningResult = {
  narrative:
    'The canal waters rise as the dawn siren sounds. You clutch the testimony documents, watching political agents argue on the bridge above.',
  choices: [
    { text: 'Swim under the bridge while they argue', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
    { text: 'Wait for the water level to change', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
  ],
  currentLocation: 'Canal waterway beneath bridge',
  threatsAdded: ['Political agents on bridge above'],
  threatsRemoved: [],
  constraintsAdded: ['Carrying testimony documents', 'Canal waters rising'],
  constraintsRemoved: [],
  threadsAdded: [],
  threadsResolved: [],
  protagonistAffect: {
    primaryEmotion: 'urgency',
    primaryIntensity: 7,
    primaryCause: 'Need to deliver testimony documents safely',
    secondaryEmotions: ['wariness', 'resolve'],
    dominantMotivation: 'Transport documents past political agents',
  },
  newCanonFacts: ['Canals respond to civic votes at dawn sirens', 'Political factions alter street reality'],
  newCharacterCanonFacts: {},
  characterStateChangesAdded: [],
  characterStateChangesRemoved: [],
  inventoryAdded: [],
  inventoryRemoved: [],
  healthAdded: [],
  healthRemoved: [],
  sceneSummary: 'Test summary of the scene events and consequences.',
  isEnding: false,
  beatConcluded: false,
  beatResolution: '',
  rawResponse: 'replay-opening',
};

function buildReplayWriterResult(): ReturnType<typeof buildWriterResult> {
  return {
    narrative:
      'You slip beneath the murky water, the documents sealed in waterproof wrapping. The agents never notice your passage.',
    choices: [
      { text: 'Surface at the safe house dock', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
      { text: 'Continue underwater to the testimony hall', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
    ],
    currentLocation: 'Underwater passage beneath bridge',
    threatsAdded: [],
    threatsRemoved: ['Political agents on bridge'],
    constraintsAdded: [],
    constraintsRemoved: [],
    threadsAdded: [],
    threadsResolved: ['Bridge crossing obstacle'],
    protagonistAffect: {
      primaryEmotion: 'relief',
      primaryIntensity: 6,
      primaryCause: 'Successfully evading agents undetected',
      secondaryEmotions: ['confidence', 'focus'],
      dominantMotivation: 'Reach safe destination with documents',
    },
    newCanonFacts: ['Safe houses have underwater access points'],
    newCharacterCanonFacts: {},
    characterStateChangesAdded: [],
    characterStateChangesRemoved: [],
    inventoryAdded: [],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    sceneSummary: 'Test summary of the scene events and consequences.',
    isEnding: false,
    rawResponse: 'replay-continuation',
  };
}

function expectAccumulatedInventoryPrefix(parent: Page, child: Page): void {
  expect(child.accumulatedInventory.length).toBeGreaterThanOrEqual(parent.accumulatedInventory.length);
  expect(child.accumulatedInventory.slice(0, parent.accumulatedInventory.length)).toEqual(
    parent.accumulatedInventory,
  );
}

const mockedStructureResult = {
  overallTheme: 'Expose regime manipulations while protecting vulnerable allies.',
  acts: [
    {
      name: 'Act I',
      objective: 'Reveal the initial threat.',
      stakes: 'Failure leaves the protagonist blind to the core danger.',
      entryCondition: 'A disruptive event forces action.',
      beats: [
        {
          name: 'First anomaly discovery',
          description: 'Discover the first anomaly.',
          objective: 'Confirm the threat is real.',
        },
        {
          name: 'Immediate ally recruitment',
          description: 'Gather immediate allies.',
          objective: 'Avoid isolation.',
        },
      ],
    },
    {
      name: 'Act II',
      objective: 'Escalate conflict and gather leverage.',
      stakes: 'Failure gives control to the antagonist force.',
      entryCondition: 'The threat’s network is partially mapped.',
      beats: [
        {
          name: 'Risky infiltration attempt',
          description: 'Attempt a risky infiltration.',
          objective: 'Extract actionable proof.',
        },
        {
          name: 'Retaliation endurance',
          description: 'Survive retaliation.',
          objective: 'Preserve capability to continue.',
        },
      ],
    },
    {
      name: 'Act III',
      objective: 'Force final resolution.',
      stakes: 'Failure permanently cements the hostile status quo.',
      entryCondition: 'Public confrontation becomes unavoidable.',
      beats: [
        {
          name: 'Final strategy commitment',
          description: 'Commit to final strategy.',
          objective: 'Align allies and resources.',
        },
        {
          name: 'Decisive action delivery',
          description: 'Deliver decisive action.',
          objective: 'Resolve primary conflict.',
        },
      ],
    },
  ],
  rawResponse: 'mock-structure',
};

describe('story engine e2e full playthrough', () => {
  const createdStoryIds = new Set<StoryId>();
  let continuationCallCount = 0;

  beforeAll(() => {
    storyEngine.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    continuationCallCount = 0;
    mockedGeneratePagePlan.mockResolvedValue({
      sceneIntent: 'Advance the story with immediate consequences.',
      continuityAnchors: [],
      stateIntents: {
        threats: { add: [], removeIds: [] },
        constraints: { add: [], removeIds: [] },
        threads: { add: [], resolveIds: [] },
        inventory: { add: [], removeIds: [] },
        health: { add: [], removeIds: [] },
        characterState: { add: [], removeIds: [] },
        canon: { worldAdd: [], characterAdd: [] },
      },
      writerBrief: {
        openingLineDirective: 'Start in motion.',
        mustIncludeBeats: [],
        forbiddenRecaps: [],
      },
      dramaticQuestion: 'Will you confront the danger or seek another path?',
      choiceIntents: [
        { hook: 'Face the threat directly', choiceType: 'CONFRONTATION', primaryDelta: 'THREAT_SHIFT' },
        { hook: 'Find an alternative route', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE' },
      ],
      rawResponse: 'page-plan',
    });

    mockedGenerateOpeningPage.mockImplementation((context) => {
      if (context.characterConcept.includes('courier smuggling')) {
        return Promise.resolve(replayOpeningResult);
      }
      return Promise.resolve(openingResult);
    });
    mockedGenerateStoryStructure.mockResolvedValue(mockedStructureResult);

    mockedGenerateWriterPage.mockImplementation((context) => {
      continuationCallCount += 1;
      if (context.characterConcept.includes('courier smuggling')) {
        return Promise.resolve(buildReplayWriterResult());
      }
      return Promise.resolve(buildWriterResult(context.selectedChoice, continuationCallCount));
    });
    mockedGenerateAnalystEvaluation.mockResolvedValue(defaultAnalystResult);
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
    for (const act of start.story.structure?.acts ?? []) {
      for (const beat of act.beats) {
        expect(beat.name).toBeTruthy();
      }
    }

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
      expectAccumulatedInventoryPrefix(currentPage, result.page);

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
