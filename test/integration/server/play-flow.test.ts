import type { Request, Response, Router } from 'express';
import { storyEngine } from '@/engine';
import { generateContinuationPage, generateOpeningPage, generateStoryStructure } from '@/llm';
import type { StoryId } from '@/models';
import { playRoutes } from '@/server/routes/play';
import { storyRoutes } from '@/server/routes/stories';

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

const TEST_PREFIX = 'TEST USEINT-010 server integration';
const mockedStructureResult = {
  overallTheme: 'Survive and reveal hidden truths in a shifting world.',
  acts: [
    {
      name: 'Act I',
      objective: 'Establish immediate danger.',
      stakes: 'Failure traps the protagonist early.',
      entryCondition: 'A disruptive event forces movement.',
      beats: [
        { description: 'Assess first threat', objective: 'Avoid immediate collapse.' },
        { description: 'Choose initial direction', objective: 'Set investigation path.' },
      ],
    },
    {
      name: 'Act II',
      objective: 'Deepen conflict and gather leverage.',
      stakes: 'Failure empowers hostile forces.',
      entryCondition: 'The first choices expose broader conflict.',
      beats: [
        { description: 'Take a risky action', objective: 'Gain critical information.' },
        { description: 'Absorb consequences', objective: 'Preserve forward progress.' },
      ],
    },
    {
      name: 'Act III',
      objective: 'Reach final resolution.',
      stakes: 'Failure leaves permanent damage.',
      entryCondition: 'Enough information exists for decisive action.',
      beats: [
        { description: 'Commit final approach', objective: 'Align resources.' },
        { description: 'Deliver final move', objective: 'Resolve central conflict.' },
      ],
    },
  ],
  rawResponse: 'structure',
};

type RouteLayer = {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack?: Array<{ handle: (req: Request, res: Response) => Promise<void> | void }>;
  };
};

type ResMocks = {
  res: Response;
  status: jest.Mock;
  render: jest.Mock;
  redirect: jest.Mock;
  json: jest.Mock;
};

function getRouteHandler(
  router: Router,
  method: 'get' | 'post',
  path: string,
): (req: Request, res: Response) => Promise<void> | void {
  const layer = (router.stack as unknown as RouteLayer[]).find(
    (item) => item.route?.path === path && item.route?.methods?.[method],
  );
  const handler = layer?.route?.stack?.[0]?.handle;

  if (!handler) {
    throw new Error(`${method.toUpperCase()} ${path} handler not found`);
  }

  return handler;
}

function createMockResponse(): ResMocks {
  const status = jest.fn().mockReturnThis();
  const render = jest.fn().mockReturnThis();
  const redirect = jest.fn().mockReturnThis();
  const json = jest.fn().mockReturnThis();

  return {
    res: { status, render, redirect, json } as unknown as Response,
    status,
    render,
    redirect,
    json,
  };
}

function parseStoryIdFromRedirect(redirectCallArg: unknown): StoryId {
  const redirectLocation = String(redirectCallArg);
  const storyId = redirectLocation.match(/\/play\/([a-f0-9-]+)/)?.[1];
  if (!storyId) {
    throw new Error(`Could not parse story id from redirect location: ${redirectLocation}`);
  }

  return storyId as StoryId;
}

function getMockCallArg(mockFn: jest.Mock, callIndex: number, argIndex: number): unknown {
  const calls = mockFn.mock.calls as unknown[][];
  return calls[callIndex]?.[argIndex];
}

// Helper to wait for a mock function to be called with polling
async function waitForMock(mock: jest.Mock, timeout = 1000): Promise<void> {
  const start = Date.now();
  while (mock.mock.calls.length === 0) {
    if (Date.now() - start > timeout) {
      throw new Error('Timed out waiting for mock to be called');
    }
    await new Promise((resolve) => setImmediate(resolve));
  }
}

describe('Play Flow Integration (Mocked LLM)', () => {
  const createdStoryIds = new Set<StoryId>();
  const createStoryHandler = getRouteHandler(storyRoutes, 'post', '/create');
  const chooseHandler = getRouteHandler(playRoutes, 'post', '/:storyId/choice');

  beforeEach(() => {
    jest.clearAllMocks();
    storyEngine.init();
    mockedGenerateStoryStructure.mockResolvedValue(mockedStructureResult);
  });

  afterEach(async () => {
    for (const storyId of createdStoryIds) {
      try {
        await storyEngine.deleteStory(storyId);
      } catch {
        // Ignore cleanup failures so assertion failures remain primary.
      }
    }

    createdStoryIds.clear();

    const stories = await storyEngine.listStories();
    for (const story of stories) {
      if (story.characterConcept.startsWith(TEST_PREFIX)) {
        try {
          await storyEngine.deleteStory(story.id);
        } catch {
          // Ignore stale fixture cleanup failures.
        }
      }
    }
  });

  it('creates a story through POST /stories/create with mocked LLM output', async () => {
    mockedGenerateOpeningPage.mockResolvedValueOnce({
      narrative: 'You find yourself in a dark forest...',
      choices: ['Enter the cave', 'Follow the path', 'Climb a tree'],
      stateChangesAdded: ['Entered the forest'],
      stateChangesRemoved: [],
      newCanonFacts: ['The forest is ancient'],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      isEnding: false,
      storyArc: 'Find your way out',
      rawResponse: 'opening',
    });

    const { res, status, render, redirect } = createMockResponse();

    void createStoryHandler(
      {
        body: {
          title: `${TEST_PREFIX} Title`,
          characterConcept: `${TEST_PREFIX} create-story`,
          tone: 'fantasy',
          apiKey: 'mock-api-key-12345',
        },
      } as Request,
      res,
    );
    await waitForMock(redirect);

    expect(status).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledTimes(1);

    const storyId = parseStoryIdFromRedirect(getMockCallArg(redirect, 0, 0));
    createdStoryIds.add(storyId);

    expect(mockedGenerateOpeningPage).toHaveBeenCalledTimes(1);
    expect(mockedGenerateContinuationPage).not.toHaveBeenCalled();
  });

  it('generates a continuation page through POST /play/:storyId/choice', async () => {
    mockedGenerateOpeningPage.mockResolvedValueOnce({
      narrative: 'Initial narrative...',
      choices: ['Choice A', 'Choice B'],
      stateChangesAdded: [],
      stateChangesRemoved: [],
      newCanonFacts: [],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      isEnding: false,
      storyArc: 'Arc',
      rawResponse: 'opening',
    });

    const createRes = createMockResponse();
    void createStoryHandler(
      {
        body: {
          title: `${TEST_PREFIX} Title`,
          characterConcept: `${TEST_PREFIX} make-choice`,
          apiKey: 'mock-api-key-12345',
        },
      } as Request,
      createRes.res,
    );
    await waitForMock(createRes.redirect);

    const storyId = parseStoryIdFromRedirect(getMockCallArg(createRes.redirect, 0, 0));
    createdStoryIds.add(storyId);

    mockedGenerateContinuationPage.mockResolvedValueOnce({
      narrative: 'You chose wisely...',
      choices: ['Continue', 'Inspect surroundings'],
      stateChangesAdded: ['Made a choice'],
      stateChangesRemoved: [],
      newCanonFacts: [],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      isEnding: false,
      storyArc: 'Arc',
      rawResponse: 'continuation',
    });

    const choiceRes = createMockResponse();
    void chooseHandler(
      {
        params: { storyId },
        body: {
          pageId: 1,
          choiceIndex: 0,
          apiKey: 'mock-api-key-12345',
        },
      } as unknown as Request,
      choiceRes.res,
    );
    await waitForMock(choiceRes.json);

    expect(choiceRes.status).not.toHaveBeenCalled();
    const choicePayload = getMockCallArg(choiceRes.json, 0, 0) as
      | {
          success?: boolean;
          wasGenerated?: boolean;
          page?: { id?: number; narrativeText?: string };
        }
      | undefined;
    expect(choicePayload?.success).toBe(true);
    expect(choicePayload?.wasGenerated).toBe(true);
    expect(choicePayload?.page?.id).toBe(2);
    expect(choicePayload?.page?.narrativeText).toBe('You chose wisely...');
    expect(mockedGenerateOpeningPage).toHaveBeenCalledTimes(1);
    expect(mockedGenerateContinuationPage).toHaveBeenCalledTimes(1);
  });

  it('replays an existing branch without a second continuation generation', async () => {
    mockedGenerateOpeningPage.mockResolvedValueOnce({
      narrative: 'Start...',
      choices: ['Go', 'Wait'],
      stateChangesAdded: [],
      stateChangesRemoved: [],
      newCanonFacts: [],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      isEnding: false,
      storyArc: 'Arc',
      rawResponse: 'opening',
    });

    const createRes = createMockResponse();
    void createStoryHandler(
      {
        body: {
          title: `${TEST_PREFIX} Title`,
          characterConcept: `${TEST_PREFIX} replay`,
          apiKey: 'mock-api-key-12345',
        },
      } as Request,
      createRes.res,
    );
    await waitForMock(createRes.redirect);

    const storyId = parseStoryIdFromRedirect(getMockCallArg(createRes.redirect, 0, 0));
    createdStoryIds.add(storyId);

    mockedGenerateContinuationPage.mockResolvedValueOnce({
      narrative: 'Page 2 content...',
      choices: ['Next', 'Turn back'],
      stateChangesAdded: [],
      stateChangesRemoved: [],
      newCanonFacts: [],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      isEnding: false,
      storyArc: 'Arc',
      rawResponse: 'continuation',
    });

    const firstChoiceRes = createMockResponse();
    void chooseHandler(
      {
        params: { storyId },
        body: {
          pageId: 1,
          choiceIndex: 0,
          apiKey: 'mock-api-key-12345',
        },
      } as unknown as Request,
      firstChoiceRes.res,
    );
    await waitForMock(firstChoiceRes.json);

    const replayChoiceRes = createMockResponse();
    void chooseHandler(
      {
        params: { storyId },
        body: {
          pageId: 1,
          choiceIndex: 0,
          apiKey: 'mock-api-key-12345',
        },
      } as unknown as Request,
      replayChoiceRes.res,
    );
    await waitForMock(replayChoiceRes.json);

    expect(firstChoiceRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        wasGenerated: true,
      }),
    );
    expect(replayChoiceRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        wasGenerated: false,
      }),
    );
    expect(mockedGenerateContinuationPage).toHaveBeenCalledTimes(1);
  });
});
