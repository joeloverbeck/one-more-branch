import type { Request, Response } from 'express';
import { storyEngine } from '@/engine';
import { homeRoutes } from '@/server/routes/home';

type RouteLayer = {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack?: Array<{ handle: (req: Request, res: Response) => Promise<void> | void }>;
  };
};

function getHomeHandler(): (req: Request, res: Response) => Promise<void> | void {
  const layer = (homeRoutes.stack as unknown as RouteLayer[]).find(
    (item) => item.route?.path === '/' && item.route?.methods?.get
  );

  const handler = layer?.route?.stack?.[0]?.handle;
  if (!handler) {
    throw new Error('GET / handler not found on homeRoutes');
  }

  return handler;
}

// Helper to wait for async route handler to complete
function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('homeRoutes GET /', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 200 and renders pages/home when stories exist', async () => {
    const listStoriesSpy = jest.spyOn(storyEngine, 'listStories').mockResolvedValue([
      {
        id: 'story-1',
        title: 'Shards of Dusk',
        characterConcept: 'A careful explorer',
        worldbuilding: 'Ruined city',
        tone: 'Mystery',
        overallTheme: 'Truth survives only with sacrifice.',
        premise: 'An archivist races to expose a buried conspiracy.',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    ]);
    const getStoryStatsSpy = jest.spyOn(storyEngine, 'getStoryStats').mockResolvedValue({
      pageCount: 7,
      exploredBranches: 3,
      totalBranches: 5,
      hasEnding: true,
    });

    const status = jest.fn().mockReturnThis();
    const render = jest.fn();

    void getHomeHandler()({} as Request, { status, render } as unknown as Response);
    await flushPromises();

    expect(status).not.toHaveBeenCalled();
    expect(listStoriesSpy).toHaveBeenCalledTimes(1);
    expect(getStoryStatsSpy).toHaveBeenCalledWith('story-1');
    expect(render).toHaveBeenCalledWith('pages/home', {
      title: 'One More Branch',
      stories: [
        expect.objectContaining({
          id: 'story-1',
          pageCount: 7,
          exploredBranches: 3,
          totalBranches: 5,
          hasEnding: true,
          overallTheme: 'Truth survives only with sacrifice.',
          premise: 'An archivist races to expose a buried conspiracy.',
        }),
      ],
    });
  });

  it('returns 200 and renders pages/home when no stories exist', async () => {
    const listStoriesSpy = jest.spyOn(storyEngine, 'listStories').mockResolvedValue([]);
    const getStoryStatsSpy = jest.spyOn(storyEngine, 'getStoryStats').mockResolvedValue({
      pageCount: 0,
      exploredBranches: 0,
      totalBranches: 0,
      hasEnding: false,
    });

    const status = jest.fn().mockReturnThis();
    const render = jest.fn();

    void getHomeHandler()({} as Request, { status, render } as unknown as Response);
    await flushPromises();

    expect(status).not.toHaveBeenCalled();
    expect(listStoriesSpy).toHaveBeenCalledTimes(1);
    expect(getStoryStatsSpy).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledWith('pages/home', {
      title: 'One More Branch',
      stories: [],
    });
  });

  it('returns 500 and renders error page when listStories throws', async () => {
    jest.spyOn(storyEngine, 'listStories').mockRejectedValue(new Error('boom'));
    const getStoryStatsSpy = jest.spyOn(storyEngine, 'getStoryStats');

    const status = jest.fn().mockReturnThis();
    const render = jest.fn();

    void getHomeHandler()({} as Request, { status, render } as unknown as Response);
    await flushPromises();

    expect(status).toHaveBeenCalledWith(500);
    expect(getStoryStatsSpy).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledWith('pages/error', {
      title: 'Error',
      message: 'Failed to load stories',
    });
  });
});
