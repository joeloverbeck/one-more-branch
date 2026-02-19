const mockLogPrompt = jest.fn();
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  getEntries: jest.fn().mockReturnValue([]),
  clear: jest.fn(),
};

jest.mock('../../../src/logging/index.js', () => ({
  get logger(): typeof mockLogger {
    return mockLogger;
  },
  get logPrompt(): typeof mockLogPrompt {
    return mockLogPrompt;
  },
}));

import { evaluateConcepts, parseConceptScoringResponse } from '../../../src/llm/concept-evaluator';
import {
  buildConceptEvaluatorDeepEvalPrompt,
  buildConceptEvaluatorScoringPrompt,
} from '../../../src/llm/prompts/concept-evaluator-prompt';
import {
  CONCEPT_EVALUATION_DEEP_SCHEMA,
  CONCEPT_EVALUATION_SCORING_SCHEMA,
} from '../../../src/llm/schemas/concept-evaluator-schema';
import { computeOverallScore } from '../../../src/models';
import type { ConceptSpec } from '../../../src/models';
import { createConceptSpecFixture } from '../../fixtures/concept-generator';

function createValidConcept(index: number): ConceptSpec {
  return createConceptSpecFixture(index);
}

function createScoredConceptPayload(index: number): {
  concept: ReturnType<typeof createValidConcept>;
  scores: {
    hookStrength: number;
    conflictEngine: number;
    agencyBreadth: number;
    noveltyLeverage: number;
    branchingFitness: number;
    llmFeasibility: number;
  };
  scoreEvidence: {
    hookStrength: readonly string[];
    conflictEngine: readonly string[];
    agencyBreadth: readonly string[];
    noveltyLeverage: readonly string[];
    branchingFitness: readonly string[];
    llmFeasibility: readonly string[];
  };
} {
  return {
    concept: createValidConcept(index),
    scores: {
      hookStrength: 3 + (index % 2),
      conflictEngine: 4,
      agencyBreadth: 3,
      noveltyLeverage: 3,
      branchingFitness: 4,
      llmFeasibility: 5,
    },
    scoreEvidence: {
      hookStrength: [`Hook evidence ${index}`],
      conflictEngine: [`Conflict evidence ${index}`],
      agencyBreadth: [`Agency evidence ${index}`],
      noveltyLeverage: [`Novelty evidence ${index}`],
      branchingFitness: [`Branching evidence ${index}`],
      llmFeasibility: [`Feasibility evidence ${index}`],
    },
  };
}

function createScoringPayload(): {
  scoredConcepts: Array<ReturnType<typeof createScoredConceptPayload>>;
} {
  return {
    scoredConcepts: [
      createScoredConceptPayload(1),
      createScoredConceptPayload(2),
      createScoredConceptPayload(3),
      createScoredConceptPayload(4),
      createScoredConceptPayload(5),
      createScoredConceptPayload(6),
    ],
  };
}

function createJsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

function responseWithMessageContent(content: string): Response {
  return createJsonResponse(200, {
    id: 'or-concept-evaluator-1',
    choices: [{ message: { content }, finish_reason: 'stop' }],
  });
}

describe('concept-evaluator', () => {
  const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    mockLogPrompt.mockReset();
    mockLogger.warn.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  function getRequestBody(callIndex = 0): Record<string, unknown> {
    const call = fetchMock.mock.calls[callIndex];
    if (!call) {
      return {};
    }

    const init = call[1];
    if (!init || typeof init.body !== 'string') {
      return {};
    }

    return JSON.parse(init.body) as Record<string, unknown>;
  }

  it('parseConceptScoringResponse with valid data returns all concepts sorted and rescored', () => {
    const payload = createScoringPayload();
    payload.scoredConcepts[0]!.scores.hookStrength = 1;
    payload.scoredConcepts[1]!.scores.hookStrength = 4;
    payload.scoredConcepts[2]!.scores.hookStrength = 2;

    const expectedConcepts = payload.scoredConcepts.map((item) => item.concept);
    const parsed = parseConceptScoringResponse(payload, expectedConcepts);

    expect(parsed).toHaveLength(6);
    expect(parsed[0]!.concept.oneLineHook).toBe('Hook 2');
    expect(parsed[0]!.overallScore).toBe(computeOverallScore(parsed[0]!.scores));
  });

  it('parseConceptScoringResponse clamps out-of-range scores', () => {
    const payload = createScoringPayload();
    payload.scoredConcepts[0]!.scores.hookStrength = 7;
    payload.scoredConcepts[0]!.scores.noveltyLeverage = -1;

    const expectedConcepts = payload.scoredConcepts.map((item) => item.concept);
    const parsed = parseConceptScoringResponse(payload, expectedConcepts);
    const target = parsed.find((item) => item.concept.oneLineHook === 'Hook 1');

    expect(target?.scores.hookStrength).toBe(5);
    expect(target?.scores.noveltyLeverage).toBe(0);
    expect(mockLogger.warn).toHaveBeenCalledTimes(2);
  });

  it('parseConceptScoringResponse rejects missing scoredConcepts', () => {
    expect(() => parseConceptScoringResponse({}, [createValidConcept(1)])).toThrow(
      'missing scoredConcepts array',
    );
  });

  it('parseConceptScoringResponse rejects omitted concepts', () => {
    const payload = createScoringPayload();
    payload.scoredConcepts = payload.scoredConcepts.slice(0, 5);
    const expectedConcepts = Array.from({ length: 6 }, (_, index) => createValidConcept(index + 1));

    expect(() => parseConceptScoringResponse(payload, expectedConcepts)).toThrow(
      'must include exactly 6 concepts',
    );
  });

  it('buildConceptEvaluatorScoringPrompt includes all-concept scoring instructions', () => {
    const messages = buildConceptEvaluatorScoringPrompt({
      concepts: Array.from({ length: 6 }, (_, index) => createValidConcept(index + 1)),
      userSeeds: {
        apiKey: 'test-api-key',
        genreVibes: 'sci-fi noir',
      },
    });

    const systemMessage = messages[0]?.content ?? '';
    expect(systemMessage).toContain('Score every candidate concept');
    expect(systemMessage).toContain('Do not rank, filter, or select concepts');
    expect(systemMessage).toContain('Do not compute weighted totals');
  });

  it('buildConceptEvaluatorScoringPrompt references enrichment fields in rubric', () => {
    const messages = buildConceptEvaluatorScoringPrompt({
      concepts: Array.from({ length: 6 }, (_, index) => createValidConcept(index + 1)),
      userSeeds: {
        apiKey: 'test-api-key',
      },
    });

    const systemMessage = messages[0]?.content ?? '';
    expect(systemMessage).toContain('whatIfQuestion quality');
    expect(systemMessage).toContain('playerFantasy appeal');
    expect(systemMessage).toContain('ironicTwist quality');
  });

  it('buildConceptEvaluatorDeepEvalPrompt includes shortlist-only deep evaluation instructions', () => {
    const messages = buildConceptEvaluatorDeepEvalPrompt(
      {
        concepts: Array.from({ length: 6 }, (_, index) => createValidConcept(index + 1)),
        userSeeds: {
          apiKey: 'test-api-key',
          genreVibes: 'dark fantasy',
        },
      },
      [
        {
          concept: createValidConcept(1),
          scores: createScoredConceptPayload(1).scores,
          scoreEvidence: createScoredConceptPayload(1).scoreEvidence,
          overallScore: 80,
        },
      ],
    );

    const systemMessage = messages[0]?.content ?? '';
    expect(systemMessage).toContain('Evaluate only the provided shortlist');
    expect(systemMessage).toContain('Do not rescore and do not alter concepts');
  });

  it('evaluateConcepts runs scoring then deep-eval and returns selected top concepts', async () => {
    const scoringPayload = createScoringPayload();
    scoringPayload.scoredConcepts[0]!.scores.hookStrength = 2;
    scoringPayload.scoredConcepts[1]!.scores.hookStrength = 5;
    scoringPayload.scoredConcepts[2]!.scores.hookStrength = 4;
    scoringPayload.scoredConcepts[3]!.scores.hookStrength = 3;
    scoringPayload.scoredConcepts[4]!.scores.hookStrength = 1;
    scoringPayload.scoredConcepts[5]!.scores.hookStrength = 1;

    const deepPayload = {
      evaluatedConcepts: [
        {
          concept: createValidConcept(2),
          strengths: ['Strong pressure loop'],
          weaknesses: ['Lower novelty'],
          tradeoffSummary: 'More coherent conflict, less surprising frame.',
        },
        {
          concept: createValidConcept(3),
          strengths: ['Strong hook'],
          weaknesses: ['Slightly narrower agency'],
          tradeoffSummary: 'Sharper opening with tighter action space.',
        },
        {
          concept: createValidConcept(4),
          strengths: ['Solid feasibility'],
          weaknesses: ['Hook is less immediate'],
          tradeoffSummary: 'High reliability with less immediate intrigue.',
        },
      ],
    };

    fetchMock
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(scoringPayload)))
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(deepPayload)));

    const result = await evaluateConcepts(
      {
        concepts: Array.from({ length: 6 }, (_, index) => createValidConcept(index + 1)),
        userSeeds: {
          apiKey: 'test-api-key',
          genreVibes: 'noir',
        },
      },
      'test-api-key',
    );

    expect(result.scoredConcepts).toHaveLength(6);
    expect(result.evaluatedConcepts).toHaveLength(3);
    expect(result.evaluatedConcepts[0]!.concept.oneLineHook).toBe('Hook 2');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const scoringRequestBody = getRequestBody(0);
    const deepRequestBody = getRequestBody(1);
    expect(scoringRequestBody['response_format']).toEqual(CONCEPT_EVALUATION_SCORING_SCHEMA);
    expect(deepRequestBody['response_format']).toEqual(CONCEPT_EVALUATION_DEEP_SCHEMA);
    expect(mockLogPrompt).toHaveBeenCalledWith(mockLogger, 'conceptEvaluator', expect.any(Array));
    expect(mockLogPrompt).toHaveBeenCalledTimes(2);
  });
});
