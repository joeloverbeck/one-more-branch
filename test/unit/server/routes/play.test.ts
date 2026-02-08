import type { Request, Response } from 'express';
import { storyEngine } from '@/engine';
import {
  createChoice,
  createPage,
  createStory,
  parseStoryId,
  createEmptyAccumulatedStructureState,
  createStructureVersionId,
} from '@/models';
import type { VersionedStoryStructure, StoryStructure } from '@/models';
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
        actDisplayInfo: null,
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

    it('passes actDisplayInfo when story has structure versions', async () => {
      const structure: StoryStructure = {
        acts: [
          {
            id: 'act-1',
            name: 'The Beginning',
            objective: 'Start the journey',
            stakes: 'High',
            entryCondition: 'Always',
            beats: [],
          },
        ],
      };
      const versionId = createStructureVersionId('version-1');
      const versionedStructure: VersionedStoryStructure = {
        id: versionId,
        createdAt: new Date().toISOString(),
        createdAtPageId: 1,
        parentVersionId: null,
        rewriteReason: null,
        structure,
      };
      const story = createStory({
        title: 'Structured Story',
        characterConcept: 'A hero',
        worldbuilding: 'Fantasy world',
        tone: 'Epic',
      });
      const storyWithVersions = {
        ...story,
        id: storyId,
        structureVersions: [versionedStructure],
      };
      const page = createPage({
        id: 1,
        narrativeText: 'The beginning',
        choices: [createChoice('Go north'), createChoice('Go south')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        structureVersionId: versionId,
        accumulatedStructureState: {
          ...createEmptyAccumulatedStructureState(),
          currentActIndex: 0,
        },
      });
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue(storyWithVersions);
      jest.spyOn(storyEngine, 'getPage').mockResolvedValue(page);

      const status = jest.fn().mockReturnThis();
      const render = jest.fn();

      void getRouteHandler('get', '/:storyId')(
        { params: { storyId }, query: { page: '1' } } as unknown as Request,
        { status, render } as unknown as Response,
      );
      await flushPromises();

      expect(render).toHaveBeenCalledWith(
        'pages/play',
        expect.objectContaining({
          actDisplayInfo: {
            actNumber: 1,
            actName: 'The Beginning',
            displayString: 'Act 1: The Beginning',
          },
        }),
      );
    });

    it('passes null actDisplayInfo when page has no structure', async () => {
      const story = createStory({
        title: 'Simple Story',
        characterConcept: 'A hero',
        worldbuilding: 'World',
        tone: 'Adventure',
      });
      const page = createPage({
        id: 1,
        narrativeText: 'A simple story',
        choices: [createChoice('Continue'), createChoice('Turn back')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({ ...story, id: storyId });
      jest.spyOn(storyEngine, 'getPage').mockResolvedValue(page);

      const status = jest.fn().mockReturnThis();
      const render = jest.fn();

      void getRouteHandler('get', '/:storyId')(
        { params: { storyId }, query: { page: '1' } } as unknown as Request,
        { status, render } as unknown as Response,
      );
      await flushPromises();

      expect(render).toHaveBeenCalledWith(
        'pages/play',
        expect.objectContaining({
          actDisplayInfo: null,
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
      const story = createStory({
        title: 'Test Story',
        characterConcept: 'A hero',
        worldbuilding: '',
        tone: 'Adventure',
      });
      const resultPage = createPage({
        id: 3,
        narrativeText: 'A new branch unfolds.',
        choices: [createChoice('Investigate'), createChoice('Retreat')],
        isEnding: false,
        parentPageId: 2,
        parentChoiceIndex: 1,
      });
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({ ...story, id: storyId });
      const makeChoiceSpy = jest.spyOn(storyEngine, 'makeChoice').mockResolvedValue({
        page: resultPage,
        wasGenerated: true,
      });
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      void getRouteHandler('post', '/:storyId/choice')(
        {
          params: { storyId },
          body: { pageId: 2, choiceIndex: 1, apiKey: 'valid-key-12345' },
        } as Request,
        { status, json } as unknown as Response,
      );
      await flushPromises();

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
            isEnding: resultPage.isEnding,
          },
          wasGenerated: true,
        }),
      );
    });

    it('includes deviationInfo in response when deviation occurred', async () => {
      const story = createStory({
        title: 'Test Story',
        characterConcept: 'A hero',
        worldbuilding: '',
        tone: 'Adventure',
      });
      const resultPage = createPage({
        id: 3,
        narrativeText: 'The story path shifted.',
        choices: [createChoice('New path A'), createChoice('New path B')],
        isEnding: false,
        parentPageId: 2,
        parentChoiceIndex: 0,
      });
      const deviationInfo = {
        detected: true,
        reason: 'Player action invalidated planned story beats.',
        beatsInvalidated: 2,
      };
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({ ...story, id: storyId });
      jest.spyOn(storyEngine, 'makeChoice').mockResolvedValue({
        page: resultPage,
        wasGenerated: true,
        deviationInfo,
      });
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      void getRouteHandler('post', '/:storyId/choice')(
        {
          params: { storyId },
          body: { pageId: 2, choiceIndex: 0, apiKey: 'valid-key-12345' },
        } as Request,
        { status, json } as unknown as Response,
      );
      await flushPromises();

      expect(status).not.toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          deviationInfo: {
            detected: true,
            reason: 'Player action invalidated planned story beats.',
            beatsInvalidated: 2,
          },
        }),
      );
    });

    it('includes undefined deviationInfo when no deviation occurred', async () => {
      const story = createStory({
        title: 'Test Story',
        characterConcept: 'A hero',
        worldbuilding: '',
        tone: 'Adventure',
      });
      const resultPage = createPage({
        id: 3,
        narrativeText: 'Story continues normally.',
        choices: [createChoice('Continue'), createChoice('Wait')],
        isEnding: false,
        parentPageId: 2,
        parentChoiceIndex: 0,
      });
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({ ...story, id: storyId });
      jest.spyOn(storyEngine, 'makeChoice').mockResolvedValue({
        page: resultPage,
        wasGenerated: true,
        deviationInfo: undefined,
      });
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      void getRouteHandler('post', '/:storyId/choice')(
        {
          params: { storyId },
          body: { pageId: 2, choiceIndex: 0, apiKey: 'valid-key-12345' },
        } as Request,
        { status, json } as unknown as Response,
      );
      await flushPromises();

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          deviationInfo: undefined,
        }),
      );
    });

    it('includes actDisplayInfo in response when page has structure state', async () => {
      const structure: StoryStructure = {
        acts: [
          {
            id: 'act-1',
            name: 'Act One',
            objective: 'Begin the journey',
            stakes: 'High',
            entryCondition: 'Always',
            beats: [],
          },
          {
            id: 'act-2',
            name: 'Act Two',
            objective: 'Face challenges',
            stakes: 'Higher',
            entryCondition: 'After act one',
            beats: [],
          },
        ],
      };
      const versionId = createStructureVersionId('version-1');
      const versionedStructure: VersionedStoryStructure = {
        id: versionId,
        createdAt: new Date().toISOString(),
        createdAtPageId: 1,
        parentVersionId: null,
        rewriteReason: null,
        structure,
      };
      const story = createStory({
        title: 'Structured Story',
        characterConcept: 'A hero',
        worldbuilding: 'Fantasy world',
        tone: 'Epic',
      });
      const storyWithVersions = {
        ...story,
        id: storyId,
        structureVersions: [versionedStructure],
      };
      const resultPage = createPage({
        id: 3,
        narrativeText: 'You entered Act Two.',
        choices: [createChoice('Continue'), createChoice('Retreat')],
        isEnding: false,
        parentPageId: 2,
        parentChoiceIndex: 0,
        structureVersionId: versionId,
        parentAccumulatedStructureState: {
          ...createEmptyAccumulatedStructureState(),
          currentActIndex: 1,
        },
      });

      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue(storyWithVersions);
      jest.spyOn(storyEngine, 'makeChoice').mockResolvedValue({
        page: resultPage,
        wasGenerated: true,
      });

      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      void getRouteHandler('post', '/:storyId/choice')(
        {
          params: { storyId },
          body: { pageId: 2, choiceIndex: 0, apiKey: 'valid-key-12345' },
        } as Request,
        { status, json } as unknown as Response,
      );
      await flushPromises();

      expect(status).not.toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          actDisplayInfo: {
            actNumber: 2,
            actName: 'Act Two',
            displayString: 'Act 2: Act Two',
          },
        }),
      );
    });

    it('includes null actDisplayInfo when page has no structure state', async () => {
      const story = createStory({
        title: 'Simple Story',
        characterConcept: 'A hero',
        worldbuilding: 'World',
        tone: 'Adventure',
      });
      const resultPage = createPage({
        id: 3,
        narrativeText: 'A simple continuation.',
        choices: [createChoice('Continue'), createChoice('Wait')],
        isEnding: false,
        parentPageId: 2,
        parentChoiceIndex: 0,
      });

      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({ ...story, id: storyId });
      jest.spyOn(storyEngine, 'makeChoice').mockResolvedValue({
        page: resultPage,
        wasGenerated: true,
      });

      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      void getRouteHandler('post', '/:storyId/choice')(
        {
          params: { storyId },
          body: { pageId: 2, choiceIndex: 0, apiKey: 'valid-key-12345' },
        } as Request,
        { status, json } as unknown as Response,
      );
      await flushPromises();

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          actDisplayInfo: null,
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
