import type { NextFunction, Request, Response } from 'express';

jest.mock('@/persistence/concept-repository', () => ({
  listConcepts: jest.fn().mockResolvedValue([]),
  loadConcept: jest.fn(),
  saveConcept: jest.fn(),
  updateConcept: jest.fn(),
  deleteConcept: jest.fn(),
  conceptExists: jest.fn(),
}));

jest.mock('@/persistence/concept-seed-repository', () => ({
  listSeeds: jest.fn().mockResolvedValue([]),
  loadSeed: jest.fn(),
}));

jest.mock('@/persistence/kernel-repository', () => ({
  loadKernel: jest.fn(),
}));

const mockDevelopSingleConcept = jest.fn();
const mockStressTestConcept = jest.fn();

jest.mock('@/server/services/concept-service', () => ({
  ConceptEvaluationStageError: class extends Error { name = 'ConceptEvaluationStageError'; },
  createConceptService: jest.fn(),
  conceptService: {
    ideateConcepts: jest.fn(),
    developSingleConcept: mockDevelopSingleConcept,
    stressTestConcept: mockStressTestConcept,
    generateConcepts: jest.fn(),
    developConcepts: jest.fn(),
    verifyConcepts: jest.fn(),
  },
}));

import { conceptRoutes } from '@/server/routes/concepts';
import { generationProgressService } from '@/server/services';
import {
  listConcepts,
  loadConcept,
  saveConcept,
  updateConcept,
} from '@/persistence/concept-repository';
import { listSeeds, loadSeed } from '@/persistence/concept-seed-repository';
import { loadKernel } from '@/persistence/kernel-repository';
import {
  createConceptScoresFixture,
  createConceptSpecFixture,
  createConceptStressTestFixture,
  createConceptVerificationFixture,
  createEvaluatedConceptFixture,
} from '../../fixtures/concept-generator';

type RouteLayer = {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack?: Array<{ handle: (req: Request, res: Response, next: NextFunction) => Promise<void> | void }>;
  };
};

function getRouteHandler(
  method: 'get' | 'post' | 'put' | 'delete',
  path: string
): (req: Request, res: Response, next: NextFunction) => Promise<void> | void {
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

const noopNext: NextFunction = jest.fn();

describe('Concept Route Integration', () => {
  const mockedLoadConcept = loadConcept as jest.MockedFunction<typeof loadConcept>;
  const mockedListConcepts = listConcepts as jest.MockedFunction<typeof listConcepts>;
  const mockedSaveConcept = saveConcept as jest.MockedFunction<typeof saveConcept>;
  const mockedUpdateConcept = updateConcept as jest.MockedFunction<typeof updateConcept>;
  const mockedListSeeds = listSeeds as jest.MockedFunction<typeof listSeeds>;
  const mockedLoadSeed = loadSeed as jest.MockedFunction<typeof loadSeed>;
  const mockedLoadKernel = loadKernel as jest.MockedFunction<typeof loadKernel>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedListSeeds.mockResolvedValue([]);
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
        sourceKernelId: 'kernel-1',
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
        sourceKernelId: 'kernel-1',
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
        sourceKernelId: 'kernel-1',
        seeds: {},
        evaluatedConcept: {
          ...evaluatedConceptC,
          concept: { ...evaluatedConceptC.concept, genreFrame: 'DARK_FANTASY' },
        },
      },
    ];

    mockedListConcepts.mockResolvedValue(savedConcepts);
    const render = jest.fn().mockReturnThis();

    void getRouteHandler('get', '/')({} as Request, { render } as unknown as Response, noopNext);
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

    void getRouteHandler('get', '/')({} as Request, { render } as unknown as Response, noopNext);
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

  it('POST /api/generate/develop delegates through service for single concept', async () => {
    const mockSeed = {
      id: 'seed-1',
      name: 'Test Seed',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      sourceKernelId: 'kernel-1',
      protagonistDetails: 'a disgraced surgeon',
      oneLineHook: 'A surgeon turned installer',
      genreFrame: 'CYBERPUNK',
      genreSubversion: 'test subversion',
      conflictAxis: 'DUTY_VS_DESIRE',
      conflictType: 'PERSON_VS_SELF',
      whatIfQuestion: 'What if?',
      playerFantasy: 'test fantasy',
      protagonistRole: 'surgeon',
      coreCompetence: 'precision',
      coreFlaw: 'guilt',
      actionVerbs: ['cut', 'install'],
      coreConflictLoop: 'test loop',
      settingAxioms: ['axiom1'],
      constraintSet: ['constraint1'],
      keyInstitutions: ['institution1'],
      settingScale: 'LOCAL',
    };

    const evaluatedConcept = createEvaluatedConceptFixture(1);
    const verification = createConceptVerificationFixture(1);

    mockedLoadSeed.mockResolvedValue(mockSeed);
    mockDevelopSingleConcept.mockResolvedValue({
      concept: createConceptSpecFixture(1),
      evaluatedConcept,
      verification,
    });

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();
    const progressStartSpy = jest.spyOn(generationProgressService, 'start');
    const progressCompleteSpy = jest.spyOn(generationProgressService, 'complete');

    void getRouteHandler('post', '/api/generate/develop')(
      {
        body: {
          seedId: 'seed-1',
          apiKey: 'valid-key-12345',
          progressId: 'route-progress-3',
        },
      } as Request,
      { status, json } as unknown as Response,
      noopNext,
    );
    await flushPromises();

    expect(mockDevelopSingleConcept).toHaveBeenCalledWith(
      expect.objectContaining({
        seed: mockSeed,
        apiKey: 'valid-key-12345',
      }),
    );
    expect(progressStartSpy).toHaveBeenCalledWith('route-progress-3', 'concept-generation');
    expect(progressCompleteSpy).toHaveBeenCalledWith('route-progress-3');
    expect(status).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({
      success: true,
      evaluatedConcept,
      verification,
      sourceKernelId: 'kernel-1',
    });
  });

  it('POST /api/generate/develop returns 400 when seedId is missing', async () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();

    void getRouteHandler('post', '/api/generate/develop')(
      {
        body: {
          apiKey: 'valid-key-12345',
        },
      } as Request,
      { status, json } as unknown as Response,
      noopNext,
    );
    await flushPromises();

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: 'Seed selection is required',
    });
  });

  it('POST /api/generate/develop returns 400 when seed does not exist', async () => {
    mockedLoadSeed.mockResolvedValueOnce(null);

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();

    void getRouteHandler('post', '/api/generate/develop')(
      {
        body: {
          seedId: 'missing-seed',
          apiKey: 'valid-key-12345',
        },
      } as Request,
      { status, json } as unknown as Response,
      noopNext,
    );
    await flushPromises();

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: 'Selected seed was not found',
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
          sourceKernelId: 'kernel-1',
          seeds: {},
        },
      } as Request,
      { status, json } as unknown as Response,
      noopNext,
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
    mockStressTestConcept.mockResolvedValue(stressResult);

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
      noopNext,
    );
    await flushPromises();

    expect(mockStressTestConcept).toHaveBeenCalledWith(
      expect.objectContaining({
        concept: createConceptSpecFixture(1),
        scores: createConceptScoresFixture(),
        weaknesses: ['weak urgency'],
      }),
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
