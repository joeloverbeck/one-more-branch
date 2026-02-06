import type { Request, Response } from 'express';
import { storyEngine } from '@/engine';
import { createChoice, createPage, createStory, parseStoryId } from '@/models';
import { playRoutes } from '@/server/routes/play';

type RouteLayer = {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack?: Array<{ handle: (req: Request, res: Response) => Promise<void> | void }>;
  };
};

function getRouteHandler(
  method: 'get' | 'post',
  path: string,
): (req: Request, res: Response) => Promise<void> | void {
  const layer = (playRoutes.stack as unknown as RouteLayer[]).find(
    item => item.route?.path === path && item.route?.methods?.[method],
  );
  const handler = layer?.route?.stack?.[0]?.handle;

  if (!handler) {
    throw new Error(`${method.toUpperCase()} ${path} handler not found on playRoutes`);
  }

  return handler;
}

// Helper to wait for async route handler to complete
function flushPromises(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

describe('playRoutes', () => {
  const storyId = parseStoryId('550e8400-e29b-41d4-a716-446655440000');

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /:storyId', () => {
    it('renders pages/play with story, page, and pageId for valid inputs', async () => {
      const story = createStory({
        title: 'Epic Adventure',
        characterConcept: 'A very long character concept that should be truncated for page title checks',
        worldbuilding: 'World',
        tone: 'Epic',
      });
      const page = createPage({
        id: 2,
        narrativeText: 'You stand at a fork in the road.',
        choices: [createChoice('Take left path'), createChoice('Take right path')],
        stateChanges: { added: [], removed: [] },
        isEnding: false,
        parentPageId: 1,
        parentChoiceIndex: 0,
      });
      const loadStorySpy = jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({
        ...story,
        id: storyId,
      });
      const getPageSpy = jest.spyOn(storyEngine, 'getPage').mockResolvedValue(page);

      const status = jest.fn().mockReturnThis();
      const render = jest.fn();

      void getRouteHandler('get', '/:storyId')(
        { params: { storyId }, query: { page: '2' } } as unknown as Request,
        { status, render } as unknown as Response,
      );
      await flushPromises();

      expect(status).not.toHaveBeenCalled();
      expect(loadStorySpy).toHaveBeenCalledWith(storyId);
      expect(getPageSpy).toHaveBeenCalledWith(storyId, 2);
      expect(render).toHaveBeenCalledWith('pages/play', {
        title: `${story.title} - One More Branch`,
        story: { ...story, id: storyId },
        page,
        pageId: 2,
      });
    });

    it('returns 404 when story is not found', async () => {
      const loadStorySpy = jest.spyOn(storyEngine, 'loadStory').mockResolvedValue(null);
      const getPageSpy = jest.spyOn(storyEngine, 'getPage');
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();

      void getRouteHandler('get', '/:storyId')(
        { params: { storyId }, query: { page: '1' } } as unknown as Request,
        { status, render } as unknown as Response,
      );
      await flushPromises();

      expect(loadStorySpy).toHaveBeenCalledWith(storyId);
      expect(getPageSpy).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(404);
      expect(render).toHaveBeenCalledWith('pages/error', {
        title: 'Not Found',
        message: 'Story not found',
      });
    });

    it('returns 404 when page is not found', async () => {
      const story = createStory({
        title: 'Noir Mystery',
        characterConcept: 'A capable rogue',
        worldbuilding: 'World',
        tone: 'Noir',
      });
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({ ...story, id: storyId });
      const getPageSpy = jest.spyOn(storyEngine, 'getPage').mockResolvedValue(null);
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();

      void getRouteHandler('get', '/:storyId')(
        { params: { storyId }, query: { page: '99' } } as unknown as Request,
        { status, render } as unknown as Response,
      );
      await flushPromises();

      expect(getPageSpy).toHaveBeenCalledWith(storyId, 99);
      expect(status).toHaveBeenCalledWith(404);
      expect(render).toHaveBeenCalledWith('pages/error', {
        title: 'Not Found',
        message: 'Page not found',
      });
    });

    it('defaults to page 1 when page query is missing', async () => {
      const story = createStory({
        title: 'Explorer Quest',
        characterConcept: 'An explorer',
        worldbuilding: '',
        tone: 'Adventure',
      });
      const page = createPage({
        id: 1,
        narrativeText: 'The first page',
        choices: [createChoice('Go north'), createChoice('Go south')],
        stateChanges: { added: [], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({ ...story, id: storyId });
      const getPageSpy = jest.spyOn(storyEngine, 'getPage').mockResolvedValue(page);
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();

      void getRouteHandler('get', '/:storyId')(
        { params: { storyId }, query: {} } as unknown as Request,
        { status, render } as unknown as Response,
      );
      await flushPromises();

      expect(status).not.toHaveBeenCalled();
      expect(getPageSpy).toHaveBeenCalledWith(storyId, 1);
      expect(render).toHaveBeenCalledWith(
        'pages/play',
        expect.objectContaining({
          pageId: 1,
        }),
      );
    });

    it('defaults to page 1 when page query is non-positive', async () => {
      const story = createStory({
        title: 'Starship Command',
        characterConcept: 'A pilot',
        worldbuilding: '',
        tone: 'Sci-fi',
      });
      const page = createPage({
        id: 1,
        narrativeText: 'The launch pad',
        choices: [createChoice('Launch'), createChoice('Abort')],
        stateChanges: { added: [], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({ ...story, id: storyId });
      const getPageSpy = jest.spyOn(storyEngine, 'getPage').mockResolvedValue(page);
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();

      void getRouteHandler('get', '/:storyId')(
        { params: { storyId }, query: { page: '0' } } as unknown as Request,
        { status, render } as unknown as Response,
      );
      await flushPromises();

      expect(status).not.toHaveBeenCalled();
      expect(getPageSpy).toHaveBeenCalledWith(storyId, 1);
      expect(render).toHaveBeenCalledWith(
        'pages/play',
        expect.objectContaining({
          pageId: 1,
        }),
      );
    });
  });

  describe('POST /:storyId/choice validation', () => {
    it('returns 400 JSON when pageId or choiceIndex is missing', async () => {
      const makeChoiceSpy = jest.spyOn(storyEngine, 'makeChoice');
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      await getRouteHandler('post', '/:storyId/choice')(
        { params: { storyId }, body: { choiceIndex: 0, apiKey: 'valid-key-12345' } } as Request,
        { status, json } as unknown as Response,
      );

      expect(makeChoiceSpy).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ error: 'Missing pageId or choiceIndex' });
    });

    it('returns 400 JSON when apiKey is missing', async () => {
      const makeChoiceSpy = jest.spyOn(storyEngine, 'makeChoice');
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      await getRouteHandler('post', '/:storyId/choice')(
        { params: { storyId }, body: { pageId: 1, choiceIndex: 0 } } as Request,
        { status, json } as unknown as Response,
      );

      expect(makeChoiceSpy).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ error: 'API key required' });
    });
  });

  describe('POST /:storyId/choice success', () => {
    it('calls makeChoice with expected params and returns page payload', async () => {
      const resultPage = createPage({
        id: 3,
        narrativeText: 'A new branch unfolds.',
        choices: [createChoice('Investigate'), createChoice('Retreat')],
        stateChanges: { added: ['You gain confidence'], removed: [] },
        isEnding: false,
        parentPageId: 2,
        parentChoiceIndex: 1,
      });
      const makeChoiceSpy = jest.spyOn(storyEngine, 'makeChoice').mockResolvedValue({
        page: resultPage,
        wasGenerated: true,
      });
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      await getRouteHandler('post', '/:storyId/choice')(
        {
          params: { storyId },
          body: { pageId: 2, choiceIndex: 1, apiKey: 'valid-key-12345' },
        } as Request,
        { status, json } as unknown as Response,
      );

      expect(status).not.toHaveBeenCalled();
      expect(makeChoiceSpy).toHaveBeenCalledWith({
        storyId,
        pageId: 2,
        choiceIndex: 1,
        apiKey: 'valid-key-12345',
      });
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          page: {
            id: resultPage.id,
            narrativeText: resultPage.narrativeText,
            choices: resultPage.choices,
            stateChanges: resultPage.stateChanges,
            isEnding: resultPage.isEnding,
          },
          wasGenerated: true,
        }),
      );
    });
  });

  describe('POST /:storyId/choice error', () => {
    it('returns 500 JSON with Error message when engine throws', async () => {
      jest.spyOn(storyEngine, 'makeChoice').mockRejectedValue(new Error('choice failed'));
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      await getRouteHandler('post', '/:storyId/choice')(
        {
          params: { storyId },
          body: { pageId: 2, choiceIndex: 1, apiKey: 'valid-key-12345' },
        } as Request,
        { status, json } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ error: 'choice failed' });
    });
  });

  describe('GET /:storyId/restart', () => {
    it('redirects to page 1 for that story', async () => {
      const status = jest.fn().mockReturnThis();
      const redirect = jest.fn();

      await getRouteHandler('get', '/:storyId/restart')(
        { params: { storyId } } as unknown as Request,
        { status, redirect } as unknown as Response,
      );

      expect(status).not.toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith(`/play/${storyId}?page=1`);
    });
  });
});
