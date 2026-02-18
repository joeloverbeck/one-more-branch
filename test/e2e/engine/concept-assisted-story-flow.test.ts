import type { Request, Response, Router } from 'express';

jest.mock('@/llm', () => ({
  decomposeEntities: jest.fn(),
  generateStoryStructure: jest.fn(),
}));

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
  saveConcept: jest.fn(),
  updateConcept: jest.fn(),
  deleteConcept: jest.fn(),
  conceptExists: jest.fn(),
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
import { evaluateConcepts } from '@/llm/concept-evaluator';
import { generateConceptIdeas } from '@/llm/concept-ideator';
import { stressTestConcept } from '@/llm/concept-stress-tester';
import type { StoryId, StorySpine } from '@/models';
import { conceptRoutes } from '@/server/routes/concepts';
import { storyRoutes } from '@/server/routes/stories';
import {
  loadConcept,
  saveConcept,
  updateConcept,
} from '@/persistence/concept-repository';
import {
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
  router: Router,
  method: 'post',
  path: string,
): (req: Request, res: Response) => Promise<void> | void {
  const layer = (router.stack as unknown as RouteLayer[]).find(
    (item) => item.route?.path === path && item.route?.methods?.[method],
  );
  const handler = layer?.route?.stack?.[0]?.handle;

  if (!handler) {
    throw new Error(`${method.toUpperCase()} ${path} handler not found`);
  }

  return handler;
}

async function waitForMock(mock: jest.Mock, timeout = 1000): Promise<void> {
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
  conflictType: 'PERSON_VS_SOCIETY',
  characterArcType: 'POSITIVE_CHANGE',
  toneFeel: ['grim', 'tense', 'political'],
  toneAvoid: ['whimsical', 'comedic'],
};

describe('Concept Assisted Story Flow (E2E)', () => {
  const createdStoryIds = new Set<StoryId>();

  const mockedGenerateConceptIdeas = generateConceptIdeas as jest.MockedFunction<
    typeof generateConceptIdeas
  >;
  const mockedEvaluateConcepts = evaluateConcepts as jest.MockedFunction<typeof evaluateConcepts>;
  const mockedStressTestConcept = stressTestConcept as jest.MockedFunction<typeof stressTestConcept>;
  const mockedDecomposeEntities = decomposeEntities as jest.MockedFunction<typeof decomposeEntities>;
  const mockedGenerateStoryStructure = generateStoryStructure as jest.MockedFunction<
    typeof generateStoryStructure
  >;
  const mockedLoadConcept = loadConcept as jest.MockedFunction<typeof loadConcept>;
  const mockedSaveConcept = saveConcept as jest.MockedFunction<typeof saveConcept>;
  const mockedUpdateConcept = updateConcept as jest.MockedFunction<typeof updateConcept>;

  const generateConceptsHandler = getRouteHandler(conceptRoutes, 'post', '/api/generate');
  const saveConceptHandler = getRouteHandler(conceptRoutes, 'post', '/api/save');
  const hardenHandler = getRouteHandler(conceptRoutes, 'post', '/api/:conceptId/harden');
  const createAjaxHandler = getRouteHandler(storyRoutes, 'post', '/create-ajax');

  beforeEach(() => {
    jest.clearAllMocks();
    storyEngine.init();

    mockedGenerateConceptIdeas.mockResolvedValue({
      concepts: Array.from({ length: 6 }, (_, index) => createConceptSpecFixture(index + 1)),
      rawResponse: 'raw-ideas',
    });
    mockedEvaluateConcepts.mockResolvedValue({
      evaluatedConcepts: [
        createEvaluatedConceptFixture(1),
        createEvaluatedConceptFixture(2),
        createEvaluatedConceptFixture(3),
      ],
      rawResponse: 'raw-eval',
    });
    mockedStressTestConcept.mockResolvedValue(createConceptStressTestFixture());
    mockedSaveConcept.mockResolvedValue(undefined);

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

  it('generates concepts, saves, hardens, and persists conceptSpec on story creation', async () => {
    // Step 1: Generate concepts
    const generateStatus = jest.fn().mockReturnThis();
    const generateJson = jest.fn().mockReturnThis();
    void generateConceptsHandler(
      {
        body: {
          genreVibes: 'dark fantasy',
          moodKeywords: 'tense',
          apiKey: 'valid-key-12345',
        },
      } as Request,
      { status: generateStatus, json: generateJson } as unknown as Response,
    );
    await waitForMock(generateJson);

    const generatePayload = getMockCallArg(generateJson, 0, 0) as {
      success: boolean;
      evaluatedConcepts: ReturnType<typeof createEvaluatedConceptFixture>[];
    };
    const evaluatedConcepts = generatePayload.evaluatedConcepts;
    expect(evaluatedConcepts).toHaveLength(3);

    const selected = evaluatedConcepts[0];
    expect(selected).toBeDefined();

    // Step 2: Save the concept
    const savedConceptId = 'saved-concept-1';
    const saveStatus = jest.fn().mockReturnThis();
    const saveJson = jest.fn().mockReturnThis();
    void saveConceptHandler(
      {
        body: {
          evaluatedConcept: selected,
          seeds: { genreVibes: 'dark fantasy', moodKeywords: 'tense' },
        },
      } as unknown as Request,
      { status: saveStatus, json: saveJson } as unknown as Response,
    );
    await waitForMock(saveJson);

    const savePayload = getMockCallArg(saveJson, 0, 0) as {
      success: boolean;
      concept: { id: string };
    };
    expect(savePayload.success).toBe(true);
    const conceptId = savePayload.concept.id;

    // Step 3: Harden the saved concept
    const savedConcept = {
      id: conceptId,
      name: selected?.concept.oneLineHook ?? 'Test',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      seeds: { genreVibes: 'dark fantasy' },
      evaluatedConcept: selected!,
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
        params: { conceptId: savedConceptId },
        body: {
          apiKey: 'valid-key-12345',
        },
      } as unknown as Request,
      { status: hardenStatus, json: hardenJson } as unknown as Response,
    );
    await waitForMock(hardenJson);

    const hardenPayload = getMockCallArg(hardenJson, 0, 0) as { hardenedConcept: unknown };
    const hardenedConcept = hardenPayload.hardenedConcept;
    expect(hardenedConcept).toBeDefined();

    // Step 4: Create story with the hardened concept
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
