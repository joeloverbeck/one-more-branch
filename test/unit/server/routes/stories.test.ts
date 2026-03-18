import type { Request, Response } from 'express';
import { storyEngine } from '@/engine';
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
  path: string
): (req: Request, res: Response) => Promise<void> | void {
  const layer = (storyRoutes.stack as unknown as RouteLayer[]).find(
    (item) => item.route?.path === path && item.route?.methods?.[method]
  );
  const handler = layer?.route?.stack?.[0]?.handle;

  if (!handler) {
    throw new Error(`${method.toUpperCase()} ${path} handler not found on storyRoutes`);
  }

  return handler;
}

jest.mock('@/engine', () => ({
  storyEngine: {
    deleteStory: jest.fn(),
  },
}));

jest.mock('@/logging/index', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

describe('storyRoutes', () => {
  afterEach(() => jest.restoreAllMocks());

  describe('POST /:storyId/delete', () => {
    it('calls deleteStory and redirects to / on success', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const redirect = jest.fn();
      const deleteStorySpy = jest.spyOn(storyEngine, 'deleteStory').mockResolvedValue(undefined);

      await getRouteHandler('post', '/:storyId/delete')(
        { params: { storyId: '550e8400-e29b-41d4-a716-446655440000' } } as unknown as Request,
        { status, render, redirect } as unknown as Response
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
      const deleteStorySpy = jest
        .spyOn(storyEngine, 'deleteStory')
        .mockRejectedValue(new Error('boom'));

      await getRouteHandler('post', '/:storyId/delete')(
        { params: { storyId: '550e8400-e29b-41d4-a716-446655440000' } } as unknown as Request,
        { status, render, redirect } as unknown as Response
      );

      expect(status).not.toHaveBeenCalled();
      expect(render).not.toHaveBeenCalled();
      expect(deleteStorySpy).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(redirect).toHaveBeenCalledWith('/');
    });
  });
});
