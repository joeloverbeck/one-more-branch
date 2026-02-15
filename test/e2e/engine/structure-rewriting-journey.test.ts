import { StoryEngine, storyEngine } from '@/engine';
import {
  generatePageWriterOutput,
  generateAnalystEvaluation,
  generateOpeningPage,
  generatePagePlan,
  generateStateAccountant,
  generateStoryStructure,
} from '@/llm';
import { StoryId } from '@/models';
import type { AnalystResult } from '@/llm/analyst-types';
import type { PageWriterResult } from '@/llm/writer-types';

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

const TEST_PREFIX = 'E2E TEST STRREWSYS-016';

const mockedStructureResult = {
  overallTheme: 'Protect the city while exposing institutional betrayal.',
  acts: [
    {
      name: 'Act I - Fracture',
      objective: 'Discover how the alliance is manipulated.',
      stakes: 'Failure locks the city into authoritarian control.',
      entryCondition: 'A public emergency forces immediate action.',
      beats: [
        {
          name: 'Alliance commitment',
          description: 'Publicly commit to a risky alliance.',
          objective: 'Gain temporary access to restricted circles.',
        },
        {
          name: 'Alliance control map',
          description: 'Privately map who controls the alliance.',
          objective: 'Find leverage before exposure.',
        },
      ],
    },
    {
      name: 'Act II - Countermove',
      objective: 'Break the alliance command network.',
      stakes: 'Failure gives the regime permanent narrative control.',
      entryCondition: 'The first command links are identified.',
      beats: [
        {
          name: 'Command relay infiltration',
          description: 'Infiltrate the command relay.',
          objective: 'Extract plans before they are burned.',
        },
        {
          name: 'Informant protection',
          description: 'Protect informants from retaliation.',
          objective: 'Keep evidence channels alive.',
        },
      ],
    },
    {
      name: 'Act III - Reckoning',
      objective: 'Force a public reckoning.',
      stakes: 'Failure normalizes the coup.',
      entryCondition: 'Enough evidence exists for direct challenge.',
      beats: [
        {
          name: 'Witness assembly',
          description: 'Assemble witnesses for public testimony.',
          objective: 'Make suppression impossible.',
        },
        {
          name: 'Civic forum confrontation',
          description: 'Confront leadership in the civic forum.',
          objective: 'Resolve the conflict with public accountability.',
        },
      ],
    },
  ],
  rawResponse: 'initial-structure',
};

const openingResult = {
  narrative:
    'You step onto the flooded parliament steps and swear temporary loyalty so you can track who is rewriting emergency laws overnight.',
  choices: [
    {
      text: 'Commit to the alliance publicly',
      choiceType: 'TACTICAL_APPROACH',
      primaryDelta: 'GOAL_SHIFT',
    },
    {
      text: 'Refuse and go underground',
      choiceType: 'INVESTIGATION',
      primaryDelta: 'INFORMATION_REVEALED',
    },
  ],
  currentLocation: 'Flooded parliament steps',
  threatsAdded: ['Regime surveillance on parliament grounds'],
  threatsRemoved: [],
  constraintsAdded: ['Sworn temporary loyalty to alliance'],
  constraintsRemoved: [],
  threadsAdded: [
    { text: 'Tracking emergency law rewrites', threadType: 'INFORMATION', urgency: 'MEDIUM' },
  ],
  threadsResolved: [],
  protagonistAffect: {
    primaryEmotion: 'determination',
    primaryIntensity: 7,
    primaryCause: 'Infiltrating alliance to expose law manipulation',
    secondaryEmotions: ['caution', 'resolve'],
    dominantMotivation: 'Discover who controls emergency law changes',
  },
  newCanonFacts: ['Emergency laws can be changed between bell strikes'],
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

function createRewriteFetchResponse(): Response {
  const rewrittenStructure = {
    overallTheme: 'Protect the city while exposing institutional betrayal.',
    acts: [
      {
        name: 'Act I Reframed',
        objective: 'Stabilize trust after public compromise.',
        stakes: 'Failure leaves the hero isolated.',
        entryCondition: 'The alliance now sees the hero as compromised.',
        beats: [
          {
            name: 'Risky alliance commitment',
            description: 'Publicly commit to a risky alliance.',
            objective: 'Gain temporary access to restricted circles.',
          },
          {
            name: 'Hidden ally trust repair',
            description: 'Rebuild trust with one hidden ally.',
            objective: 'Create a resilient evidence channel.',
          },
        ],
      },
      {
        name: 'Act II Reframed',
        objective: 'Attack the regime through legitimacy cracks.',
        stakes: 'Failure legitimizes emergency rule.',
        entryCondition: 'Hidden channels expose legal manipulation.',
        beats: [
          {
            name: 'Forged decree exposure',
            description: 'Expose forged emergency decrees.',
            objective: 'Disrupt command authority.',
          },
          {
            name: 'Witness shield',
            description: 'Shield witnesses from reprisals.',
            objective: 'Preserve evidence continuity.',
          },
        ],
      },
      {
        name: 'Act III Reframed',
        objective: 'Resolve the conflict in public view.',
        stakes: 'Failure rewrites history in favor of the regime.',
        entryCondition: 'Public doubt reaches critical mass.',
        beats: [
          {
            name: 'Public witness chain',
            description: 'Coordinate a public witness chain.',
            objective: 'Prevent information suppression.',
          },
          {
            name: 'Binding civic vote',
            description: 'Force a binding civic vote.',
            objective: 'End emergency rule through accountability.',
          },
        ],
      },
    ],
  };

  return {
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        choices: [
          {
            message: {
              content: JSON.stringify(rewrittenStructure),
            },
          },
        ],
      }),
  } as Response;
}

function buildWriterResult(selectedChoice: string): PageWriterResult {
  if (selectedChoice === 'Commit to the alliance publicly') {
    return {
      narrative:
        'Inside the alliance chamber you copy sealed dispatches proving law edits are synchronized to private signal towers.',
      choices: [
        {
          text: 'Leak your true intent to a dockworker ally',
          choiceType: 'TACTICAL_APPROACH',
          primaryDelta: 'GOAL_SHIFT',
        },
        {
          text: 'Double down publicly to gain rank',
          choiceType: 'INVESTIGATION',
          primaryDelta: 'INFORMATION_REVEALED',
        },
      ],
      currentLocation: 'Alliance chamber interior',
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: ['Copied dispatches as evidence'],
      constraintsRemoved: [],
      threadsAdded: [
        { text: 'Signal tower coordination exposed', threadType: 'INFORMATION', urgency: 'MEDIUM' },
      ],
      threadsResolved: [],
      protagonistAffect: {
        primaryEmotion: 'triumph',
        primaryIntensity: 7,
        primaryCause: 'Successfully obtaining proof of law manipulation',
        secondaryEmotions: ['anticipation', 'tension'],
        dominantMotivation: 'Expose signal tower coordination to the public',
      },
      newCanonFacts: ['Signal towers coordinate legal edits by district'],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      sceneSummary: 'Test summary of the scene events and consequences.',
      isEnding: false,
      rawResponse: 'continuation-initial',
    };
  }

  if (selectedChoice === 'Leak your true intent to a dockworker ally') {
    return {
      narrative:
        'Your covert leak is exposed, and the alliance recasts you as a loyal enforcer, invalidating the original infiltration route.',
      choices: [
        {
          text: 'Rebuild trust with dockworkers',
          choiceType: 'TACTICAL_APPROACH',
          primaryDelta: 'GOAL_SHIFT',
        },
        {
          text: 'Attempt immediate forum confrontation',
          choiceType: 'INVESTIGATION',
          primaryDelta: 'INFORMATION_REVEALED',
        },
      ],
      currentLocation: 'Alliance controlled territory',
      threatsAdded: ['Alliance propaganda targeting protagonist'],
      threatsRemoved: [],
      constraintsAdded: ['Cover identity compromised'],
      constraintsRemoved: ['Infiltration route access'],
      threadsAdded: [
        {
          text: 'Public perception inverted by propaganda',
          threadType: 'INFORMATION',
          urgency: 'MEDIUM',
        },
      ],
      threadsResolved: [],
      protagonistAffect: {
        primaryEmotion: 'dismay',
        primaryIntensity: 8,
        primaryCause: 'Cover blown and publicly reframed as regime loyalist',
        secondaryEmotions: ['frustration', 'desperation'],
        dominantMotivation: 'Rebuild credibility and salvage mission',
      },
      newCanonFacts: ['Alliance propaganda can invert public loyalties in a single night'],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      sceneSummary: 'Test summary of the scene events and consequences.',
      isEnding: false,
      rawResponse: 'continuation-deviation',
    };
  }

  return {
    narrative:
      'You and the dockworkers publish authenticated dispatches, forcing an emergency vote that dismantles the alliance command structure before dawn.',
    choices: [],
    currentLocation: 'Civic forum',
    threatsAdded: [],
    threatsRemoved: ['Alliance command structure'],
    constraintsAdded: [],
    constraintsRemoved: ['Alliance emergency powers'],
    threadsAdded: [],
    threadsResolved: ['Emergency law manipulation', 'Alliance control over city'],
    protagonistAffect: {
      primaryEmotion: 'vindication',
      primaryIntensity: 9,
      primaryCause: 'Successfully dismantling alliance emergency authority',
      secondaryEmotions: ['relief', 'pride'],
      dominantMotivation: 'Ensure lasting accountability for the regime',
    },
    newCanonFacts: ['Civic votes can immediately revoke emergency command chains'],
    newCharacterCanonFacts: {},
    characterStateChangesAdded: [],
    characterStateChangesRemoved: [],
    inventoryAdded: [],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    sceneSummary: 'Test summary of the scene events and consequences.',
    isEnding: true,
    rawResponse: 'continuation-ending',
  };
}

function buildAnalystResult(narrative: string): AnalystResult {
  if (narrative.includes('copy sealed dispatches')) {
    return {
      beatConcluded: true,
      beatResolution: 'Secured proof that alliance command controls emergency law edits.',
      deviationDetected: false,
      deviationReason: '',
      invalidatedBeatIds: [] as string[],
      narrativeSummary: 'The protagonist continues the current scene.',
      pacingIssueDetected: false,
      pacingIssueReason: '',
      recommendedAction: 'none',
      npcCoherenceAdherent: true,
      npcCoherenceIssues: '',
      rawResponse: 'analyst-raw',
    };
  }

  if (narrative.includes('covert leak is exposed')) {
    return {
      beatConcluded: false,
      beatResolution: '',
      deviationDetected: true,
      deviationReason:
        'The protagonist is publicly framed as regime-aligned, invalidating infiltration beats.',
      invalidatedBeatIds: ['2.1', '2.2', '3.1', '3.2'],
      narrativeSummary: 'Public perception now places the protagonist inside alliance leadership.',
      pacingIssueDetected: false,
      pacingIssueReason: '',
      recommendedAction: 'none',
      npcCoherenceAdherent: true,
      npcCoherenceIssues: '',
      rawResponse: 'analyst-raw',
    };
  }

  return {
    beatConcluded: true,
    beatResolution: 'Alliance emergency authority ended through public accountability.',
    deviationDetected: false,
    deviationReason: '',
    invalidatedBeatIds: [] as string[],
    narrativeSummary: 'The protagonist continues the current scene.',
    pacingIssueDetected: false,
    pacingIssueReason: '',
    recommendedAction: 'none',
    npcCoherenceAdherent: true,
    npcCoherenceIssues: '',
    rawResponse: 'analyst-raw',
  };
}

describe('Structure Rewriting Journey E2E', () => {
  const createdStoryIds = new Set<StoryId>();
  let originalFetch: typeof fetch;

  beforeAll(() => {
    storyEngine.init();
    originalFetch = global.fetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGeneratePagePlan.mockResolvedValue({
      sceneIntent: 'Advance the rewritten branch with concrete outcomes.',
      continuityAnchors: [],
      writerBrief: {
        openingLineDirective: 'Start with decisive action.',
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

    mockedGenerateStoryStructure.mockResolvedValue(mockedStructureResult);
    mockedGenerateOpeningPage.mockResolvedValue(openingResult);
    mockedGenerateWriterPage.mockImplementation((context) =>
      Promise.resolve(buildWriterResult(context.selectedChoice))
    );
    mockedGenerateAnalystEvaluation.mockImplementation((context) =>
      Promise.resolve(buildAnalystResult(context.narrative))
    );

    global.fetch = jest.fn().mockResolvedValue(createRewriteFetchResponse()) as typeof fetch;
  });

  afterEach(async () => {
    global.fetch = originalFetch;

    for (const storyId of createdStoryIds) {
      try {
        await storyEngine.deleteStory(storyId);
      } catch {
        // Keep cleanup failures from masking test assertions.
      }
    }

    createdStoryIds.clear();
  });

  it('completes a rewrite-aware playthrough with a valid structure version chain', async () => {
    const start = await storyEngine.startStory({
      title: `${TEST_PREFIX} Rewrite Chain`,
      characterConcept: `${TEST_PREFIX}: A civic mediator navigating a staged alliance to expose legal manipulation.`,
      worldbuilding: 'A floodlit capital where emergency law changes follow hidden signal towers.',
      tone: 'political thriller',
      apiKey: 'mock-api-key',
    });
    createdStoryIds.add(start.story.id);
    for (const act of start.story.structure?.acts ?? []) {
      for (const beat of act.beats) {
        expect(beat.name).toBeTruthy();
      }
    }

    const page2 = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: start.page.id,
      choiceIndex: 0,
      apiKey: 'mock-api-key',
    });

    const page3 = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: page2.page.id,
      choiceIndex: 0,
      apiKey: 'mock-api-key',
    });

    const reloadedAfterRewrite = await storyEngine.loadStory(start.story.id);
    expect(reloadedAfterRewrite).not.toBeNull();
    expect(reloadedAfterRewrite?.structureVersions).toHaveLength(2);

    const initialVersion = reloadedAfterRewrite?.structureVersions?.[0];
    const rewrittenVersion = reloadedAfterRewrite?.structureVersions?.[1];

    expect(rewrittenVersion?.previousVersionId).toBe(initialVersion?.id);
    expect(rewrittenVersion?.createdAtPageId).toBe(page3.page.id);
    expect(rewrittenVersion?.rewriteReason).toBe(
      'The protagonist is publicly framed as regime-aligned, invalidating infiltration beats.'
    );
    expect(rewrittenVersion?.preservedBeatIds).toContain('1.1');
    expect(page2.page.structureVersionId).toBe(initialVersion?.id ?? null);
    expect(page3.page.structureVersionId).toBe(rewrittenVersion?.id ?? null);

    const page4 = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: page3.page.id,
      choiceIndex: 0,
      apiKey: 'mock-api-key',
    });

    expect(page4.page.isEnding).toBe(true);
    expect(page4.page.choices).toHaveLength(0);
    expect(page4.page.structureVersionId).toBe(rewrittenVersion?.id ?? null);
  });

  it('replays generated rewritten pages and persists them across engine instances', async () => {
    const start = await storyEngine.startStory({
      title: `${TEST_PREFIX} Replay Rewrite`,
      characterConcept: `${TEST_PREFIX}: An alliance insider leaking proof while avoiding total exposure.`,
      worldbuilding: 'A harbor parliament where sirens authorize instant policy rewrites.',
      tone: 'suspense',
      apiKey: 'mock-api-key',
    });
    createdStoryIds.add(start.story.id);

    const page2 = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: start.page.id,
      choiceIndex: 0,
      apiKey: 'mock-api-key',
    });

    const firstRewritePath = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: page2.page.id,
      choiceIndex: 0,
      apiKey: 'mock-api-key',
    });

    const replayRewritePath = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: page2.page.id,
      choiceIndex: 0,
      apiKey: 'mock-api-key',
    });

    expect(firstRewritePath.wasGenerated).toBe(true);
    expect(replayRewritePath.wasGenerated).toBe(false);
    expect(replayRewritePath.page.id).toBe(firstRewritePath.page.id);
    expect(replayRewritePath.page.structureVersionId).toBe(
      firstRewritePath.page.structureVersionId
    );

    const secondEngine = new StoryEngine();
    secondEngine.init();

    const reloadedStory = await secondEngine.loadStory(start.story.id);
    const reloadedPage = await secondEngine.getPage(start.story.id, firstRewritePath.page.id);

    expect(reloadedStory?.structureVersions).toHaveLength(2);
    expect(reloadedPage?.structureVersionId).toBe(firstRewritePath.page.structureVersionId);
  });
});
