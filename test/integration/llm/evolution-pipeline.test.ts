import { createEvolutionService } from '@/server/services/evolution-service';
import type { ConceptSeedFields, ConflictAxis, GenreFrame } from '@/models';
import {
  createConceptScoresFixture,
  createConceptVerificationFixture,
  createEvaluatedConceptFixture,
  createScoredConceptFixture,
  createConceptSeedFixture,
  createConceptCharacterWorldFixture,
  createConceptEngineFixture,
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

function createEvolvedSeed(
  index: number,
  genreFrame: GenreFrame,
  conflictAxis: ConflictAxis,
): ConceptSeedFields {
  return {
    ...createConceptSeedFixture(index),
    oneLineHook: `Evolved Hook ${index}`,
    genreFrame,
    conflictAxis,
  };
}

function expectCompletedStage(
  event: { stage: string; status: string; attempt: number; durationMs?: number },
  stage: string,
): void {
  expect(event).toMatchObject({ stage, status: 'completed', attempt: 1 });
  expect(typeof event.durationMs).toBe('number');
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
    const stageEvents: Array<{ stage: string; status: string; attempt: number; durationMs?: number }> = [];

    const evolverSeederPayload = {
      concepts: [
        createEvolvedSeed(1, 'NOIR', 'TRUTH_VS_STABILITY'),
        createEvolvedSeed(2, 'SCI_FI', 'INDIVIDUAL_VS_SYSTEM'),
        createEvolvedSeed(3, 'FANTASY', 'POWER_VS_MORALITY'),
        createEvolvedSeed(4, 'THRILLER', 'DUTY_VS_DESIRE'),
        createEvolvedSeed(5, 'DRAMA', 'FREEDOM_VS_SAFETY'),
        createEvolvedSeed(6, 'GOTHIC', 'IDENTITY_VS_BELONGING'),
      ],
    };

    const architectPayload = {
      concepts: Array.from({ length: 6 }, (_, index) => createConceptCharacterWorldFixture(index + 1)),
    };
    const engineerPayload = {
      concepts: Array.from({ length: 6 }, (_, index) => createConceptEngineFixture(index + 1)),
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

    const specificityPayload = {
      specificityAnalyses: Array.from({ length: 6 }, (_, i) => {
        const v = createConceptVerificationFixture(i + 1);
        return {
          conceptId: v.conceptId,
          signatureScenario: v.signatureScenario,
          loglineCompressible: v.loglineCompressible,
          logline: v.logline,
          premisePromises: v.premisePromises,
          inevitabilityStatement: v.inevitabilityStatement,
          loadBearingCheck: v.loadBearingCheck,
          kernelFidelityCheck: v.kernelFidelityCheck,
        };
      }),
    };

    const scenarioPayload = {
      scenarioAnalyses: Array.from({ length: 6 }, (_, i) => ({
        conceptId: `concept_${i + 1}`,
        escalatingSetpieces: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
        setpieceCausalChainBroken: false,
        setpieceCausalLinks: ['1->2', '2->3', '3->4', '4->5', '5->6'],
        conceptIntegrityScore: 85,
      })),
    };

    fetchMock
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(evolverSeederPayload)))
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(architectPayload)))
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(engineerPayload)))
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(scoringPayload)))
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(deepPayload)))
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(specificityPayload)))
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(scenarioPayload)));

    const result = await service.evolveConcepts({
      parentConcepts: [createEvaluatedConceptFixture(1), createEvaluatedConceptFixture(2)],
      kernel: {
        dramaticThesis: 'Control destroys trust',
        valueAtStake: 'Trust',
        opposingForce: 'Fear of uncertainty',
        directionOfChange: 'IRONIC',
        conflictAxis: 'TRUTH_VS_STABILITY',
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
      apiKey: 'valid-key-12345',
      onGenerationStage: (event) => {
        stageEvents.push(event);
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(7);
    expect(result.evolvedConcepts).toHaveLength(6);
    expect(result.evaluatedConcepts).toHaveLength(6);
    expect(result.verifications).toHaveLength(6);

    // Call indices: 0=seeder, 1=architect, 2=engineer, 3=scoring, 4=deep, 5=specificity, 6=scenario
    const scoringRequestBody = getRequestBody(3);
    const scoringMessages = JSON.stringify(scoringRequestBody['messages']);
    expect(scoringMessages).toContain('Evolved Hook 1');

    const verifierRequestBody = getRequestBody(5);
    const verifierMessages = JSON.stringify(verifierRequestBody['messages']);
    expect(verifierMessages).toContain('Strength 1');

    expect(stageEvents).toHaveLength(10);
    expect(stageEvents[0]).toEqual({ stage: 'SEEDING_EVOLVED_CONCEPTS', status: 'started', attempt: 1 });
    expectCompletedStage(stageEvents[1]!, 'SEEDING_EVOLVED_CONCEPTS');
    expect(stageEvents[2]).toEqual({ stage: 'ARCHITECTING_CONCEPTS', status: 'started', attempt: 1 });
    expectCompletedStage(stageEvents[3]!, 'ARCHITECTING_CONCEPTS');
    expect(stageEvents[4]).toEqual({ stage: 'ENGINEERING_CONCEPTS', status: 'started', attempt: 1 });
    expectCompletedStage(stageEvents[5]!, 'ENGINEERING_CONCEPTS');
    expect(stageEvents[6]).toEqual({ stage: 'EVALUATING_CONCEPTS', status: 'started', attempt: 1 });
    expectCompletedStage(stageEvents[7]!, 'EVALUATING_CONCEPTS');
    expect(stageEvents[8]).toEqual({ stage: 'ANALYZING_SPECIFICITY', status: 'started', attempt: 1 });
    expectCompletedStage(stageEvents[9]!, 'ANALYZING_SPECIFICITY');
  });
});
