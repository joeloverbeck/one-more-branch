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

import { LLMError } from '@/llm/llm-client-types';
import { evaluateConcepts } from '@/llm/concept-evaluator';
import { generateConceptIdeas } from '@/llm/concept-ideator';
import { stressTestConcept } from '@/llm/concept-stress-tester';
import { storyRoutes } from '@/server/routes/stories';
import { generationProgressService } from '@/server/services';
import {
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
  method: 'post',
  path: string
): (req: Request, res: Response) => Promise<void> | void {
  const layer = (storyRoutes.stack as unknown as RouteLayer[]).find(
    (item) => item.route?.path === path && item.route?.methods?.[method],
  );
  const handler = layer?.route?.stack?.[0]?.handle;

  if (!handler) {
    throw new Error(`${method.toUpperCase()} ${path} handler not found on storyRoutes`);
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /generate-concepts delegates through service and returns evaluated concepts', async () => {
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
      evaluatedConcepts,
      rawResponse: 'raw-eval',
    });

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();
    const progressStartSpy = jest.spyOn(generationProgressService, 'start');
    const progressMarkStartedSpy = jest.spyOn(generationProgressService, 'markStageStarted');
    const progressMarkCompletedSpy = jest.spyOn(generationProgressService, 'markStageCompleted');
    const progressCompleteSpy = jest.spyOn(generationProgressService, 'complete');

    void getRouteHandler('post', '/generate-concepts')(
      {
        body: {
          genreVibes: '  dark fantasy  ',
          moodKeywords: '  tense ',
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
    expect(status).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ success: true, evaluatedConcepts });
  });

  it('POST /generate-concepts maps stage failures to structured LLM errors', async () => {
    mockedGenerateConceptIdeas.mockRejectedValue(
      new LLMError('Rate limit exceeded', 'HTTP_429', true, { httpStatus: 429 }),
    );

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();
    const progressFailSpy = jest.spyOn(generationProgressService, 'fail');

    void getRouteHandler('post', '/generate-concepts')(
      {
        body: {
          genreVibes: 'dark fantasy',
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

  it('POST /stress-test-concept delegates through service and returns hardened concept', async () => {
    const stressResult = createConceptStressTestFixture();
    mockedStressTestConcept.mockResolvedValue(stressResult);

    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();

    void getRouteHandler('post', '/stress-test-concept')(
      {
        body: {
          concept: createConceptSpecFixture(1),
          scores: createConceptScoresFixture(),
          weaknesses: ['weak urgency'],
          apiKey: 'valid-key-12345',
        },
      } as Request,
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
    expect(json).toHaveBeenCalledWith({
      success: true,
      hardenedConcept: stressResult.hardenedConcept,
      driftRisks: stressResult.driftRisks,
      playerBreaks: stressResult.playerBreaks,
    });
  });
});
