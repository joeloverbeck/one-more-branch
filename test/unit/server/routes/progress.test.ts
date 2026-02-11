import type { Request, Response } from 'express';
import { progressRoutes } from '@/server/routes/progress';
import { generationProgressService } from '@/server/services';

type RouteLayer = {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack?: Array<{ handle: (req: Request, res: Response) => void }>;
  };
};

function getRouteHandler(
  method: 'get',
  path: string,
): (req: Request, res: Response) => void {
  const layer = (progressRoutes.stack as unknown as RouteLayer[]).find(
    item => item.route?.path === path && item.route?.methods?.[method],
  );
  const handler = layer?.route?.stack?.[0]?.handle;

  if (!handler) {
    throw new Error(`${method.toUpperCase()} ${path} handler not found on progressRoutes`);
  }

  return handler;
}

describe('progressRoutes', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns unknown snapshot as a non-error response for unknown progress ID', () => {
    const json = jest.fn().mockReturnThis();
    const status = jest.fn().mockReturnThis();
    jest.spyOn(generationProgressService, 'get').mockReturnValue({
      status: 'unknown',
      activeStage: null,
      completedStages: [],
      updatedAt: 1_234,
      flowType: null,
    });

    getRouteHandler('get', '/:progressId')(
      { params: { progressId: 'missing-id' } } as unknown as Request,
      { json, status } as unknown as Response,
    );

    expect(status).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({
      status: 'unknown',
      activeStage: null,
      completedStages: [],
      updatedAt: 1_234,
      flowType: null,
    });
  });

  it('returns running snapshot contract for known progress ID', () => {
    const json = jest.fn().mockReturnThis();
    jest.spyOn(generationProgressService, 'get').mockReturnValue({
      status: 'running',
      activeStage: 'PLANNING_PAGE',
      completedStages: ['RESTRUCTURING_STORY'],
      updatedAt: 9_999,
      flowType: 'new-story',
    });

    getRouteHandler('get', '/:progressId')(
      { params: { progressId: 'known-id' } } as unknown as Request,
      { json } as unknown as Response,
    );

    expect(json).toHaveBeenCalledWith({
      status: 'running',
      activeStage: 'PLANNING_PAGE',
      completedStages: ['RESTRUCTURING_STORY'],
      updatedAt: 9_999,
      flowType: 'new-story',
    });
  });

  it('sanitizes response and excludes unexpected service fields', () => {
    const json = jest.fn().mockReturnThis();
    jest.spyOn(generationProgressService, 'get').mockReturnValue({
      status: 'failed',
      activeStage: null,
      completedStages: ['PLANNING_PAGE'],
      updatedAt: 4_321,
      flowType: 'choice',
      publicMessage: 'should not leak',
      rawPromptPayload: 'sensitive',
    } as unknown as ReturnType<typeof generationProgressService.get>);

    getRouteHandler('get', '/:progressId')(
      { params: { progressId: 'sanitization-id' } } as unknown as Request,
      { json } as unknown as Response,
    );

    const [firstCall] = json.mock.calls as unknown[][];
    const payload = ((firstCall?.[0] as Record<string, unknown> | undefined) ?? null);
    expect(payload).not.toBeNull();
    expect(Object.keys(payload ?? {}).sort()).toEqual([
      'activeStage',
      'completedStages',
      'flowType',
      'status',
      'updatedAt',
    ]);
    expect(payload).toEqual({
      status: 'failed',
      activeStage: null,
      completedStages: ['PLANNING_PAGE'],
      updatedAt: 4_321,
      flowType: 'choice',
    });
  });
});
