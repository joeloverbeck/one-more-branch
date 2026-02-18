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

import { evaluateConcepts, parseConceptEvaluationResponse } from '../../../src/llm/concept-evaluator';
import { buildConceptEvaluatorPrompt } from '../../../src/llm/prompts/concept-evaluator-prompt';
import { CONCEPT_EVALUATION_SCHEMA } from '../../../src/llm/schemas/concept-evaluator-schema';
import { computeOverallScore } from '../../../src/models';

function createValidConcept(index: number): {
  oneLineHook: string;
  elevatorParagraph: string;
  genreFrame: 'NOIR';
  genreSubversion: string;
  protagonistRole: string;
  coreCompetence: string;
  coreFlaw: string;
  actionVerbs: readonly string[];
  coreConflictLoop: string;
  conflictAxis: 'TRUTH_VS_STABILITY';
  pressureSource: string;
  stakesPersonal: string;
  stakesSystemic: string;
  deadlineMechanism: string;
  settingAxioms: readonly string[];
  constraintSet: readonly string[];
  keyInstitutions: readonly string[];
  settingScale: 'LOCAL';
  branchingPosture: 'RECONVERGE';
  stateComplexity: 'MEDIUM';
} {
  return {
    oneLineHook: `Hook ${index}`,
    elevatorParagraph: `Elevator paragraph ${index}`,
    genreFrame: 'NOIR',
    genreSubversion: `Subversion ${index}`,
    protagonistRole: `Role ${index}`,
    coreCompetence: `Competence ${index}`,
    coreFlaw: `Flaw ${index}`,
    actionVerbs: ['negotiate', 'investigate', 'sabotage', 'deceive', 'protect', 'infiltrate'],
    coreConflictLoop: `Conflict loop ${index}`,
    conflictAxis: 'TRUTH_VS_STABILITY',
    pressureSource: `Pressure ${index}`,
    stakesPersonal: `Personal stakes ${index}`,
    stakesSystemic: `Systemic stakes ${index}`,
    deadlineMechanism: `Deadline ${index}`,
    settingAxioms: ['Axiom 1', 'Axiom 2'],
    constraintSet: ['Constraint 1', 'Constraint 2', 'Constraint 3'],
    keyInstitutions: ['Institution 1', 'Institution 2'],
    settingScale: 'LOCAL',
    branchingPosture: 'RECONVERGE',
    stateComplexity: 'MEDIUM',
  } as const;
}

function createEvaluatedConcept(index: number): {
  concept: ReturnType<typeof createValidConcept>;
  scores: {
    hookStrength: number;
    conflictEngine: number;
    agencyBreadth: number;
    noveltyLeverage: number;
    branchingFitness: number;
    llmFeasibility: number;
  };
  overallScore: number;
  strengths: readonly string[];
  weaknesses: readonly string[];
  tradeoffSummary: string;
} {
  const concept = createValidConcept(index);
  const scores = {
    hookStrength: 3 + (index % 2),
    conflictEngine: 4,
    agencyBreadth: 3,
    noveltyLeverage: 3,
    branchingFitness: 4,
    llmFeasibility: 5,
  };

  return {
    concept,
    scores,
    overallScore: 12,
    strengths: [`Strength ${index}`],
    weaknesses: [`Weakness ${index}`],
    tradeoffSummary: `Tradeoff ${index}`,
  };
}

function createValidPayload(): {
  evaluatedConcepts: Array<ReturnType<typeof createEvaluatedConcept>>;
} {
  return {
    evaluatedConcepts: [createEvaluatedConcept(1), createEvaluatedConcept(2), createEvaluatedConcept(3)],
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

  it('parseConceptEvaluationResponse with valid data returns sorted EvaluatedConcept[]', () => {
    const payload = createValidPayload();
    payload.evaluatedConcepts[0]!.scores.hookStrength = 1;
    payload.evaluatedConcepts[1]!.scores.hookStrength = 4;
    payload.evaluatedConcepts[2]!.scores.hookStrength = 2;

    const parsed = parseConceptEvaluationResponse(payload);

    expect(parsed).toHaveLength(3);
    expect(parsed[0]!.concept.oneLineHook).toBe('Hook 2');
    expect(parsed[1]!.concept.oneLineHook).toBe('Hook 3');
    expect(parsed[2]!.concept.oneLineHook).toBe('Hook 1');
  });

  it('parseConceptEvaluationResponse recomputes overallScore from dimension scores', () => {
    const payload = createValidPayload();
    payload.evaluatedConcepts[0]!.overallScore = 0;

    const parsed = parseConceptEvaluationResponse(payload);
    const expected = computeOverallScore(payload.evaluatedConcepts[0]!.scores);

    expect(parsed[0]!.overallScore).toBe(expected);
    expect(parsed[0]!.overallScore).not.toBe(0);
  });

  it('parseConceptEvaluationResponse clamps out-of-range scores', () => {
    const payload = createValidPayload();
    payload.evaluatedConcepts[0]!.scores.hookStrength = 7;
    payload.evaluatedConcepts[0]!.scores.noveltyLeverage = -1;

    const parsed = parseConceptEvaluationResponse(payload);
    const target = parsed.find((item) => item.concept.oneLineHook === 'Hook 1');

    expect(target?.scores.hookStrength).toBe(5);
    expect(target?.scores.noveltyLeverage).toBe(0);
    expect(mockLogger.warn).toHaveBeenCalledTimes(2);
  });

  it('parseConceptEvaluationResponse rejects missing evaluatedConcepts', () => {
    expect(() => parseConceptEvaluationResponse({})).toThrow('missing evaluatedConcepts array');
  });

  it('parseConceptEvaluationResponse rejects empty strengths/weaknesses', () => {
    const payload = createValidPayload();
    payload.evaluatedConcepts[0]!.strengths = [];
    expect(() => parseConceptEvaluationResponse(payload)).toThrow('strengths must contain at least 1 item');

    payload.evaluatedConcepts[0]!.strengths = ['valid'];
    payload.evaluatedConcepts[0]!.weaknesses = [];
    expect(() => parseConceptEvaluationResponse(payload)).toThrow(
      'weaknesses must contain at least 1 item',
    );
  });

  it('buildConceptEvaluatorPrompt includes scoring rubric and weights', () => {
    const messages = buildConceptEvaluatorPrompt({
      concepts: [createValidConcept(1), createValidConcept(2), createValidConcept(3)],
      userSeeds: {
        apiKey: 'test-api-key',
        genreVibes: 'sci-fi noir',
      },
    });

    const systemMessage = messages[0]?.content ?? '';
    expect(systemMessage).toContain('hookStrength');
    expect(systemMessage).toContain('conflictEngine');
    expect(systemMessage).toContain('agencyBreadth');
    expect(systemMessage).toContain('noveltyLeverage');
    expect(systemMessage).toContain('branchingFitness');
    expect(systemMessage).toContain('llmFeasibility');
    expect(systemMessage).toContain('weight 12');
    expect(systemMessage).toContain('weight 23');
  });

  it('buildConceptEvaluatorPrompt includes user seeds', () => {
    const messages = buildConceptEvaluatorPrompt({
      concepts: [createValidConcept(1)],
      userSeeds: {
        apiKey: 'test-api-key',
        genreVibes: 'dark fantasy',
        sparkLine: 'What if memory could be taxed?',
      },
    });
    const userMessage = messages[1]?.content ?? '';

    expect(userMessage).toContain('GENRE VIBES');
    expect(userMessage).toContain('dark fantasy');
    expect(userMessage).toContain('SPARK LINE');
    expect(userMessage).toContain('What if memory could be taxed?');
    expect(userMessage).not.toContain('test-api-key');
  });

  it('evaluateConcepts with mocked fetch returns parsed ConceptEvaluationResult', async () => {
    const payload = createValidPayload();
    const rawContent = JSON.stringify(payload);
    fetchMock.mockResolvedValue(responseWithMessageContent(rawContent));

    const result = await evaluateConcepts(
      {
        concepts: [createValidConcept(1), createValidConcept(2), createValidConcept(3)],
        userSeeds: {
          apiKey: 'test-api-key',
          genreVibes: 'noir',
        },
      },
      'test-api-key',
    );

    expect(result.rawResponse).toBe(rawContent);
    expect(result.evaluatedConcepts).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const requestBody = getRequestBody();
    expect(requestBody['response_format']).toEqual(CONCEPT_EVALUATION_SCHEMA);
    expect(mockLogPrompt).toHaveBeenCalledWith(mockLogger, 'conceptEvaluator', expect.any(Array));
    expect(mockLogPrompt).toHaveBeenCalledTimes(1);
  });
});
