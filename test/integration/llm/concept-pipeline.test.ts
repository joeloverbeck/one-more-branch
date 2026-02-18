import { computeOverallScore } from '@/models';
import { createConceptService } from '@/server/services/concept-service';
import {
  createConceptScoresFixture,
  createConceptSeedInputFixture,
  createConceptSpecFixture,
  createConceptStressTestFixture,
  createEvaluatedConceptFixture,
} from '../../fixtures/concept-generator';

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
    id: 'or-concept-pipeline',
    choices: [{ message: { content }, finish_reason: 'stop' }],
  });
}

describe('Concept Pipeline Integration', () => {
  const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('runs ideation then evaluation through real service orchestration', async () => {
    const service = createConceptService();
    const seeds = createConceptSeedInputFixture();
    const stageEvents: Array<{ stage: string; status: string; attempt: number }> = [];

    const ideationPayload = {
      concepts: Array.from({ length: 6 }, (_, index) => createConceptSpecFixture(index + 1)),
    };

    const lowScore = { ...createConceptScoresFixture(), hookStrength: 2 };
    const topScore = { ...createConceptScoresFixture(), hookStrength: 5 };
    const middleScore = { ...createConceptScoresFixture(), hookStrength: 3 };

    const evaluationPayload = {
      evaluatedConcepts: [
        { ...createEvaluatedConceptFixture(1), scores: lowScore, overallScore: 1 },
        { ...createEvaluatedConceptFixture(2), scores: topScore, overallScore: 1 },
        { ...createEvaluatedConceptFixture(3), scores: middleScore, overallScore: 1 },
      ],
    };

    fetchMock
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(ideationPayload)))
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(evaluationPayload)));

    const result = await service.generateConcepts({
      ...seeds,
      onGenerationStage: (event) => {
        stageEvents.push(event);
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.evaluatedConcepts).toHaveLength(3);
    expect(result.evaluatedConcepts[0]?.concept.oneLineHook).toBe('Hook 2');
    expect(result.evaluatedConcepts[0]?.overallScore).toBe(computeOverallScore(topScore));
    expect(result.evaluatedConcepts[2]?.overallScore).toBe(computeOverallScore(lowScore));
    expect(result.evaluatedConcepts[0]?.overallScore).not.toBe(1);
    expect(stageEvents).toEqual([
      { stage: 'GENERATING_CONCEPTS', status: 'started', attempt: 1 },
      { stage: 'GENERATING_CONCEPTS', status: 'completed', attempt: 1 },
      { stage: 'EVALUATING_CONCEPTS', status: 'started', attempt: 1 },
      { stage: 'EVALUATING_CONCEPTS', status: 'completed', attempt: 1 },
    ]);
  });

  it('runs stress-test stage through real service orchestration', async () => {
    const service = createConceptService();
    const stressPayload = createConceptStressTestFixture();
    const stageEvents: Array<{ stage: string; status: string; attempt: number }> = [];

    fetchMock.mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(stressPayload)));

    const result = await service.stressTestConcept({
      concept: createConceptSpecFixture(5),
      scores: createConceptScoresFixture(),
      weaknesses: ['weak urgency'],
      apiKey: 'valid-key-12345',
      onGenerationStage: (event) => {
        stageEvents.push(event);
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.hardenedConcept.oneLineHook).toBe('Hook 99');
    expect(result.driftRisks).toHaveLength(1);
    expect(result.playerBreaks).toHaveLength(1);
    expect(stageEvents).toEqual([
      { stage: 'STRESS_TESTING_CONCEPT', status: 'started', attempt: 1 },
      { stage: 'STRESS_TESTING_CONCEPT', status: 'completed', attempt: 1 },
    ]);
  });
});
