import type { Request, Response } from 'express';
import {
  createChoice,
  createPage,
  ChoiceType,
  PrimaryDelta,
  parsePageId,
  parseStoryId,
} from '@/models';
import * as pageRepository from '@/persistence/page-repository';
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
  path: string
): (req: Request, res: Response) => Promise<void> | void {
  const layer = (playRoutes.stack as unknown as RouteLayer[]).find(
    (item) => item.route?.path === path && item.route?.methods?.[method]
  );
  const handler = layer?.route?.stack?.[0]?.handle;

  if (!handler) {
    throw new Error(`${method.toUpperCase()} ${path} handler not found on playRoutes`);
  }

  return handler;
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('POST /:storyId/custom-choice', () => {
  const storyId = parseStoryId('550e8400-e29b-41d4-a716-446655440000');

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 400 when pageId is missing', async () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    void getRouteHandler('post', '/:storyId/custom-choice')(
      { params: { storyId }, body: { choiceText: 'hello' } } as unknown as Request,
      { status, json } as unknown as Response
    );
    await flushPromises();

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'Missing pageId or choiceText' });
  });

  it('returns 400 when choiceText is missing', async () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    void getRouteHandler('post', '/:storyId/custom-choice')(
      { params: { storyId }, body: { pageId: 1 } } as unknown as Request,
      { status, json } as unknown as Response
    );
    await flushPromises();

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'Missing pageId or choiceText' });
  });

  it('returns 400 when choiceText is empty after trim', async () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    void getRouteHandler('post', '/:storyId/custom-choice')(
      { params: { storyId }, body: { pageId: 1, choiceText: '   ' } } as unknown as Request,
      { status, json } as unknown as Response
    );
    await flushPromises();

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'Choice text cannot be empty' });
  });

  it('returns 400 when choiceText exceeds 500 characters', async () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    const longText = 'x'.repeat(501);
    void getRouteHandler('post', '/:storyId/custom-choice')(
      { params: { storyId }, body: { pageId: 1, choiceText: longText } } as unknown as Request,
      { status, json } as unknown as Response
    );
    await flushPromises();

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'Choice text must be 500 characters or fewer' });
  });

  it('returns updated choices on success', async () => {
    const page = createPage({
      id: parsePageId(1),
      narrativeText: 'A story unfolds',
      sceneSummary: 'Test summary of the scene events and consequences.',
      choices: [createChoice('Choice A'), createChoice('Choice B')],
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
    });
    const updatedPage = {
      ...page,
      choices: [
        ...page.choices,
        {
          text: 'Custom choice',
          choiceType: ChoiceType.TACTICAL_APPROACH,
          primaryDelta: PrimaryDelta.GOAL_SHIFT,
          nextPageId: null,
        },
      ],
    };

    const addChoiceSpy = jest.spyOn(pageRepository, 'addChoice').mockResolvedValue(updatedPage);

    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    void getRouteHandler('post', '/:storyId/custom-choice')(
      {
        params: { storyId },
        body: { pageId: 1, choiceText: 'Custom choice' },
      } as unknown as Request,
      { status, json } as unknown as Response
    );
    await flushPromises();

    expect(addChoiceSpy).toHaveBeenCalledWith(
      storyId,
      1,
      'Custom choice',
      ChoiceType.TACTICAL_APPROACH,
      PrimaryDelta.GOAL_SHIFT
    );
    expect(status).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({
      choices: [
        {
          text: 'Choice A',
          choiceType: ChoiceType.TACTICAL_APPROACH,
          primaryDelta: PrimaryDelta.GOAL_SHIFT,
          nextPageId: null,
        },
        {
          text: 'Choice B',
          choiceType: ChoiceType.TACTICAL_APPROACH,
          primaryDelta: PrimaryDelta.GOAL_SHIFT,
          nextPageId: null,
        },
        {
          text: 'Custom choice',
          choiceType: ChoiceType.TACTICAL_APPROACH,
          primaryDelta: PrimaryDelta.GOAL_SHIFT,
          nextPageId: null,
        },
      ],
    });
  });

  it('returns 404 when page is not found', async () => {
    jest
      .spyOn(pageRepository, 'addChoice')
      .mockRejectedValue(new Error('Page 99 not found in story test-id'));

    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    void getRouteHandler('post', '/:storyId/custom-choice')(
      { params: { storyId }, body: { pageId: 99, choiceText: 'Nope' } } as unknown as Request,
      { status, json } as unknown as Response
    );
    await flushPromises();

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: 'Page 99 not found in story test-id' });
  });

  it('returns 409 when page is an ending', async () => {
    jest
      .spyOn(pageRepository, 'addChoice')
      .mockRejectedValue(new Error('Cannot add choices to ending page 1'));

    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    void getRouteHandler('post', '/:storyId/custom-choice')(
      { params: { storyId }, body: { pageId: 1, choiceText: 'Should fail' } } as unknown as Request,
      { status, json } as unknown as Response
    );
    await flushPromises();

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({ error: 'Cannot add choices to ending page 1' });
  });

  it('returns 500 for unexpected errors', async () => {
    jest.spyOn(pageRepository, 'addChoice').mockRejectedValue(new Error('Disk failure'));

    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    void getRouteHandler('post', '/:storyId/custom-choice')(
      { params: { storyId }, body: { pageId: 1, choiceText: 'Hello' } } as unknown as Request,
      { status, json } as unknown as Response
    );
    await flushPromises();

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: 'Failed to add custom choice' });
  });

  it('accepts exactly 500 characters', async () => {
    const page = createPage({
      id: parsePageId(1),
      narrativeText: 'Story',
      sceneSummary: 'Test summary of the scene events and consequences.',
      choices: [createChoice('A'), createChoice('B')],
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
    });
    const text500 = 'x'.repeat(500);
    const updatedPage = {
      ...page,
      choices: [
        ...page.choices,
        {
          text: text500,
          choiceType: ChoiceType.TACTICAL_APPROACH,
          primaryDelta: PrimaryDelta.GOAL_SHIFT,
          nextPageId: null,
        },
      ],
    };

    jest.spyOn(pageRepository, 'addChoice').mockResolvedValue(updatedPage);

    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    void getRouteHandler('post', '/:storyId/custom-choice')(
      { params: { storyId }, body: { pageId: 1, choiceText: text500 } } as unknown as Request,
      { status, json } as unknown as Response
    );
    await flushPromises();

    expect(status).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalled();
  });
});
