import type { Request, Response } from 'express';
import type { KernelStageResult } from '@/llm/kernel-stage-runner';
import type { EvaluatedKernel } from '@/models';
import type { SavedKernel } from '@/models/saved-kernel';

jest.mock('@/llm/kernel-stage-runner', () => ({
  runKernelStage: jest.fn(),
}));

jest.mock('@/persistence/kernel-repository', () => ({
  listKernels: jest.fn().mockResolvedValue([]),
  loadKernel: jest.fn(),
  saveKernelGenerationBatch: jest.fn(),
  saveKernel: jest.fn(),
  updateKernel: jest.fn(),
  deleteKernel: jest.fn(),
  kernelExists: jest.fn(),
}));

import { LLMError } from '@/llm/llm-client-types';
import { runKernelStage } from '@/llm/kernel-stage-runner';
import {
  deleteKernel,
  kernelExists,
  listKernels,
  loadKernel,
  saveKernel,
  saveKernelGenerationBatch,
  updateKernel,
} from '@/persistence/kernel-repository';
import { kernelRoutes } from '@/server/routes/kernels';
import { generationProgressService } from '@/server/services';

type RouteLayer = {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack?: Array<{ handle: (req: Request, res: Response) => Promise<void> | void }>;
  };
};

function getRouteHandler(
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
): (req: Request, res: Response) => Promise<void> | void {
  const layer = (kernelRoutes.stack as unknown as RouteLayer[]).find(
    (item) => item.route?.path === path && item.route?.methods?.[method],
  );
  const handler = layer?.route?.stack?.[0]?.handle;

  if (!handler) {
    throw new Error(`${method.toUpperCase()} ${path} handler not found on kernelRoutes`);
  }

  return handler;
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

function createEvaluatedKernel(index = 1): EvaluatedKernel {
  return {
    kernel: {
      dramaticThesis: `Thesis ${index}`,
      valueAtStake: `Value ${index}`,
      opposingForce: `Force ${index}`,
      directionOfChange: 'POSITIVE' as const,
      thematicQuestion: `Question ${index}?`,
    },
    scores: {
      dramaticClarity: 4,
      thematicUniversality: 3,
      generativePotential: 4,
      conflictTension: 5,
      emotionalDepth: 3,
    },
    overallScore: 78,
    passes: true,
    strengths: ['Strong thesis'],
    weaknesses: ['Needs more ambiguity'],
    tradeoffSummary: 'Strong conflict with moderate depth.',
  };
}

describe('Kernel Route Integration', () => {
  const mockedRunKernelStage = runKernelStage as jest.MockedFunction<typeof runKernelStage>;
  const mockedListKernels = listKernels as jest.MockedFunction<typeof listKernels>;
  const mockedLoadKernel = loadKernel as jest.MockedFunction<typeof loadKernel>;
  const mockedSaveKernelGenerationBatch = saveKernelGenerationBatch as jest.MockedFunction<
    typeof saveKernelGenerationBatch
  >;
  const mockedSaveKernel = saveKernel as jest.MockedFunction<typeof saveKernel>;
  const mockedUpdateKernel = updateKernel as jest.MockedFunction<typeof updateKernel>;
  const mockedDeleteKernel = deleteKernel as jest.MockedFunction<typeof deleteKernel>;
  const mockedKernelExists = kernelExists as jest.MockedFunction<typeof kernelExists>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET / renders kernels page with saved kernels', async () => {
    mockedListKernels.mockResolvedValue([
      {
        id: 'kernel-1',
        name: 'Kernel 1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        seeds: {},
        evaluatedKernel: createEvaluatedKernel(1),
      },
    ]);

    const render = jest.fn().mockReturnThis();

    void getRouteHandler('get', '/')({} as Request, { render } as unknown as Response);
    await flushPromises();

    expect(render).toHaveBeenCalledTimes(1);
    const renderCalls = render.mock.calls as unknown[][];
    expect(renderCalls[0]?.[0]).toBe('pages/kernels');
    const payload = renderCalls[0]?.[1] as { title: string; kernels: Array<{ id: string }> };
    expect(payload.title).toBe('Story Kernels - One More Branch');
    expect(Array.isArray(payload.kernels)).toBe(true);
    expect(payload.kernels[0]?.id).toBe('kernel-1');
  });

  it('GET /api/list returns all kernels', async () => {
    mockedListKernels.mockResolvedValue([
      {
        id: 'kernel-1',
        name: 'Kernel 1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        seeds: {},
        evaluatedKernel: createEvaluatedKernel(1),
      },
    ]);

    const json = jest.fn().mockReturnThis();

    void getRouteHandler('get', '/api/list')({} as Request, { json } as unknown as Response);
    await flushPromises();

    expect(json).toHaveBeenCalledTimes(1);
    const calls = json.mock.calls as unknown[][];
    const payload = calls[0]?.[0] as { success: boolean; kernels: Array<{ id: string }> };
    expect(payload.success).toBe(true);
    expect(Array.isArray(payload.kernels)).toBe(true);
    expect(payload.kernels[0]?.id).toBe('kernel-1');
  });

  it('GET /api/:kernelId returns 404 when missing', async () => {
    mockedLoadKernel.mockResolvedValue(null);

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();

    void getRouteHandler('get', '/api/:kernelId')(
      { params: { kernelId: 'missing' } } as unknown as Request,
      { status, json } as unknown as Response,
    );
    await flushPromises();

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ success: false, error: 'Kernel not found' });
  });

  it('POST /api/generate delegates through service, tracks progress, and saves generation batch', async () => {
    const evaluatedKernels = [createEvaluatedKernel(1), createEvaluatedKernel(2)];
    mockedRunKernelStage.mockImplementation((_input, onStage): Promise<KernelStageResult> => {
      onStage?.({
        stage: 'GENERATING_KERNELS',
        status: 'started',
        attempt: 1,
      });
      onStage?.({
        stage: 'GENERATING_KERNELS',
        status: 'completed',
        attempt: 1,
      });
      onStage?.({
        stage: 'EVALUATING_KERNELS',
        status: 'started',
        attempt: 1,
      });
      onStage?.({
        stage: 'EVALUATING_KERNELS',
        status: 'completed',
        attempt: 1,
      });

      return Promise.resolve({
        ideatedKernels: [],
        scoredKernels: [],
        evaluatedKernels,
        rawIdeatorResponse: 'raw-ideas',
        rawEvaluatorResponse: 'raw-eval',
      });
    });

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();
    const progressStartSpy = jest.spyOn(generationProgressService, 'start');
    const progressMarkStartedSpy = jest.spyOn(generationProgressService, 'markStageStarted');
    const progressMarkCompletedSpy = jest.spyOn(generationProgressService, 'markStageCompleted');
    const progressCompleteSpy = jest.spyOn(generationProgressService, 'complete');

    void getRouteHandler('post', '/api/generate')(
      {
        body: {
          thematicInterests: '  trust ',
          emotionalCore: '  dread ',
          sparkLine: '  betrayed ally ',
          apiKey: '  valid-key-12345 ',
          progressId: ' kernel-progress-1 ',
        },
      } as Request,
      { status, json } as unknown as Response,
    );
    await flushPromises();

    expect(mockedRunKernelStage).toHaveBeenCalledWith(
      {
        thematicInterests: 'trust',
        emotionalCore: 'dread',
        sparkLine: 'betrayed ally',
        apiKey: 'valid-key-12345',
      },
      expect.any(Function),
    );
    expect(progressStartSpy).toHaveBeenCalledWith('kernel-progress-1', 'kernel-generation');
    expect(progressMarkStartedSpy).toHaveBeenCalledWith('kernel-progress-1', 'GENERATING_KERNELS', 1);
    expect(progressMarkCompletedSpy).toHaveBeenCalledWith(
      'kernel-progress-1',
      'EVALUATING_KERNELS',
      1,
    );
    expect(progressCompleteSpy).toHaveBeenCalledWith('kernel-progress-1');
    expect(mockedSaveKernelGenerationBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        seeds: {
          thematicInterests: 'trust',
          emotionalCore: 'dread',
          sparkLine: 'betrayed ally',
        },
        evaluatedKernels,
      }),
    );
    expect(status).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ success: true, evaluatedKernels });
  });

  it('POST /api/generate returns 400 when apiKey is missing', async () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();

    void getRouteHandler('post', '/api/generate')(
      { body: { thematicInterests: 'trust' } } as Request,
      { status, json } as unknown as Response,
    );
    await flushPromises();

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ success: false, error: 'OpenRouter API key is required' });
    expect(mockedRunKernelStage).not.toHaveBeenCalled();
  });

  it('POST /api/generate maps LLMError to structured error response and progress failure', async () => {
    mockedRunKernelStage.mockRejectedValue(
      new LLMError('Rate limit exceeded', 'HTTP_429', true, { httpStatus: 429 }),
    );

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();
    const progressFailSpy = jest.spyOn(generationProgressService, 'fail');

    void getRouteHandler('post', '/api/generate')(
      {
        body: {
          thematicInterests: 'trust',
          apiKey: 'valid-key-12345',
          progressId: 'kernel-progress-2',
        },
      } as Request,
      { status, json } as unknown as Response,
    );
    await flushPromises();

    expect(progressFailSpy).toHaveBeenCalledWith(
      'kernel-progress-2',
      'Rate limit exceeded. Please wait a moment and try again.',
    );
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: 'Rate limit exceeded. Please wait a moment and try again.',
      code: 'HTTP_429',
      retryable: true,
    });
  });

  it('POST /api/save strips apiKey and persists SavedKernel', async () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();

    void getRouteHandler('post', '/api/save')(
      {
        body: {
          evaluatedKernel: createEvaluatedKernel(1),
          seeds: {
            thematicInterests: ' trust ',
            emotionalCore: ' dread ',
            sparkLine: ' spark ',
            apiKey: 'should-not-persist',
          },
        },
      } as Request,
      { status, json } as unknown as Response,
    );
    await flushPromises();

    expect(mockedSaveKernel).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Thesis 1',
        seeds: {
          thematicInterests: 'trust',
          emotionalCore: 'dread',
          sparkLine: 'spark',
        },
      }),
    );
    expect(status).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledTimes(1);
    const calls = json.mock.calls as unknown[][];
    const payload = calls[0]?.[0] as {
      success: boolean;
      kernel: { id: string; createdAt: string; updatedAt: string };
    };
    expect(payload.success).toBe(true);
    expect(typeof payload.kernel.id).toBe('string');
    expect(typeof payload.kernel.createdAt).toBe('string');
    expect(typeof payload.kernel.updatedAt).toBe('string');
  });

  it('PUT /api/:kernelId returns 404 for missing kernel', async () => {
    mockedKernelExists.mockResolvedValue(false);

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();

    void getRouteHandler('put', '/api/:kernelId')(
      { params: { kernelId: 'missing' }, body: { name: 'Updated' } } as unknown as Request,
      { status, json } as unknown as Response,
    );
    await flushPromises();

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ success: false, error: 'Kernel not found' });
    expect(mockedUpdateKernel).not.toHaveBeenCalled();
  });

  it('PUT /api/:kernelId updates name and kernel fields', async () => {
    const existing: SavedKernel = {
      id: 'kernel-1',
      name: 'Old Name',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      seeds: {},
      evaluatedKernel: createEvaluatedKernel(1),
    };

    mockedKernelExists.mockResolvedValue(true);
    mockedUpdateKernel.mockImplementation((_id, updater) => Promise.resolve(updater(existing)));

    const json = jest.fn().mockReturnThis();

    void getRouteHandler('put', '/api/:kernelId')(
      {
        params: { kernelId: 'kernel-1' },
        body: { name: '  New Name ', kernelFields: { valueAtStake: 'Autonomy' } },
      } as unknown as Request,
      { json } as unknown as Response,
    );
    await flushPromises();

    expect(json).toHaveBeenCalledTimes(1);
    const calls = json.mock.calls as unknown[][];
    const payload = calls[0]?.[0] as {
      success: boolean;
      kernel: SavedKernel;
    };
    expect(payload.success).toBe(true);
    expect(payload.kernel.name).toBe('New Name');
    expect(payload.kernel.evaluatedKernel.kernel.valueAtStake).toBe('Autonomy');
  });

  it('DELETE /api/:kernelId returns 404 for missing kernel', async () => {
    mockedKernelExists.mockResolvedValue(false);

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();

    void getRouteHandler('delete', '/api/:kernelId')(
      { params: { kernelId: 'missing' } } as unknown as Request,
      { status, json } as unknown as Response,
    );
    await flushPromises();

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ success: false, error: 'Kernel not found' });
    expect(mockedDeleteKernel).not.toHaveBeenCalled();
  });

  it('DELETE /api/:kernelId deletes existing kernel', async () => {
    mockedKernelExists.mockResolvedValue(true);

    const json = jest.fn().mockReturnThis();

    void getRouteHandler('delete', '/api/:kernelId')(
      { params: { kernelId: 'kernel-1' } } as unknown as Request,
      { json } as unknown as Response,
    );
    await flushPromises();

    expect(mockedDeleteKernel).toHaveBeenCalledWith('kernel-1');
    expect(json).toHaveBeenCalledWith({ success: true });
  });
});
