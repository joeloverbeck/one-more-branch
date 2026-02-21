import type { Request, Response } from 'express';

jest.mock('@/persistence/concept-repository', () => ({
  listConcepts: jest.fn(),
  loadConcept: jest.fn(),
}));

jest.mock('@/persistence/kernel-repository', () => ({
  loadKernel: jest.fn(),
}));

jest.mock('@/server/services', () => ({
  evolutionService: {
    evolveConcepts: jest.fn(),
  },
  generationProgressService: {
    start: jest.fn(),
    markStageStarted: jest.fn(),
    markStageCompleted: jest.fn(),
    complete: jest.fn(),
    fail: jest.fn(),
    get: jest.fn(),
  },
}));

import { LLMError } from '@/llm/llm-client-types';
import type { SavedConcept } from '@/models/saved-concept';
import type { SavedKernel } from '@/models/saved-kernel';
import { listConcepts, loadConcept } from '@/persistence/concept-repository';
import { loadKernel } from '@/persistence/kernel-repository';
import { evolutionRoutes } from '@/server/routes/evolution';
import { evolutionService, generationProgressService } from '@/server/services';
import {
  createConceptVerificationFixture,
  createEvaluatedConceptFixture,
} from '../../../fixtures/concept-generator';

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
  const layer = (evolutionRoutes.stack as unknown as RouteLayer[]).find(
    (item) => item.route?.path === path && item.route?.methods?.[method],
  );
  const handler = layer?.route?.stack?.[0]?.handle;
  if (!handler) {
    throw new Error(`${method.toUpperCase()} ${path} handler not found on evolutionRoutes`);
  }
  return handler;
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function createSavedConcept(conceptId: string, sourceKernelId: string): SavedConcept {
  const evaluatedConcept = createEvaluatedConceptFixture(Number.parseInt(conceptId.slice(-1), 10) || 1);
  return {
    id: conceptId,
    name: `Concept ${conceptId}`,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    seeds: {},
    evaluatedConcept,
    sourceKernelId,
  };
}

function createSavedKernel(kernelId = 'kernel-1'): SavedKernel {
  return {
    id: kernelId,
    name: `Kernel ${kernelId}`,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    seeds: {},
    evaluatedKernel: {
      kernel: {
        dramaticThesis: 'Trust demands vulnerability',
        valueAtStake: 'Trust',
        opposingForce: 'Control',
        directionOfChange: 'POSITIVE',
        thematicQuestion: 'Can control coexist with intimacy?',
      },
      scores: {
        dramaticClarity: 4,
        thematicUniversality: 4,
        generativePotential: 4,
        conflictTension: 4,
        emotionalDepth: 4,
      },
      overallScore: 82,
      passes: true,
      strengths: ['Clear tension'],
      weaknesses: ['Slightly familiar'],
      tradeoffSummary: 'Balanced for concept generation.',
    },
  };
}

describe('evolutionRoutes', () => {
  const mockedListConcepts = listConcepts as jest.MockedFunction<typeof listConcepts>;
  const mockedLoadConcept = loadConcept as jest.MockedFunction<typeof loadConcept>;
  const mockedLoadKernel = loadKernel as jest.MockedFunction<typeof loadKernel>;
  let mockedEvolveConcepts: jest.SpiedFunction<typeof evolutionService.evolveConcepts>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedEvolveConcepts = jest.spyOn(evolutionService, 'evolveConcepts');
    mockedListConcepts.mockResolvedValue([]);
    mockedLoadConcept.mockResolvedValue(null);
    mockedLoadKernel.mockResolvedValue(null);
  });

  it('GET / renders evolution page', async () => {
    const render = jest.fn();

    void getRouteHandler('get', '/')({} as Request, { render } as unknown as Response);
    await flushPromises();

    expect(render).toHaveBeenCalledWith('pages/evolution', {
      title: 'Evolve Concepts - One More Branch',
    });
  });

  it('GET /api/concepts-by-kernel/:kernelId filters concepts by sourceKernelId', async () => {
    mockedListConcepts.mockResolvedValue([
      createSavedConcept('concept-1', 'kernel-1'),
      createSavedConcept('concept-2', 'kernel-2'),
      createSavedConcept('concept-3', 'kernel-1'),
    ]);

    const json = jest.fn().mockReturnThis();

    void getRouteHandler('get', '/api/concepts-by-kernel/:kernelId')(
      { params: { kernelId: 'kernel-1' } } as unknown as Request,
      { json } as unknown as Response,
    );
    await flushPromises();

    expect(json).toHaveBeenCalledWith({
      success: true,
      concepts: [expect.objectContaining({ id: 'concept-1' }), expect.objectContaining({ id: 'concept-3' })],
    });
  });

  it('POST /api/evolve returns 400 when apiKey is missing', async () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();

    void getRouteHandler('post', '/api/evolve')(
      { body: { conceptIds: ['concept-1', 'concept-2'], kernelId: 'kernel-1' } } as Request,
      { status, json } as unknown as Response,
    );
    await flushPromises();

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ success: false, error: 'OpenRouter API key is required' });
  });

  it('POST /api/evolve returns 400 when conceptIds length is invalid', async () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();

    void getRouteHandler('post', '/api/evolve')(
      { body: { conceptIds: ['concept-1'], kernelId: 'kernel-1', apiKey: 'valid-key-12345' } } as Request,
      { status, json } as unknown as Response,
    );
    await flushPromises();

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ success: false, error: 'Select 2-3 parent concepts' });
  });

  it('POST /api/evolve returns 400 when conceptIds are duplicated', async () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();

    void getRouteHandler('post', '/api/evolve')(
      {
        body: {
          conceptIds: ['concept-1', 'concept-1'],
          kernelId: 'kernel-1',
          apiKey: 'valid-key-12345',
        },
      } as Request,
      { status, json } as unknown as Response,
    );
    await flushPromises();

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: 'Selected parent concepts must be unique',
    });
  });

  it('POST /api/evolve returns 400 when kernelId is missing', async () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();

    void getRouteHandler('post', '/api/evolve')(
      { body: { conceptIds: ['concept-1', 'concept-2'], apiKey: 'valid-key-12345' } } as Request,
      { status, json } as unknown as Response,
    );
    await flushPromises();

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ success: false, error: 'Kernel selection is required' });
  });

  it('POST /api/evolve returns 404 when concept is missing', async () => {
    mockedLoadKernel.mockResolvedValue(createSavedKernel('kernel-1'));
    mockedLoadConcept
      .mockResolvedValueOnce(createSavedConcept('concept-1', 'kernel-1'))
      .mockResolvedValueOnce(null);

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();

    void getRouteHandler('post', '/api/evolve')(
      {
        body: {
          conceptIds: ['concept-1', 'concept-2'],
          kernelId: 'kernel-1',
          apiKey: 'valid-key-12345',
        },
      } as Request,
      { status, json } as unknown as Response,
    );
    await flushPromises();

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ success: false, error: 'Concept not found: concept-2' });
  });

  it('POST /api/evolve returns 404 when kernel is missing', async () => {
    mockedLoadKernel.mockResolvedValue(null);
    mockedLoadConcept
      .mockResolvedValueOnce(createSavedConcept('concept-1', 'kernel-1'))
      .mockResolvedValueOnce(createSavedConcept('concept-2', 'kernel-1'));

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();

    void getRouteHandler('post', '/api/evolve')(
      {
        body: {
          conceptIds: ['concept-1', 'concept-2'],
          kernelId: 'kernel-1',
          apiKey: 'valid-key-12345',
        },
      } as Request,
      { status, json } as unknown as Response,
    );
    await flushPromises();

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: 'Selected kernel was not found',
    });
  });

  it('POST /api/evolve returns 400 when concepts are from another kernel', async () => {
    mockedLoadKernel.mockResolvedValue(createSavedKernel('kernel-1'));
    mockedLoadConcept
      .mockResolvedValueOnce(createSavedConcept('concept-1', 'kernel-1'))
      .mockResolvedValueOnce(createSavedConcept('concept-2', 'kernel-2'));

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();

    void getRouteHandler('post', '/api/evolve')(
      {
        body: {
          conceptIds: ['concept-1', 'concept-2'],
          kernelId: 'kernel-1',
          apiKey: 'valid-key-12345',
        },
      } as Request,
      { status, json } as unknown as Response,
    );
    await flushPromises();

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: 'All selected concepts must belong to the selected kernel',
    });
  });

  it('POST /api/evolve runs evolution service and tracks progress', async () => {
    mockedLoadKernel.mockResolvedValue(createSavedKernel('kernel-1'));
    mockedLoadConcept
      .mockResolvedValueOnce(createSavedConcept('concept-1', 'kernel-1'))
      .mockResolvedValueOnce(createSavedConcept('concept-2', 'kernel-1'));

    const evaluatedConcepts = [createEvaluatedConceptFixture(41), createEvaluatedConceptFixture(42)];
    const verifications = [createConceptVerificationFixture(1), createConceptVerificationFixture(2)];

    const progressStartSpy = jest.spyOn(generationProgressService, 'start');
    const progressMarkStartedSpy = jest.spyOn(generationProgressService, 'markStageStarted');
    const progressMarkCompletedSpy = jest.spyOn(generationProgressService, 'markStageCompleted');
    const progressCompleteSpy = jest.spyOn(generationProgressService, 'complete');

    mockedEvolveConcepts.mockImplementation(({ onGenerationStage }) => {
      onGenerationStage?.({ stage: 'EVOLVING_CONCEPTS', status: 'started', attempt: 1 });
      onGenerationStage?.({ stage: 'EVOLVING_CONCEPTS', status: 'completed', attempt: 1 });
      return Promise.resolve({
        evolvedConcepts: evaluatedConcepts.map((entry) => entry.concept),
        scoredConcepts: [],
        evaluatedConcepts,
        verifications,
      });
    });

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();

    void getRouteHandler('post', '/api/evolve')(
      {
        body: {
          conceptIds: ['concept-1', 'concept-2'],
          kernelId: ' kernel-1 ',
          apiKey: ' valid-key-12345 ',
          progressId: ' evolve-progress-1 ',
        },
      } as Request,
      { status, json } as unknown as Response,
    );
    await flushPromises();

    const callInput = mockedEvolveConcepts.mock.calls[0]?.[0];
    expect(callInput?.apiKey).toBe('valid-key-12345');
    expect(callInput?.parentConcepts).toHaveLength(2);
    expect(callInput?.onGenerationStage).toEqual(expect.any(Function));
    expect(progressStartSpy).toHaveBeenCalledWith('evolve-progress-1', 'concept-evolution');
    expect(progressMarkStartedSpy).toHaveBeenCalledWith(
      'evolve-progress-1',
      'EVOLVING_CONCEPTS',
      1,
    );
    expect(progressMarkCompletedSpy).toHaveBeenCalledWith(
      'evolve-progress-1',
      'EVOLVING_CONCEPTS',
      1,
    );
    expect(progressCompleteSpy).toHaveBeenCalledWith('evolve-progress-1');
    expect(status).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ success: true, evaluatedConcepts, verifications });
  });

  it('POST /api/evolve formats LLM errors and fails progress', async () => {
    mockedLoadKernel.mockResolvedValue(createSavedKernel('kernel-1'));
    mockedLoadConcept
      .mockResolvedValueOnce(createSavedConcept('concept-1', 'kernel-1'))
      .mockResolvedValueOnce(createSavedConcept('concept-2', 'kernel-1'));
    mockedEvolveConcepts.mockRejectedValue(
      new LLMError('rate limit', 'HTTP_429', true, { httpStatus: 429 }),
    );

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();
    const progressFailSpy = jest.spyOn(generationProgressService, 'fail');

    void getRouteHandler('post', '/api/evolve')(
      {
        body: {
          conceptIds: ['concept-1', 'concept-2'],
          kernelId: 'kernel-1',
          apiKey: 'valid-key-12345',
          progressId: 'evolve-progress-2',
        },
      } as Request,
      { status, json } as unknown as Response,
    );
    await flushPromises();

    expect(progressFailSpy).toHaveBeenCalledWith(
      'evolve-progress-2',
      'Rate limit exceeded. Please wait a moment and try again.',
    );
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Rate limit exceeded. Please wait a moment and try again.',
        code: 'HTTP_429',
        retryable: true,
      }),
    );
  });
});
