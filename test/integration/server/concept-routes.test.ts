import type { Request, Response } from 'express';

jest.mock('@/llm/concept-ideator', () => ({
  generateConceptIdeas: jest.fn(),
  generateConceptIdeation: jest.fn(),
  generateConceptDevelopment: jest.fn(),
}));

jest.mock('@/llm/concept-evaluator', () => ({
  evaluateConcepts: jest.fn(),
}));

jest.mock('@/llm/concept-stress-tester', () => ({
  stressTestConcept: jest.fn(),
}));

jest.mock('@/llm/concept-verifier', () => ({
  verifyConcepts: jest.fn(),
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
import { generateConceptIdeation, generateConceptDevelopment } from '@/llm/concept-ideator';
import { stressTestConcept } from '@/llm/concept-stress-tester';
import { verifyConcepts } from '@/llm/concept-verifier';
import { conceptRoutes } from '@/server/routes/concepts';
import { generationProgressService } from '@/server/services';
import {
  listConcepts,
  loadConcept,
  saveConcept,
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
  createConceptVerificationFixture,
  createConceptSeedFixture,
  createConceptCharacterWorldFixture,
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
  const mockedGenerateConceptIdeation = generateConceptIdeation as jest.MockedFunction<
    typeof generateConceptIdeation
  >;
  const mockedGenerateConceptDevelopment = generateConceptDevelopment as jest.MockedFunction<
    typeof generateConceptDevelopment
  >;
  const mockedEvaluateConcepts = evaluateConcepts as jest.MockedFunction<typeof evaluateConcepts>;
  const mockedStressTestConcept = stressTestConcept as jest.MockedFunction<typeof stressTestConcept>;
  const mockedVerifyConcepts = verifyConcepts as jest.MockedFunction<typeof verifyConcepts>;
  const mockedLoadConcept = loadConcept as jest.MockedFunction<typeof loadConcept>;
  const mockedListConcepts = listConcepts as jest.MockedFunction<typeof listConcepts>;
  const mockedSaveConcept = saveConcept as jest.MockedFunction<typeof saveConcept>;
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
          conflictAxis: 'IDENTITY_VS_BELONGING',
          dramaticStance: 'ROMANTIC',
          thematicQuestion: 'Can safety exist without control?',
          antithesis: 'Counter-argument challenges the thesis.',
          moralArgument: 'Test moral argument',
          valueSpectrum: {
            positive: 'Love',
            contrary: 'Indifference',
            contradictory: 'Hate',
            negationOfNegation: 'Self-destruction through love',
          },
        },
        scores: {
          dramaticClarity: 4,
          thematicUniversality: 4,
          generativePotential: 4,
          conflictTension: 4,
          emotionalDepth: 4,
          ironicPotential: 3,
          viscerality: 3,
        },
        overallScore: 80,
        passes: true,
        strengths: ['Strong thesis'],
        weaknesses: ['Slightly abstract'],
        tradeoffSummary: 'Clear and generative.',
      },
    });
  });

  it('GET / renders concepts grouped by genre for the view', async () => {
    const evaluatedConceptA = createEvaluatedConceptFixture(1);
    const evaluatedConceptB = createEvaluatedConceptFixture(2);
    const evaluatedConceptC = createEvaluatedConceptFixture(3);

    const savedConcepts = [
      {
        id: 'concept-1',
        name: 'Concept 1',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        seeds: {},
        evaluatedConcept: {
          ...evaluatedConceptA,
          concept: { ...evaluatedConceptA.concept, genreFrame: 'DARK_FANTASY' },
        },
      },
      {
        id: 'concept-2',
        name: 'Concept 2',
        createdAt: '2025-01-02T00:00:00.000Z',
        updatedAt: '2025-01-02T00:00:00.000Z',
        seeds: {},
        evaluatedConcept: {
          ...evaluatedConceptB,
          concept: { ...evaluatedConceptB.concept, genreFrame: 'SPACE_OPERA' },
        },
      },
      {
        id: 'concept-3',
        name: 'Concept 3',
        createdAt: '2025-01-03T00:00:00.000Z',
        updatedAt: '2025-01-03T00:00:00.000Z',
        seeds: {},
        evaluatedConcept: {
          ...evaluatedConceptC,
          concept: { ...evaluatedConceptC.concept, genreFrame: 'DARK_FANTASY' },
        },
      },
    ];

    mockedListConcepts.mockResolvedValue(savedConcepts);
    const render = jest.fn().mockReturnThis();

    void getRouteHandler('get', '/')({} as Request, { render } as unknown as Response);
    await flushPromises();

    expect(render).toHaveBeenCalledWith(
      'pages/concepts',
      expect.objectContaining({
        title: 'Concepts - One More Branch',
        concepts: savedConcepts,
      }),
    );

    const renderCalls = render.mock.calls as Array<
      [string, { genreGroups: Array<{ genre: string; displayLabel: string; concepts: Array<unknown> }> }]
    >;
    const viewModel = renderCalls[0]?.[1];
    expect(viewModel).toBeDefined();
    if (!viewModel) {
      throw new Error('Expected view model to be passed to render');
    }
    expect(Array.isArray(viewModel.genreGroups)).toBe(true);
    expect(Object.fromEntries(viewModel.genreGroups.map((group) => [group.genre, group.concepts.length]))).toEqual({
      DARK_FANTASY: 2,
      SPACE_OPERA: 1,
    });
  });

  it('GET / always provides an array for genreGroups', async () => {
    mockedListConcepts.mockResolvedValue([]);
    const render = jest.fn().mockReturnThis();

    void getRouteHandler('get', '/')({} as Request, { render } as unknown as Response);
    await flushPromises();

    const renderCalls = render.mock.calls as Array<[string, { genreGroups: unknown }]>;
    const viewModel = renderCalls[0]?.[1];
    expect(viewModel).toBeDefined();
    if (!viewModel) {
      throw new Error('Expected view model to be passed to render');
    }
    expect(Array.isArray(viewModel.genreGroups)).toBe(true);
    expect(viewModel.genreGroups).toEqual([]);
  });

  it('POST /api/generate/ideate returns seeds and characterWorlds', async () => {
    const seeds = Array.from({ length: 6 }, (_, i) => createConceptSeedFixture(i + 1));
    const characterWorlds = Array.from({ length: 6 }, (_, i) => createConceptCharacterWorldFixture(i + 1));
    mockedGenerateConceptIdeation.mockResolvedValue({ seeds, characterWorlds });

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();
    const progressStartSpy = jest.spyOn(generationProgressService, 'start');
    const progressCompleteSpy = jest.spyOn(generationProgressService, 'complete');

    void getRouteHandler('post', '/api/generate/ideate')(
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

    expect(mockedGenerateConceptIdeation).toHaveBeenCalled();
    expect(progressStartSpy).toHaveBeenCalledWith('route-progress-1', 'concept-generation');
    expect(progressCompleteSpy).toHaveBeenCalledWith('route-progress-1');
    expect(status).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ success: true, seeds, characterWorlds });
  });

  it('POST /api/generate/ideate maps LLM errors to structured error responses', async () => {
    mockedGenerateConceptIdeation.mockRejectedValue(
      new LLMError('Rate limit exceeded', 'HTTP_429', true, { httpStatus: 429 }),
    );

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();
    const progressFailSpy = jest.spyOn(generationProgressService, 'fail');

    void getRouteHandler('post', '/api/generate/ideate')(
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
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Rate limit exceeded. Please wait a moment and try again.',
        code: 'HTTP_429',
        retryable: true,
      }),
    );
  });

  it('POST /api/generate/develop delegates through service and returns evaluated concepts', async () => {
    const seeds = Array.from({ length: 3 }, (_, i) => createConceptSeedFixture(i + 1));
    const characterWorlds = Array.from({ length: 3 }, (_, i) => createConceptCharacterWorldFixture(i + 1));
    const concepts = Array.from({ length: 3 }, (_, i) => createConceptSpecFixture(i + 1));
    mockedGenerateConceptDevelopment.mockResolvedValue({ concepts, rawResponse: 'raw-dev' });
    const evaluatedConcepts = [
      createEvaluatedConceptFixture(1),
      createEvaluatedConceptFixture(2),
      createEvaluatedConceptFixture(3),
    ];
    mockedEvaluateConcepts.mockResolvedValue({
      scoredConcepts: Array.from({ length: 3 }, (_, i) => createScoredConceptFixture(i + 1)),
      evaluatedConcepts,
      rawResponse: 'raw-eval',
    });
    const verifications = evaluatedConcepts.map((_, i) => createConceptVerificationFixture(i + 1));
    mockedVerifyConcepts.mockResolvedValue({ verifications, rawResponse: 'raw-verify' });

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();

    void getRouteHandler('post', '/api/generate/develop')(
      {
        body: {
          seeds,
          characterWorlds,
          kernelId: 'kernel-1',
          apiKey: 'valid-key-12345',
          progressId: 'route-progress-3',
        },
      } as Request,
      { status, json } as unknown as Response,
    );
    await flushPromises();

    expect(mockedSaveConceptGenerationBatch).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ success: true, evaluatedConcepts, verifications });
  });

  it('POST /api/generate/develop persists ideated concepts when evaluation fails', async () => {
    const seeds = Array.from({ length: 3 }, (_, i) => createConceptSeedFixture(i + 1));
    const characterWorlds = Array.from({ length: 3 }, (_, i) => createConceptCharacterWorldFixture(i + 1));
    const ideatedConcepts = Array.from({ length: 3 }, (_, i) => createConceptSpecFixture(i + 1));
    mockedGenerateConceptDevelopment.mockResolvedValue({ concepts: ideatedConcepts, rawResponse: 'raw' });
    mockedEvaluateConcepts.mockRejectedValue(
      new LLMError('Scored concept 4 has invalid scores', 'STRUCTURE_PARSE_ERROR', true),
    );

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();

    void getRouteHandler('post', '/api/generate/develop')(
      {
        body: { seeds, characterWorlds, kernelId: 'kernel-1', apiKey: 'valid-key-12345' },
      } as Request,
      { status, json } as unknown as Response,
    );
    await flushPromises();

    expect(mockedSaveConceptGenerationBatch).toHaveBeenCalledTimes(1);
    expect(mockedSaveConceptGenerationBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        ideatedConcepts,
        scoredConcepts: [],
        selectedConcepts: [],
      }),
    );
    expect(status).toHaveBeenCalledWith(500);
  });

  it('POST /api/generate/ideate returns 400 when kernelId is missing', async () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();

    void getRouteHandler('post', '/api/generate/ideate')(
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

  it('POST /api/generate/ideate returns 400 when kernel does not exist', async () => {
    mockedLoadKernel.mockResolvedValueOnce(null);

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();

    void getRouteHandler('post', '/api/generate/ideate')(
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

  it('POST /api/save preserves long default names derived from oneLineHook', async () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();
    const longHook =
      'A very long one-line hook that should remain fully intact when the concept is saved to the library and repository';

    void getRouteHandler('post', '/api/save')(
      {
        body: {
          evaluatedConcept: {
            ...createEvaluatedConceptFixture(1),
            concept: {
              ...createConceptSpecFixture(1),
              oneLineHook: longHook,
            },
          },
          seeds: {},
        },
      } as Request,
      { status, json } as unknown as Response,
    );
    await flushPromises();

    expect(mockedSaveConcept).toHaveBeenCalledWith(
      expect.objectContaining({
        name: longHook,
      }),
    );
    expect(status).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledTimes(1);
    const responseCalls = json.mock.calls as unknown[][];
    const payload = responseCalls[0]?.[0] as Record<string, unknown>;
    expect(payload['success']).toBe(true);
    const concept = payload['concept'] as Record<string, unknown>;
    expect(concept['name']).toBe(longHook);
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
        passes: true,
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

    const updaterArg = mockedUpdateConcept.mock.calls[0]![1] as (
      existing: typeof savedConcept,
    ) => Record<string, unknown>;
    const updatedRecord = updaterArg(savedConcept);
    expect(updatedRecord['preHardenedConcept']).toEqual(savedConcept.evaluatedConcept);
    expect((updatedRecord['evaluatedConcept'] as Record<string, unknown>)['concept']).toEqual(
      stressResult.hardenedConcept,
    );
  });
});
