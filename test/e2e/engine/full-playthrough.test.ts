import { storyEngine } from '@/engine';
import {
  generatePageWriterOutput,
  generateAnalystEvaluation,
  generateOpeningPage,
  generatePagePlan,
  generateStateAccountant,
  generateStoryStructure,
} from '@/llm';
import { Page, PageId, StoryId, parsePageId } from '@/models';
import type { PageWriterResult } from '@/llm/writer-types';
import type { StorySpine } from '@/models';
import {
  createMockAnalystResult,
  createMockFinalResult,
  createMockStoryStructure,
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

const TEST_PREFIX = 'E2E TEST STOENG-009';

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
    'The time fractures shimmer at the district boundary as you check your sibling is still hidden in the cellar. Patrol searchlights sweep the fog-choked streets.',
  choices: [
    {
      text: 'Scout the beacon tower before midnight',
      choiceType: 'TACTICAL_APPROACH',
      primaryDelta: 'GOAL_SHIFT',
    },
    {
      text: 'Check the patrol schedules at the border checkpoint',
      choiceType: 'INVESTIGATION',
      primaryDelta: 'INFORMATION_REVEALED',
    },
    {
      text: 'Search for a safer hiding spot deeper in the stalled district',
      choiceType: 'PATH_DIVERGENCE',
      primaryDelta: 'LOCATION_CHANGE',
    },
  ],
  currentLocation: 'District boundary near cellar hideout',
  threatsAdded: ['Patrol searchlights sweeping fog'],
  constraintsAdded: ['Sibling hidden in cellar'],
  threadsAdded: [
    {
      text: 'Time fractures detected at district boundary',
      threadType: 'INFORMATION',
      urgency: 'MEDIUM',
    },
  ],
  protagonistAffect: {
    primaryEmotion: 'anxiety',
    primaryIntensity: 'overwhelming',
    primaryCause: 'Protecting hidden sibling from patrols',
    secondaryEmotions: ['vigilance', 'determination'],
    dominantMotivation: 'Keep sibling safe while navigating fractured districts',
  },
  newCanonFacts: [
    { text: 'Districts shift at midnight based on beacon towers', factType: 'LAW' },
    { text: 'Patrols use searchlights in fog', factType: 'LAW' },
  ],
  sceneSummary: 'Test summary of the scene events and consequences.',
  rawResponse: 'opening',
});

function buildWriterResult(selectedChoice: string, stepIndex: number): PageWriterResult {
  if (selectedChoice.includes('beacon tower')) {
    return createMockFinalResult({
      narrative:
        'You reach the beacon tower as the last light fades. The machinery hums with temporal energy, and you spot a patrol approaching from the east.',
      choices: [
        {
          text: 'Climb the tower to disable the beacon',
          choiceType: 'TACTICAL_APPROACH',
          primaryDelta: 'GOAL_SHIFT',
        },
        {
          text: 'Hide and observe the patrol pattern',
          choiceType: 'INVESTIGATION',
          primaryDelta: 'INFORMATION_REVEALED',
        },
      ],
      currentLocation: 'Beacon tower base',
      threatsAdded: ['Patrol approaching from the east'],
      threadsAdded: [
        {
          text: 'Beacon machinery humming with temporal energy',
          threadType: 'INFORMATION',
          urgency: 'MEDIUM',
        },
      ],
      protagonistAffect: {
        primaryEmotion: 'tension',
        primaryIntensity: 'strong',
        primaryCause: 'Patrol approaching while near beacon tower',
        secondaryEmotions: ['curiosity', 'caution'],
        dominantMotivation: 'Disable beacon while avoiding detection',
      },
      newCanonFacts: [{ text: 'Beacon towers emit temporal energy', factType: 'LAW' }],
      sceneSummary: 'Test summary of the scene events and consequences.',
      rawResponse: `continuation-beacon-${stepIndex}`,
    });
  }

  if (selectedChoice.includes('patrol schedules') || selectedChoice.includes('checkpoint')) {
    return createMockFinalResult({
      narrative:
        'The checkpoint guard is distracted by a commotion. You slip past and find the schedule board, memorizing the patrol routes.',
      choices: [
        {
          text: 'Copy the full schedule and escape',
          choiceType: 'TACTICAL_APPROACH',
          primaryDelta: 'GOAL_SHIFT',
        },
        {
          text: 'Sabotage the schedule board',
          choiceType: 'INVESTIGATION',
          primaryDelta: 'INFORMATION_REVEALED',
        },
      ],
      currentLocation: 'Border checkpoint interior',
      threatsRemoved: ['Checkpoint guard attention'],
      constraintsAdded: ['Patrol routes memorized'],
      protagonistAffect: {
        primaryEmotion: 'focus',
        primaryIntensity: 'overwhelming',
        primaryCause: 'Successfully infiltrating checkpoint undetected',
        secondaryEmotions: ['satisfaction', 'urgency'],
        dominantMotivation: 'Gather intelligence on patrol patterns',
      },
      newCanonFacts: [{ text: 'Checkpoints store patrol schedules on physical boards', factType: 'LAW' }],
      sceneSummary: 'Test summary of the scene events and consequences.',
      rawResponse: `continuation-checkpoint-${stepIndex}`,
    });
  }

  if (selectedChoice.includes('hiding spot') || selectedChoice.includes('stalled district')) {
    return createMockFinalResult({
      narrative:
        'The stalled district is eerily quiet—time moves slowly here. You find an abandoned warehouse where clocks tick once per hour.',
      choices: [
        {
          text: 'Set up a long-term hideout',
          choiceType: 'TACTICAL_APPROACH',
          primaryDelta: 'GOAL_SHIFT',
        },
        {
          text: 'Use the time dilation to plan your next move',
          choiceType: 'INVESTIGATION',
          primaryDelta: 'INFORMATION_REVEALED',
        },
      ],
      currentLocation: 'Time-dilated warehouse in stalled district',
      threatsRemoved: ['Immediate patrol threat'],
      constraintsAdded: ['Time moves slowly here'],
      threadsAdded: [
        { text: 'Abandoned warehouse discovered', threadType: 'INFORMATION', urgency: 'MEDIUM' },
      ],
      protagonistAffect: {
        primaryEmotion: 'relief',
        primaryIntensity: 'moderate',
        primaryCause: 'Finding a safe location in the stalled district',
        secondaryEmotions: ['unease', 'contemplation'],
        dominantMotivation: 'Establish a secure base for operations',
      },
      newCanonFacts: [{ text: 'Stalled districts experience severe time dilation', factType: 'LAW' }],
      sceneSummary: 'Test summary of the scene events and consequences.',
      rawResponse: `continuation-stalled-${stepIndex}`,
    });
  }

  // Default continuation for any other choice
  return createMockFinalResult({
    narrative:
      'Your actions draw attention. A patrol closes in, and you must make a critical decision that will determine your fate.',
    choices: [
      {
        text: 'Surrender to protect your sibling',
        choiceType: 'TACTICAL_APPROACH',
        primaryDelta: 'GOAL_SHIFT',
      },
      {
        text: 'Make a desperate escape attempt',
        choiceType: 'INVESTIGATION',
        primaryDelta: 'INFORMATION_REVEALED',
      },
    ],
    currentLocation: 'Exposed position near patrol route',
    threatsAdded: ['Patrol closing in'],
    constraintsAdded: ['Critical decision point reached'],
    protagonistAffect: {
      primaryEmotion: 'fear',
      primaryIntensity: 'overwhelming',
      primaryCause: 'Patrol closing in on position',
      secondaryEmotions: ['desperation', 'protectiveness'],
      dominantMotivation: 'Protect sibling at any cost',
    },
    newCanonFacts: [{ text: 'Patrols can track movement through time fractures', factType: 'LAW' }],
    sceneSummary: 'Test summary of the scene events and consequences.',
    rawResponse: `continuation-default-${stepIndex}`,
  });
}

const defaultAnalystResult = createMockAnalystResult({
  sceneMomentum: 'STASIS',
  objectiveEvidenceStrength: 'NONE',
  commitmentStrength: 'NONE',
  rawResponse: 'analyst-raw',
});

const replayOpeningResult = createMockFinalResult({
  narrative:
    'The canal waters rise as the dawn siren sounds. You clutch the testimony documents, watching political agents argue on the bridge above.',
  choices: [
    {
      text: 'Swim under the bridge while they argue',
      choiceType: 'TACTICAL_APPROACH',
      primaryDelta: 'GOAL_SHIFT',
    },
    {
      text: 'Wait for the water level to change',
      choiceType: 'INVESTIGATION',
      primaryDelta: 'INFORMATION_REVEALED',
    },
  ],
  currentLocation: 'Canal waterway beneath bridge',
  threatsAdded: ['Political agents on bridge above'],
  constraintsAdded: ['Carrying testimony documents', 'Canal waters rising'],
  protagonistAffect: {
    primaryEmotion: 'urgency',
    primaryIntensity: 'overwhelming',
    primaryCause: 'Need to deliver testimony documents safely',
    secondaryEmotions: ['wariness', 'resolve'],
    dominantMotivation: 'Transport documents past political agents',
  },
  newCanonFacts: [
    { text: 'Canals respond to civic votes at dawn sirens', factType: 'LAW' },
    { text: 'Political factions alter street reality', factType: 'LAW' },
  ],
  sceneSummary: 'Test summary of the scene events and consequences.',
  rawResponse: 'replay-opening',
});

function buildReplayWriterResult(): ReturnType<typeof buildWriterResult> {
  return createMockFinalResult({
    narrative:
      'You slip beneath the murky water, the documents sealed in waterproof wrapping. The agents never notice your passage.',
    choices: [
      {
        text: 'Surface at the safe house dock',
        choiceType: 'TACTICAL_APPROACH',
        primaryDelta: 'GOAL_SHIFT',
      },
      {
        text: 'Continue underwater to the testimony hall',
        choiceType: 'INVESTIGATION',
        primaryDelta: 'INFORMATION_REVEALED',
      },
    ],
    currentLocation: 'Underwater passage beneath bridge',
    threatsRemoved: ['Political agents on bridge'],
    threadsResolved: ['Bridge crossing obstacle'],
    protagonistAffect: {
      primaryEmotion: 'relief',
      primaryIntensity: 'strong',
      primaryCause: 'Successfully evading agents undetected',
      secondaryEmotions: ['confidence', 'focus'],
      dominantMotivation: 'Reach safe destination with documents',
    },
    newCanonFacts: [{ text: 'Safe houses have underwater access points', factType: 'LAW' }],
    sceneSummary: 'Test summary of the scene events and consequences.',
    rawResponse: 'replay-continuation',
  });
}

function expectAccumulatedInventoryPrefix(parent: Page, child: Page): void {
  expect(child.accumulatedInventory.length).toBeGreaterThanOrEqual(
    parent.accumulatedInventory.length
  );
  expect(child.accumulatedInventory.slice(0, parent.accumulatedInventory.length)).toEqual(
    parent.accumulatedInventory
  );
}

const mockedStructureResult = createMockStoryStructure({
  overallTheme: 'Expose regime manipulations while protecting vulnerable allies.',
  acts: [
    {
      id: '1',
      name: 'Act I',
      objective: 'Reveal the initial threat.',
      stakes: 'Failure leaves the protagonist blind to the core danger.',
      entryCondition: 'A disruptive event forces action.',
      beats: [
        {
          id: '1.1',
          name: 'First anomaly discovery',
          description: 'Discover the first anomaly.',
          objective: 'Confirm the threat is real.',
          role: 'setup',
        },
        {
          id: '1.2',
          name: 'Immediate ally recruitment',
          description: 'Gather immediate allies.',
          objective: 'Avoid isolation.',
          role: 'escalation',
        },
      ],
    },
    {
      id: '2',
      name: 'Act II',
      objective: 'Escalate conflict and gather leverage.',
      stakes: 'Failure gives control to the antagonist force.',
      entryCondition: 'The threat network is partially mapped.',
      beats: [
        {
          id: '2.1',
          name: 'Risky infiltration attempt',
          description: 'Attempt a risky infiltration.',
          objective: 'Extract actionable proof.',
          role: 'escalation',
        },
        {
          id: '2.2',
          name: 'Retaliation endurance',
          description: 'Survive retaliation.',
          objective: 'Preserve capability to continue.',
          role: 'turning_point',
        },
      ],
    },
    {
      id: '3',
      name: 'Act III',
      objective: 'Force final resolution.',
      stakes: 'Failure permanently cements the hostile status quo.',
      entryCondition: 'Public confrontation becomes unavoidable.',
      beats: [
        {
          id: '3.1',
          name: 'Final strategy commitment',
          description: 'Commit to final strategy.',
          objective: 'Align allies and resources.',
          role: 'escalation',
        },
        {
          id: '3.2',
          name: 'Decisive action delivery',
          description: 'Deliver decisive action.',
          objective: 'Resolve primary conflict.',
          role: 'resolution',
        },
      ],
    },
  ],
  rawResponse: 'mock-structure',
});

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
      writerBrief: {
        openingLineDirective: 'Start in motion.',
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

    mockedGenerateOpeningPage.mockImplementation((context) => {
      if (context.tone.includes('political intrigue')) {
        return Promise.resolve(replayOpeningResult);
      }
      return Promise.resolve(openingResult);
    });
    mockedGenerateStoryStructure.mockResolvedValue(mockedStructureResult);

    mockedGenerateWriterPage.mockImplementation((context) => {
      continuationCallCount += 1;
      if (context.tone.includes('political intrigue')) {
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
      spine: mockSpine,
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
      spine: mockSpine,
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
