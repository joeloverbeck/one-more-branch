import type { Request, Response, Router } from 'express';
import { storyEngine } from '@/engine';
import { generateContinuationPage, generateOpeningPage } from '@/llm';
import type { StoryId } from '@/models';
import { playRoutes } from '@/server/routes/play';
import { storyRoutes } from '@/server/routes/stories';

jest.mock('@/llm', () => ({
  generateOpeningPage: jest.fn(),
  generateContinuationPage: jest.fn(),
}));

const mockedGenerateOpeningPage = generateOpeningPage as jest.MockedFunction<typeof generateOpeningPage>;
const mockedGenerateContinuationPage =
  generateContinuationPage as jest.MockedFunction<typeof generateContinuationPage>;

const TEST_PREFIX = 'TEST USEINT-010 server integration';

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

describe('Play Flow Integration (Mocked LLM)', () => {
  const createdStoryIds = new Set<StoryId>();
  const createStoryHandler = getRouteHandler(storyRoutes, 'post', '/create');
  const chooseHandler = getRouteHandler(playRoutes, 'post', '/:storyId/choice');

  beforeEach(() => {
    jest.clearAllMocks();
    storyEngine.init();
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
      stateChanges: ['Entered the forest'],
      canonFacts: ['The forest is ancient'],
      isEnding: false,
      storyArc: 'Find your way out',
      rawResponse: 'opening',
    });

    const { res, status, render, redirect } = createMockResponse();

    await createStoryHandler(
      {
        body: {
          characterConcept: `${TEST_PREFIX} create-story`,
          tone: 'fantasy',
          apiKey: 'mock-api-key-12345',
        },
      } as Request,
      res,
    );

    expect(status).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledTimes(1);

    const storyId = parseStoryIdFromRedirect(redirect.mock.calls[0]?.[0]);
    createdStoryIds.add(storyId);

    expect(mockedGenerateOpeningPage).toHaveBeenCalledTimes(1);
    expect(mockedGenerateContinuationPage).not.toHaveBeenCalled();
  });

  it('generates a continuation page through POST /play/:storyId/choice', async () => {
    mockedGenerateOpeningPage.mockResolvedValueOnce({
      narrative: 'Initial narrative...',
      choices: ['Choice A', 'Choice B'],
      stateChanges: [],
      canonFacts: [],
      isEnding: false,
      storyArc: 'Arc',
      rawResponse: 'opening',
    });

    const createRes = createMockResponse();
    await createStoryHandler(
      {
        body: {
          characterConcept: `${TEST_PREFIX} make-choice`,
          apiKey: 'mock-api-key-12345',
        },
      } as Request,
      createRes.res,
    );

    const storyId = parseStoryIdFromRedirect(createRes.redirect.mock.calls[0]?.[0]);
    createdStoryIds.add(storyId);

    mockedGenerateContinuationPage.mockResolvedValueOnce({
      narrative: 'You chose wisely...',
      choices: ['Continue', 'Inspect surroundings'],
      stateChanges: ['Made a choice'],
      canonFacts: [],
      isEnding: false,
      storyArc: 'Arc',
      rawResponse: 'continuation',
    });

    const choiceRes = createMockResponse();
    await chooseHandler(
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

    expect(choiceRes.status).not.toHaveBeenCalled();
    expect(choiceRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        wasGenerated: true,
        page: expect.objectContaining({
          id: 2,
          narrativeText: 'You chose wisely...',
        }),
      }),
    );
    expect(mockedGenerateOpeningPage).toHaveBeenCalledTimes(1);
    expect(mockedGenerateContinuationPage).toHaveBeenCalledTimes(1);
  });

  it('replays an existing branch without a second continuation generation', async () => {
    mockedGenerateOpeningPage.mockResolvedValueOnce({
      narrative: 'Start...',
      choices: ['Go', 'Wait'],
      stateChanges: [],
      canonFacts: [],
      isEnding: false,
      storyArc: 'Arc',
      rawResponse: 'opening',
    });

    const createRes = createMockResponse();
    await createStoryHandler(
      {
        body: {
          characterConcept: `${TEST_PREFIX} replay`,
          apiKey: 'mock-api-key-12345',
        },
      } as Request,
      createRes.res,
    );

    const storyId = parseStoryIdFromRedirect(createRes.redirect.mock.calls[0]?.[0]);
    createdStoryIds.add(storyId);

    mockedGenerateContinuationPage.mockResolvedValueOnce({
      narrative: 'Page 2 content...',
      choices: ['Next', 'Turn back'],
      stateChanges: [],
      canonFacts: [],
      isEnding: false,
      storyArc: 'Arc',
      rawResponse: 'continuation',
    });

    const firstChoiceRes = createMockResponse();
    await chooseHandler(
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

    const replayChoiceRes = createMockResponse();
    await chooseHandler(
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
