import { StoryEngine, storyEngine } from '@/engine';
import { generateContinuationPage, generateOpeningPage, generateStoryStructure } from '@/llm';
import { createBeatDeviation, createNoDeviation, StoryId } from '@/models';

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
          description: 'Publicly commit to a risky alliance.',
          objective: 'Gain temporary access to restricted circles.',
        },
        {
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
          description: 'Infiltrate the command relay.',
          objective: 'Extract plans before they are burned.',
        },
        {
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
          description: 'Assemble witnesses for public testimony.',
          objective: 'Make suppression impossible.',
        },
        {
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
  choices: ['Commit to the alliance publicly', 'Refuse and go underground'],
  stateChangesAdded: ['Publicly entered alliance proceedings'],
  stateChangesRemoved: [],
  newCanonFacts: ['Emergency laws can be changed between bell strikes'],
  newCharacterCanonFacts: {},
  characterStateChangesAdded: [],
  characterStateChangesRemoved: [],
  inventoryAdded: [],
  inventoryRemoved: [],
  healthAdded: [],
  healthRemoved: [],
  isEnding: false,
  beatConcluded: false,
  beatResolution: '',
  deviation: createNoDeviation(),
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
            description: 'Publicly commit to a risky alliance.',
            objective: 'Gain temporary access to restricted circles.',
          },
          {
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
            description: 'Expose forged emergency decrees.',
            objective: 'Disrupt command authority.',
          },
          {
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
            description: 'Coordinate a public witness chain.',
            objective: 'Prevent information suppression.',
          },
          {
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
    json: async () => ({
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

function buildContinuationResult(selectedChoice: string): typeof openingResult {
  if (selectedChoice === 'Commit to the alliance publicly') {
    return {
      narrative:
        'Inside the alliance chamber you copy sealed dispatches proving law edits are synchronized to private signal towers.',
      choices: ['Leak your true intent to a dockworker ally', 'Double down publicly to gain rank'],
      stateChangesAdded: ['Copied dispatches from alliance chamber'],
      stateChangesRemoved: [],
      newCanonFacts: ['Signal towers coordinate legal edits by district'],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      isEnding: false,
      beatConcluded: true,
      beatResolution: 'Secured proof that alliance command controls emergency law edits.',
      deviation: createNoDeviation(),
      rawResponse: 'continuation-initial',
    };
  }

  if (selectedChoice === 'Leak your true intent to a dockworker ally') {
    return {
      narrative:
        'Your covert leak is exposed, and the alliance recasts you as a loyal enforcer, invalidating the original infiltration route.',
      choices: ['Rebuild trust with dockworkers', 'Attempt immediate forum confrontation'],
      stateChangesAdded: ['Cover identity compromised by alliance propaganda'],
      stateChangesRemoved: [],
      newCanonFacts: ['Alliance propaganda can invert public loyalties in a single night'],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      isEnding: false,
      beatConcluded: false,
      beatResolution: '',
      deviation: createBeatDeviation(
        'The protagonist is publicly framed as regime-aligned, invalidating infiltration beats.',
        ['2.1', '2.2', '3.1', '3.2'],
        'Public perception now places the protagonist inside alliance leadership.',
      ),
      rawResponse: 'continuation-deviation',
    };
  }

  return {
    narrative:
      'You and the dockworkers publish authenticated dispatches, forcing an emergency vote that dismantles the alliance command structure before dawn.',
    choices: [],
    stateChangesAdded: ['Emergency vote dissolved alliance emergency powers'],
    stateChangesRemoved: [],
    newCanonFacts: ['Civic votes can immediately revoke emergency command chains'],
    newCharacterCanonFacts: {},
    characterStateChangesAdded: [],
    characterStateChangesRemoved: [],
    inventoryAdded: [],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    isEnding: true,
    beatConcluded: true,
    beatResolution: 'Alliance emergency authority ended through public accountability.',
    deviation: createNoDeviation(),
    rawResponse: 'continuation-ending',
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

    mockedGenerateStoryStructure.mockResolvedValue(mockedStructureResult);
    mockedGenerateOpeningPage.mockResolvedValue(openingResult);
    mockedGenerateContinuationPage.mockImplementation((context) =>
      Promise.resolve(buildContinuationResult(context.selectedChoice)),
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
      'The protagonist is publicly framed as regime-aligned, invalidating infiltration beats.',
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
    expect(replayRewritePath.page.structureVersionId).toBe(firstRewritePath.page.structureVersionId);

    const secondEngine = new StoryEngine();
    secondEngine.init();

    const reloadedStory = await secondEngine.loadStory(start.story.id);
    const reloadedPage = await secondEngine.getPage(start.story.id, firstRewritePath.page.id);

    expect(reloadedStory?.structureVersions).toHaveLength(2);
    expect(reloadedPage?.structureVersionId).toBe(firstRewritePath.page.structureVersionId);
  });
});
