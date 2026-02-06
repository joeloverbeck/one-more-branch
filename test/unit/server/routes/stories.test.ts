import type { Request, Response } from 'express';
import { storyEngine } from '@/engine';
import { createChoice, createPage, createStory, parseStoryId } from '@/models';
import { storyRoutes } from '@/server/routes/stories';

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
  const layer = (storyRoutes.stack as unknown as RouteLayer[]).find(
    (item) => item.route?.path === path && item.route?.methods?.[method],
  );
  const handler = layer?.route?.stack?.[0]?.handle;

  if (!handler) {
    throw new Error(`${method.toUpperCase()} ${path} handler not found on storyRoutes`);
  }

  return handler;
}

describe('storyRoutes', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /new', () => {
    it('returns 200 and renders pages/new-story with default values', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();

      await getRouteHandler('get', '/new')({} as Request, { status, render } as unknown as Response);

      expect(status).not.toHaveBeenCalled();
      expect(render).toHaveBeenCalledWith('pages/new-story', {
        title: 'New Adventure - One More Branch',
        error: null,
        values: {},
      });
    });
  });

  describe('POST /create validation', () => {
    it('returns 400 for empty character concept', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const startStorySpy = jest.spyOn(storyEngine, 'startStory');

      await getRouteHandler('post', '/create')(
        {
          body: { characterConcept: '', worldbuilding: 'World', tone: 'Epic', apiKey: 'valid-key-12345' },
        } as Request,
        { status, render } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(400);
      expect(startStorySpy).not.toHaveBeenCalled();
      expect(render).toHaveBeenCalledWith('pages/new-story', {
        title: 'New Adventure - One More Branch',
        error: 'Character concept must be at least 10 characters',
        values: { characterConcept: '', worldbuilding: 'World', tone: 'Epic' },
      });
    });

    it('returns 400 for short character concept after trim', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const startStorySpy = jest.spyOn(storyEngine, 'startStory');

      await getRouteHandler('post', '/create')(
        {
          body: {
            characterConcept: '   too short   ',
            worldbuilding: 'World',
            tone: 'Epic',
            apiKey: 'valid-key-12345',
          },
        } as Request,
        { status, render } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(400);
      expect(startStorySpy).not.toHaveBeenCalled();
      expect(render).toHaveBeenCalledWith('pages/new-story', {
        title: 'New Adventure - One More Branch',
        error: 'Character concept must be at least 10 characters',
        values: { characterConcept: '   too short   ', worldbuilding: 'World', tone: 'Epic' },
      });
    });

    it('returns 400 for missing API key', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const startStorySpy = jest.spyOn(storyEngine, 'startStory');

      await getRouteHandler('post', '/create')(
        {
          body: { characterConcept: 'A long enough character concept', worldbuilding: 'World', tone: 'Epic' },
        } as Request,
        { status, render } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(400);
      expect(startStorySpy).not.toHaveBeenCalled();
      expect(render).toHaveBeenCalledWith('pages/new-story', {
        title: 'New Adventure - One More Branch',
        error: 'OpenRouter API key is required',
        values: { characterConcept: 'A long enough character concept', worldbuilding: 'World', tone: 'Epic' },
      });
    });

    it('returns 400 for short API key after trim and preserves non-secret values only', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const startStorySpy = jest.spyOn(storyEngine, 'startStory');

      await getRouteHandler('post', '/create')(
        {
          body: {
            characterConcept: 'A long enough character concept',
            worldbuilding: 'World',
            tone: 'Epic',
            apiKey: '    short    ',
          },
        } as Request,
        { status, render } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(400);
      expect(startStorySpy).not.toHaveBeenCalled();
      expect(render).toHaveBeenCalledWith('pages/new-story', {
        title: 'New Adventure - One More Branch',
        error: 'OpenRouter API key is required',
        values: { characterConcept: 'A long enough character concept', worldbuilding: 'World', tone: 'Epic' },
      });

      const renderCalls = render.mock.calls as unknown[][];
      const firstRenderPayload = renderCalls[0]?.[1] as { values?: Record<string, unknown> } | undefined;
      expect(firstRenderPayload?.values).toBeDefined();
      expect(firstRenderPayload?.values?.apiKey).toBeUndefined();
    });
  });

  describe('POST /create success', () => {
    it('calls startStory with trimmed values and redirects to first play page', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const redirect = jest.fn();
      const storyId = parseStoryId('550e8400-e29b-41d4-a716-446655440000');
      const story = createStory({
        characterConcept: 'Trimmed Concept',
        worldbuilding: 'Trimmed World',
        tone: 'Trimmed Tone',
      });
      const page = createPage({
        id: 1,
        narrativeText: 'Page text',
        choices: [createChoice('Go left'), createChoice('Go right')],
        stateChanges: [],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const startStorySpy = jest.spyOn(storyEngine, 'startStory').mockResolvedValue({
        story: { ...story, id: storyId },
        page,
      });

      await getRouteHandler('post', '/create')(
        {
          body: {
            characterConcept: '  Trimmed Concept  ',
            worldbuilding: '  Trimmed World  ',
            tone: '  Trimmed Tone  ',
            apiKey: '  valid-key-12345  ',
          },
        } as Request,
        { status, render, redirect } as unknown as Response,
      );

      expect(status).not.toHaveBeenCalled();
      expect(render).not.toHaveBeenCalled();
      expect(startStorySpy).toHaveBeenCalledWith({
        characterConcept: 'Trimmed Concept',
        worldbuilding: 'Trimmed World',
        tone: 'Trimmed Tone',
        apiKey: 'valid-key-12345',
      });
      expect(redirect).toHaveBeenCalledWith('/play/550e8400-e29b-41d4-a716-446655440000?page=1&newStory=true');
    });
  });

  describe('POST /create error', () => {
    it('returns 500 and re-renders form with error message from Error instance', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const redirect = jest.fn();
      jest.spyOn(storyEngine, 'startStory').mockRejectedValue(new Error('generation failed'));

      await getRouteHandler('post', '/create')(
        {
          body: {
            characterConcept: 'A long enough character concept',
            worldbuilding: 'World',
            tone: 'Epic',
            apiKey: 'valid-key-12345',
          },
        } as Request,
        { status, render, redirect } as unknown as Response,
      );

      expect(redirect).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(500);
      expect(render).toHaveBeenCalledWith('pages/new-story', {
        title: 'New Adventure - One More Branch',
        error: 'generation failed',
        values: {
          characterConcept: 'A long enough character concept',
          worldbuilding: 'World',
          tone: 'Epic',
        },
      });
    });
  });

  describe('POST /:storyId/delete', () => {
    it('calls deleteStory and redirects to / on success', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const redirect = jest.fn();
      const deleteStorySpy = jest.spyOn(storyEngine, 'deleteStory').mockResolvedValue(undefined);

      await getRouteHandler('post', '/:storyId/delete')(
        { params: { storyId: '550e8400-e29b-41d4-a716-446655440000' } } as unknown as Request,
        { status, render, redirect } as unknown as Response,
      );

      expect(status).not.toHaveBeenCalled();
      expect(render).not.toHaveBeenCalled();
      expect(deleteStorySpy).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(redirect).toHaveBeenCalledWith('/');
    });

    it('redirects to / when deleteStory throws', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const redirect = jest.fn();
      const deleteStorySpy = jest.spyOn(storyEngine, 'deleteStory').mockRejectedValue(new Error('boom'));

      await getRouteHandler('post', '/:storyId/delete')(
        { params: { storyId: '550e8400-e29b-41d4-a716-446655440000' } } as unknown as Request,
        { status, render, redirect } as unknown as Response,
      );

      expect(status).not.toHaveBeenCalled();
      expect(render).not.toHaveBeenCalled();
      expect(deleteStorySpy).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(redirect).toHaveBeenCalledWith('/');
    });
  });
});
