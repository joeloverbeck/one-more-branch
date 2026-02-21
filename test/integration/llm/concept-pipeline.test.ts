import { computeOverallScore } from '@/models';
import { createConceptService } from '@/server/services/concept-service';
import {
  createConceptScoresFixture,
  createConceptSeedInputFixture,
  createScoredConceptFixture,
  createConceptSpecFixture,
  createConceptStressTestFixture,
  createConceptVerificationFixture,
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

    const lowScore = { ...createConceptScoresFixture(), hookStrength: 3 };
    const topScore = { ...createConceptScoresFixture(), hookStrength: 5 };
    const middleScore = { ...createConceptScoresFixture(), hookStrength: 4 };

    const scoringPayload = {
      scoredConcepts: [
        { conceptId: 'concept_1', ...createScoredConceptFixture(1), scores: lowScore, overallScore: 1 },
        { conceptId: 'concept_2', ...createScoredConceptFixture(2), scores: topScore, overallScore: 1 },
        {
          conceptId: 'concept_3',
          ...createScoredConceptFixture(3),
          scores: middleScore,
          overallScore: 1,
        },
        {
          conceptId: 'concept_4',
          ...createScoredConceptFixture(4),
          scores: { ...createConceptScoresFixture(), hookStrength: 1 },
          overallScore: 1,
        },
        {
          conceptId: 'concept_5',
          ...createScoredConceptFixture(5),
          scores: { ...createConceptScoresFixture(), hookStrength: 1 },
          overallScore: 1,
        },
        {
          conceptId: 'concept_6',
          ...createScoredConceptFixture(6),
          scores: { ...createConceptScoresFixture(), hookStrength: 1 },
          overallScore: 1,
        },
      ],
    };
    const deepPayload = {
      evaluatedConcepts: [
        {
          conceptId: 'concept_2',
          strengths: ['Strong pressure'],
          weaknesses: ['Lower novelty'],
          tradeoffSummary: 'High conflict coherence with moderate novelty.',
        },
        {
          conceptId: 'concept_3',
          strengths: ['Good agency breadth'],
          weaknesses: ['Hook is less sharp'],
          tradeoffSummary: 'Broader tactics but weaker initial pull.',
        },
        {
          conceptId: 'concept_1',
          strengths: ['Solid feasibility'],
          weaknesses: ['Hook is weaker'],
          tradeoffSummary: 'Reliable execution at lower immediate intrigue.',
        },
        {
          conceptId: 'concept_4',
          strengths: ['Focused scenario'],
          weaknesses: ['Narrower hook'],
          tradeoffSummary: 'Focused but limited draw.',
        },
        {
          conceptId: 'concept_5',
          strengths: ['Clear stakes'],
          weaknesses: ['Lower variety'],
          tradeoffSummary: 'Defined stakes, narrower tactics.',
        },
        {
          conceptId: 'concept_6',
          strengths: ['Thematic clarity'],
          weaknesses: ['Less branching'],
          tradeoffSummary: 'Thematically tight but less expansive.',
        },
      ],
    };

    const verificationPayload = {
      verifications: Array.from({ length: 6 }, (_, i) => createConceptVerificationFixture(i + 1)),
    };

    fetchMock
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(ideationPayload)))
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(scoringPayload)))
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(deepPayload)))
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(verificationPayload)));

    const result = await service.generateConcepts({
      ...seeds,
      kernel: {
        dramaticThesis: 'Control destroys trust',
        valueAtStake: 'Trust',
        opposingForce: 'Fear of uncertainty',
        directionOfChange: 'IRONIC',
        thematicQuestion: 'Can safety exist without control?',
      },
      onGenerationStage: (event) => {
        stageEvents.push(event);
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(result.evaluatedConcepts).toHaveLength(6);
    expect(result.scoredConcepts).toHaveLength(6);
    expect(result.verifications).toHaveLength(6);
    expect(result.evaluatedConcepts[0]?.concept.oneLineHook).toBe('Hook 2');
    expect(result.evaluatedConcepts[0]?.overallScore).toBe(computeOverallScore(topScore));
    expect(result.evaluatedConcepts[2]?.overallScore).toBe(computeOverallScore(lowScore));
    expect(result.evaluatedConcepts[0]?.overallScore).not.toBe(1);
    expect(stageEvents).toEqual([
      { stage: 'GENERATING_CONCEPTS', status: 'started', attempt: 1 },
      { stage: 'GENERATING_CONCEPTS', status: 'completed', attempt: 1 },
      { stage: 'EVALUATING_CONCEPTS', status: 'started', attempt: 1 },
      { stage: 'EVALUATING_CONCEPTS', status: 'completed', attempt: 1 },
      { stage: 'VERIFYING_CONCEPTS', status: 'started', attempt: 1 },
      { stage: 'VERIFYING_CONCEPTS', status: 'completed', attempt: 1 },
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
