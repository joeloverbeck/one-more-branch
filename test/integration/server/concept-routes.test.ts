import type { Request, Response } from 'express';

jest.mock('@/llm/concept-ideator', () => ({
  generateConceptIdeas: jest.fn(),
}));

jest.mock('@/llm/concept-evaluator', () => ({
  evaluateConcepts: jest.fn(),
}));

jest.mock('@/llm/concept-stress-tester', () => ({
  stressTestConcept: jest.fn(),
}));

jest.mock('@/persistence/concept-repository', () => ({
  listConcepts: jest.fn().mockResolvedValue([]),
  loadConcept: jest.fn(),
  saveConceptGenerationBatch: jest.fn(),
  saveConcept: jest.fn(),
  updateConcept: jest.fn(),
  deleteConcept: jest.fn(),
  conceptExists: jest.fn(),
}));

jest.mock('@/persistence/kernel-repository', () => ({
  loadKernel: jest.fn(),
}));

import { LLMError } from '@/llm/llm-client-types';
import { evaluateConcepts } from '@/llm/concept-evaluator';
import { generateConceptIdeas } from '@/llm/concept-ideator';
import { stressTestConcept } from '@/llm/concept-stress-tester';
import { conceptRoutes } from '@/server/routes/concepts';
import { generationProgressService } from '@/server/services';
import {
  loadConcept,
  saveConceptGenerationBatch,
  updateConcept,
} from '@/persistence/concept-repository';
import { loadKernel } from '@/persistence/kernel-repository';
import {
  createScoredConceptFixture,
  createConceptScoresFixture,
  createConceptSpecFixture,
  createConceptStressTestFixture,
  createEvaluatedConceptFixture,
} from '../../fixtures/concept-generator';

type RouteLayer = {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack?: Array<{ handle: (req: Request, res: Response) => Promise<void> | void }>;
  };
};

function getRouteHandler(
  method: 'get' | 'post' | 'put' | 'delete',
  path: string
): (req: Request, res: Response) => Promise<void> | void {
  const layer = (conceptRoutes.stack as unknown as RouteLayer[]).find(
    (item) => item.route?.path === path && item.route?.methods?.[method],
  );
  const handler = layer?.route?.stack?.[0]?.handle;

  if (!handler) {
    throw new Error(`${method.toUpperCase()} ${path} handler not found on conceptRoutes`);
  }

  return handler;
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

describe('Concept Route Integration', () => {
  const mockedGenerateConceptIdeas = generateConceptIdeas as jest.MockedFunction<
    typeof generateConceptIdeas
  >;
  const mockedEvaluateConcepts = evaluateConcepts as jest.MockedFunction<typeof evaluateConcepts>;
  const mockedStressTestConcept = stressTestConcept as jest.MockedFunction<typeof stressTestConcept>;
  const mockedLoadConcept = loadConcept as jest.MockedFunction<typeof loadConcept>;
  const mockedSaveConceptGenerationBatch = saveConceptGenerationBatch as jest.MockedFunction<
    typeof saveConceptGenerationBatch
  >;
  const mockedUpdateConcept = updateConcept as jest.MockedFunction<typeof updateConcept>;
  const mockedLoadKernel = loadKernel as jest.MockedFunction<typeof loadKernel>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedLoadKernel.mockResolvedValue({
      id: 'kernel-1',
      name: 'Kernel 1',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      seeds: {},
      evaluatedKernel: {
        kernel: {
          dramaticThesis: 'Control destroys trust',
          valueAtStake: 'Trust',
          opposingForce: 'Fear of uncertainty',
          directionOfChange: 'IRONIC',
          thematicQuestion: 'Can safety exist without control?',
        },
        scores: {
          dramaticClarity: 4,
          thematicUniversality: 4,
          generativePotential: 4,
          conflictTension: 4,
          emotionalDepth: 4,
        },
        overallScore: 80,
        strengths: ['Strong thesis'],
        weaknesses: ['Slightly abstract'],
        tradeoffSummary: 'Clear and generative.',
      },
    });
  });

  it('POST /api/generate delegates through service and returns evaluated concepts', async () => {
    mockedGenerateConceptIdeas.mockResolvedValue({
      concepts: Array.from({ length: 6 }, (_, index) => createConceptSpecFixture(index + 1)),
      rawResponse: 'raw-ideas',
    });
    const evaluatedConcepts = [
      createEvaluatedConceptFixture(1),
      createEvaluatedConceptFixture(2),
      createEvaluatedConceptFixture(3),
    ];
    mockedEvaluateConcepts.mockResolvedValue({
      scoredConcepts: Array.from({ length: 6 }, (_, index) => createScoredConceptFixture(index + 1)),
      evaluatedConcepts,
      rawResponse: 'raw-eval',
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
          genreVibes: '  dark fantasy  ',
          moodKeywords: '  tense ',
          kernelId: 'kernel-1',
          apiKey: '  valid-key-12345 ',
          progressId: ' route-progress-1 ',
        },
      } as Request,
      { status, json } as unknown as Response,
    );
    await flushPromises();

    expect(mockedGenerateConceptIdeas).toHaveBeenCalledWith(
      {
        genreVibes: 'dark fantasy',
        moodKeywords: 'tense',
        contentPreferences: undefined,
        thematicInterests: undefined,
        sparkLine: undefined,
        kernel: {
          dramaticThesis: 'Control destroys trust',
          valueAtStake: 'Trust',
          opposingForce: 'Fear of uncertainty',
          directionOfChange: 'IRONIC',
          thematicQuestion: 'Can safety exist without control?',
        },
      },
      'valid-key-12345',
    );
    expect(mockedEvaluateConcepts).toHaveBeenCalled();
    expect(progressStartSpy).toHaveBeenCalledWith('route-progress-1', 'concept-generation');
    expect(progressMarkStartedSpy).toHaveBeenCalledWith(
      'route-progress-1',
      'GENERATING_CONCEPTS',
      1,
    );
    expect(progressMarkCompletedSpy).toHaveBeenCalledWith(
      'route-progress-1',
      'EVALUATING_CONCEPTS',
      1,
    );
    expect(progressCompleteSpy).toHaveBeenCalledWith('route-progress-1');
    expect(mockedSaveConceptGenerationBatch).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ success: true, evaluatedConcepts });
  });

  it('POST /api/generate maps stage failures to structured LLM errors', async () => {
    mockedGenerateConceptIdeas.mockRejectedValue(
      new LLMError('Rate limit exceeded', 'HTTP_429', true, { httpStatus: 429 }),
    );

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();
    const progressFailSpy = jest.spyOn(generationProgressService, 'fail');

    void getRouteHandler('post', '/api/generate')(
      {
        body: {
          genreVibes: 'dark fantasy',
          kernelId: 'kernel-1',
          apiKey: 'valid-key-12345',
          progressId: 'route-progress-2',
        },
      } as Request,
      { status, json } as unknown as Response,
    );
    await flushPromises();

    expect(progressFailSpy).toHaveBeenCalledWith(
      'route-progress-2',
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

  it('POST /api/generate returns 400 when kernelId is missing', async () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();

    void getRouteHandler('post', '/api/generate')(
      {
        body: {
          genreVibes: 'dark fantasy',
          apiKey: 'valid-key-12345',
        },
      } as Request,
      { status, json } as unknown as Response,
    );
    await flushPromises();

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: 'Kernel selection is required',
    });
  });

  it('POST /api/generate returns 400 when kernel does not exist', async () => {
    mockedLoadKernel.mockResolvedValueOnce(null);

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();

    void getRouteHandler('post', '/api/generate')(
      {
        body: {
          genreVibes: 'dark fantasy',
          kernelId: 'missing-kernel',
          apiKey: 'valid-key-12345',
        },
      } as Request,
      { status, json } as unknown as Response,
    );
    await flushPromises();

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: 'Selected kernel was not found',
    });
  });

  it('POST /api/:conceptId/harden delegates through service and returns hardened concept', async () => {
    const savedConcept = {
      id: 'test-concept-1',
      name: 'Test Concept',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      seeds: {},
      evaluatedConcept: {
        concept: createConceptSpecFixture(1),
        scores: createConceptScoresFixture(),
        overallScore: 80,
        strengths: ['Strong hook'],
        weaknesses: ['weak urgency'],
        tradeoffSummary: 'Strong conflict, lower novelty.',
      },
    };
    mockedLoadConcept.mockResolvedValue(savedConcept);

    const stressResult = createConceptStressTestFixture();
    mockedStressTestConcept.mockResolvedValue(stressResult);

    mockedUpdateConcept.mockImplementation(
      (_id: string, updater: (existing: typeof savedConcept) => typeof savedConcept) => {
        return Promise.resolve(updater(savedConcept));
      },
    );

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();

    void getRouteHandler('post', '/api/:conceptId/harden')(
      {
        params: { conceptId: 'test-concept-1' },
        body: {
          apiKey: 'valid-key-12345',
        },
      } as unknown as Request,
      { status, json } as unknown as Response,
    );
    await flushPromises();

    expect(mockedStressTestConcept).toHaveBeenCalledWith(
      {
        concept: createConceptSpecFixture(1),
        scores: createConceptScoresFixture(),
        weaknesses: ['weak urgency'],
      },
      'valid-key-12345',
    );
    expect(status).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        hardenedConcept: stressResult.hardenedConcept,
        driftRisks: stressResult.driftRisks,
        playerBreaks: stressResult.playerBreaks,
      }),
    );
  });
});
