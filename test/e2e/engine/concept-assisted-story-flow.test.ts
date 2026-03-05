import type { NextFunction, Request, Response, Router } from 'express';

jest.mock('@/llm', () => ({
  decomposeEntities: jest.fn(),
  generateStoryStructure: jest.fn(),
}));

jest.mock('@/llm/concept-stress-tester', () => ({
  stressTestConcept: jest.fn(),
}));

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
  saveSeed: jest.fn(),
  seedExists: jest.fn(),
  updateSeed: jest.fn(),
  deleteSeed: jest.fn(),
}));

jest.mock('@/persistence/kernel-repository', () => ({
  loadKernel: jest.fn(),
}));

const mockIdeateConcepts = jest.fn();
const mockDevelopSingleConcept = jest.fn();
const mockServiceStressTest = jest.fn();

jest.mock('@/server/services/concept-service', () => ({
  ConceptEvaluationStageError: class extends Error { name = 'ConceptEvaluationStageError'; },
  createConceptService: jest.fn(),
  conceptService: {
    ideateConcepts: mockIdeateConcepts,
    developSingleConcept: mockDevelopSingleConcept,
    stressTestConcept: mockServiceStressTest,
    generateConcepts: jest.fn(),
    developConcepts: jest.fn(),
    verifyConcepts: jest.fn(),
  },
}));

jest.mock('@/logging/index', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    getEntries: jest.fn().mockReturnValue([]),
    clear: jest.fn(),
  },
  logPrompt: jest.fn(),
}));

import { storyEngine } from '@/engine';
import { generateStoryStructure, decomposeEntities } from '@/llm';
import type { StoryId, StorySpine } from '@/models';
import { conceptSeedRoutes } from '@/server/routes/concept-seeds';
import { conceptRoutes } from '@/server/routes/concepts';
import { storyRoutes } from '@/server/routes/stories';
import {
  loadConcept,
  saveConcept,
  updateConcept,
} from '@/persistence/concept-repository';
import { loadSeed, saveSeed } from '@/persistence/concept-seed-repository';
import { loadKernel } from '@/persistence/kernel-repository';
import {
  createConceptCharacterWorldFixture,
  createConceptSeedFixture,
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
  router: Router,
  method: 'post',
  path: string,
): (req: Request, res: Response, next: NextFunction) => Promise<void> | void {
  const layer = (router.stack as unknown as RouteLayer[]).find(
    (item) => item.route?.path === path && item.route?.methods?.[method],
  );
  const handler = layer?.route?.stack?.[0]?.handle;

  if (!handler) {
    throw new Error(`${method.toUpperCase()} ${path} handler not found`);
  }

  return handler;
}

async function waitForMock(mock: jest.Mock, timeout = 2000): Promise<void> {
  const start = Date.now();
  while (mock.mock.calls.length === 0) {
    if (Date.now() - start > timeout) {
      throw new Error('Timed out waiting for mock to be called');
    }
    await new Promise((resolve) => setImmediate(resolve));
  }
}

function getMockCallArg(mockFn: jest.Mock, callIndex: number, argIndex: number): unknown {
  const calls = mockFn.mock.calls as unknown[][];
  return calls[callIndex]?.[argIndex];
}

const mockSpine: StorySpine = {
  centralDramaticQuestion: 'Can justice survive in a corrupt system?',
  protagonistNeedVsWant: { need: 'truth', want: 'safety', dynamic: 'DIVERGENT' },
  primaryAntagonisticForce: {
    description: 'The corrupt tribunal',
    pressureMechanism: 'Controls all records and courts',
  },
  storySpineType: 'MYSTERY',
  conflictAxis: 'INDIVIDUAL_VS_SYSTEM',
  conflictType: 'PERSON_VS_SOCIETY',
  characterArcType: 'POSITIVE_CHANGE',
  toneFeel: ['grim', 'tense', 'political'],
  toneAvoid: ['whimsical', 'comedic'],
};

const noopNext: NextFunction = jest.fn();

describe('Concept Assisted Story Flow (E2E)', () => {
  const createdStoryIds = new Set<StoryId>();

  const mockedDecomposeEntities = decomposeEntities as jest.MockedFunction<typeof decomposeEntities>;
  const mockedGenerateStoryStructure = generateStoryStructure as jest.MockedFunction<
    typeof generateStoryStructure
  >;
  const mockedLoadConcept = loadConcept as jest.MockedFunction<typeof loadConcept>;
  const mockedSaveConcept = saveConcept as jest.MockedFunction<typeof saveConcept>;
  const mockedUpdateConcept = updateConcept as jest.MockedFunction<typeof updateConcept>;
  const mockedLoadKernel = loadKernel as jest.MockedFunction<typeof loadKernel>;
  const mockedLoadSeed = loadSeed as jest.MockedFunction<typeof loadSeed>;

  const generateSeedHandler = getRouteHandler(conceptSeedRoutes, 'post', '/api/generate');
  const saveSeedHandler = getRouteHandler(conceptSeedRoutes, 'post', '/api/save');
  const developHandler = getRouteHandler(conceptRoutes, 'post', '/api/generate/develop');
  const saveConceptHandler = getRouteHandler(conceptRoutes, 'post', '/api/save');
  const hardenHandler = getRouteHandler(conceptRoutes, 'post', '/api/:conceptId/harden');
  const createAjaxHandler = getRouteHandler(storyRoutes, 'post', '/create-ajax');

  beforeEach(() => {
    jest.clearAllMocks();
    storyEngine.init();

    const seeds = Array.from({ length: 6 }, (_, index) => createConceptSeedFixture(index + 1));
    const characterWorlds = Array.from({ length: 6 }, (_, index) =>
      createConceptCharacterWorldFixture(index + 1),
    );

    mockIdeateConcepts.mockResolvedValue({ seeds, characterWorlds });

    const evaluatedConcept = createEvaluatedConceptFixture(1);
    const verification = createConceptVerificationFixture(1);
    mockDevelopSingleConcept.mockResolvedValue({
      concept: createConceptSpecFixture(1),
      evaluatedConcept,
      verification,
    });

    mockServiceStressTest.mockResolvedValue(createConceptStressTestFixture());
    mockedSaveConcept.mockResolvedValue(undefined);
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
          conflictAxis: 'DUTY_VS_DESIRE',
          dramaticStance: 'IRONIC',
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

    mockedDecomposeEntities.mockResolvedValue({
      decomposedCharacters: [],
      decomposedWorld: {
        facts: [],
        rawWorldbuilding: 'world',
      },
      rawResponse: '{}',
    });
    mockedGenerateStoryStructure.mockResolvedValue({
      overallTheme: 'Survive and reveal hidden truths.',
      acts: [
        {
          id: '1',
          name: 'Act I',
          objective: 'Begin',
          stakes: 'Failure costs everything',
          entryCondition: 'The story starts',
          beats: [
            {
              id: '1.1',
              name: 'Opening beat',
              description: 'Initial pressure appears',
              objective: 'Stabilize',
              causalLink: 'Because of prior events.',
              role: 'setup',
            },
          ],
        },
      ],
      rawResponse: '{}',
    });
  });

  afterEach(async () => {
    for (const storyId of createdStoryIds) {
      try {
        await storyEngine.deleteStory(storyId);
      } catch {
        // Cleanup failures should not mask assertions.
      }
    }
    createdStoryIds.clear();
  });

  it('generates seeds, saves, develops, hardens, and persists conceptSpec on story creation', async () => {
    // Step 1: Generate seeds via concept-seeds route
    const generateStatus = jest.fn().mockReturnThis();
    const generateJson = jest.fn().mockReturnThis();
    void generateSeedHandler(
      {
        body: {
          protagonistDetails: 'a disgraced surgeon turned cybernetic installer',
          genreVibes: 'dark fantasy',
          moodKeywords: 'tense',
          kernelId: 'kernel-1',
          apiKey: 'valid-key-12345',
        },
      } as Request,
      { status: generateStatus, json: generateJson } as unknown as Response,
      noopNext,
    );
    await waitForMock(generateJson);
    expect(generateStatus).not.toHaveBeenCalled();

    const generatePayload = getMockCallArg(generateJson, 0, 0) as {
      success: boolean;
      seeds: unknown[];
      characterWorlds: unknown[];
      kernelId: string;
    };
    expect(generatePayload.success).toBe(true);
    expect(generatePayload.seeds).toHaveLength(6);
    expect(generatePayload.characterWorlds).toHaveLength(6);

    // Step 2: Save a seed
    const saveSeedStatus = jest.fn().mockReturnThis();
    const saveSeedJson = jest.fn().mockReturnThis();
    void saveSeedHandler(
      {
        body: {
          seed: generatePayload.seeds[0],
          characterWorld: generatePayload.characterWorlds[0],
          sourceKernelId: 'kernel-1',
          protagonistDetails: 'a disgraced surgeon turned cybernetic installer',
          genreVibes: 'dark fantasy',
        },
      } as unknown as Request,
      { status: saveSeedStatus, json: saveSeedJson } as unknown as Response,
      noopNext,
    );
    await waitForMock(saveSeedJson);
    expect(saveSeedStatus).not.toHaveBeenCalled();

    const saveSeedPayload = getMockCallArg(saveSeedJson, 0, 0) as {
      success: boolean;
      seed: Record<string, unknown>;
    };
    expect(saveSeedPayload.success).toBe(true);
    const seedId = saveSeedPayload.seed['id'] as string;

    // Step 3: Develop the saved seed into a concept
    mockedLoadSeed.mockResolvedValue(saveSeedPayload.seed as Parameters<typeof mockedLoadSeed.mockResolvedValue>[0]);

    const developStatus = jest.fn().mockReturnThis();
    const developJson = jest.fn().mockReturnThis();
    void developHandler(
      {
        body: {
          seedId,
          apiKey: 'valid-key-12345',
        },
      } as Request,
      { status: developStatus, json: developJson } as unknown as Response,
      noopNext,
    );
    await waitForMock(developJson);
    expect(developStatus).not.toHaveBeenCalled();

    const developPayload = getMockCallArg(developJson, 0, 0) as {
      success: boolean;
      evaluatedConcept: ReturnType<typeof createEvaluatedConceptFixture>;
      verification: unknown;
    };
    expect(developPayload.success).toBe(true);
    expect(developPayload.evaluatedConcept).toBeDefined();

    // Step 4: Save the developed concept
    const saveConceptStatus = jest.fn().mockReturnThis();
    const saveConceptJson = jest.fn().mockReturnThis();
    void saveConceptHandler(
      {
        body: {
          evaluatedConcept: developPayload.evaluatedConcept,
          seeds: { genreVibes: 'dark fantasy', moodKeywords: 'tense' },
          verificationResult: developPayload.verification,
        },
      } as unknown as Request,
      { status: saveConceptStatus, json: saveConceptJson } as unknown as Response,
      noopNext,
    );
    await waitForMock(saveConceptJson);

    const saveConceptPayload = getMockCallArg(saveConceptJson, 0, 0) as {
      success: boolean;
      concept: { id: string };
    };
    expect(saveConceptPayload.success).toBe(true);
    const conceptId = saveConceptPayload.concept.id;

    // Step 5: Harden the saved concept
    const savedConcept = {
      id: conceptId,
      name: developPayload.evaluatedConcept?.concept.oneLineHook ?? 'Test',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      seeds: { genreVibes: 'dark fantasy' },
      evaluatedConcept: developPayload.evaluatedConcept!,
    };
    mockedLoadConcept.mockResolvedValue(savedConcept);
    mockedUpdateConcept.mockImplementation(
      (_id: string, updater: (existing: typeof savedConcept) => typeof savedConcept) => {
        return Promise.resolve(updater(savedConcept));
      },
    );

    const hardenStatus = jest.fn().mockReturnThis();
    const hardenJson = jest.fn().mockReturnThis();
    void hardenHandler(
      {
        params: { conceptId },
        body: {
          apiKey: 'valid-key-12345',
        },
      } as unknown as Request,
      { status: hardenStatus, json: hardenJson } as unknown as Response,
      noopNext,
    );
    await waitForMock(hardenJson);

    const hardenPayload = getMockCallArg(hardenJson, 0, 0) as { hardenedConcept: unknown };
    const hardenedConcept = hardenPayload.hardenedConcept;
    expect(hardenedConcept).toBeDefined();

    // Step 6: Create story with the hardened concept
    const createStatus = jest.fn().mockReturnThis();
    const createJson = jest.fn().mockReturnThis();
    void createAjaxHandler(
      {
        body: {
          title: 'E2E CONGEN-09 Story',
          characterConcept: 'A long enough character concept for validation',
          worldbuilding: 'A city where memory is currency',
          tone: 'grim noir',
          startingSituation: 'A ledger goes missing at dawn',
          conceptSpec: hardenedConcept,
          apiKey: 'valid-key-12345',
          spine: mockSpine,
        },
      } as Request,
      { status: createStatus, json: createJson } as unknown as Response,
      noopNext,
    );
    await waitForMock(createJson);

    const createPayload = getMockCallArg(createJson, 0, 0) as {
      success: boolean;
      storyId: StoryId;
    };
    expect(createPayload.success).toBe(true);
    createdStoryIds.add(createPayload.storyId);

    const persisted = await storyEngine.loadStory(createPayload.storyId);
    expect(persisted).not.toBeNull();
    expect(persisted?.conceptSpec).toEqual(hardenedConcept);
    expect(persisted?.structure).not.toBeNull();
  });
});
