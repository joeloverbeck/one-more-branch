import { createEvolutionService } from '@/server/services/evolution-service';
import type { ConceptSpec, ConflictAxis, GenreFrame } from '@/models';
import {
  createConceptScoresFixture,
  createConceptSpecFixture,
  createConceptVerificationFixture,
  createEvaluatedConceptFixture,
  createScoredConceptFixture,
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
    id: 'or-evolution-pipeline',
    choices: [{ message: { content }, finish_reason: 'stop' }],
  });
}

function createEvolvedConcept(
  index: number,
  genreFrame: GenreFrame,
  conflictAxis: ConflictAxis,
): ConceptSpec {
  return {
    ...createConceptSpecFixture(index),
    oneLineHook: `Evolved Hook ${index}`,
    genreFrame,
    conflictAxis,
  };
}

describe('Evolution Pipeline Integration', () => {
  const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
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

  it('runs evolve -> evaluate -> verify through real service orchestration', async () => {
    const service = createEvolutionService();
    const stageEvents: Array<{ stage: string; status: string; attempt: number }> = [];

    const evolvedPayload = {
      concepts: [
        createEvolvedConcept(1, 'NOIR', 'TRUTH_VS_STABILITY'),
        createEvolvedConcept(2, 'SCI_FI', 'INDIVIDUAL_VS_SYSTEM'),
        createEvolvedConcept(3, 'FANTASY', 'POWER_VS_MORALITY'),
        createEvolvedConcept(4, 'THRILLER', 'DUTY_VS_DESIRE'),
        createEvolvedConcept(5, 'DRAMA', 'FREEDOM_VS_SAFETY'),
        createEvolvedConcept(6, 'GOTHIC', 'IDENTITY_VS_BELONGING'),
      ],
    };

    const scoringPayload = {
      scoredConcepts: Array.from({ length: 6 }, (_, index) => ({
        conceptId: `concept_${index + 1}`,
        scores: createConceptScoresFixture(),
        scoreEvidence: createScoredConceptFixture(index + 1).scoreEvidence,
      })),
    };

    const deepPayload = {
      evaluatedConcepts: Array.from({ length: 6 }, (_, index) => ({
        conceptId: `concept_${index + 1}`,
        strengths: [`Strength ${index + 1}`],
        weaknesses: [`Weakness ${index + 1}`],
        tradeoffSummary: `Tradeoff ${index + 1}`,
      })),
    };

    const verificationPayload = {
      verifications: Array.from({ length: 6 }, (_, i) => createConceptVerificationFixture(i + 1)),
    };

    fetchMock
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(evolvedPayload)))
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(scoringPayload)))
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(deepPayload)))
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(verificationPayload)));

    const result = await service.evolveConcepts({
      parentConcepts: [createEvaluatedConceptFixture(1), createEvaluatedConceptFixture(2)],
      kernel: {
        dramaticThesis: 'Control destroys trust',
        valueAtStake: 'Trust',
        opposingForce: 'Fear of uncertainty',
        directionOfChange: 'IRONIC',
        thematicQuestion: 'Can safety exist without control?',
      },
      apiKey: 'valid-key-12345',
      onGenerationStage: (event) => {
        stageEvents.push(event);
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(result.evolvedConcepts).toHaveLength(6);
    expect(result.evaluatedConcepts).toHaveLength(6);
    expect(result.verifications).toHaveLength(6);

    const scoringRequestBody = getRequestBody(1);
    const scoringMessages = JSON.stringify(scoringRequestBody['messages']);
    expect(scoringMessages).toContain('Evolved Hook 1');

    const verifierRequestBody = getRequestBody(3);
    const verifierMessages = JSON.stringify(verifierRequestBody['messages']);
    expect(verifierMessages).toContain('Strength 1');

    expect(stageEvents).toEqual([
      { stage: 'EVOLVING_CONCEPTS', status: 'started', attempt: 1 },
      { stage: 'EVOLVING_CONCEPTS', status: 'completed', attempt: 1 },
      { stage: 'EVALUATING_CONCEPTS', status: 'started', attempt: 1 },
      { stage: 'EVALUATING_CONCEPTS', status: 'completed', attempt: 1 },
      { stage: 'VERIFYING_CONCEPTS', status: 'started', attempt: 1 },
      { stage: 'VERIFYING_CONCEPTS', status: 'completed', attempt: 1 },
    ]);
  });
});
