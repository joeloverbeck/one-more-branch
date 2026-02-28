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
      scenarioAnalyses: Array.from({ length: 6 }, (_, i) => {
        const v = createConceptVerificationFixture(i + 1);
        return {
          conceptId: v.conceptId,
          escalatingSetpieces: v.escalatingSetpieces,
          setpieceCausalChainBroken: v.setpieceCausalChainBroken,
          setpieceCausalLinks: v.setpieceCausalLinks,
          conceptIntegrityScore: v.conceptIntegrityScore,
        };
      }),
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

    expect(stageEvents).toEqual([
      { stage: 'SEEDING_EVOLVED_CONCEPTS', status: 'started', attempt: 1 },
      { stage: 'ARCHITECTING_CONCEPTS', status: 'started', attempt: 1 },
      { stage: 'ENGINEERING_CONCEPTS', status: 'started', attempt: 1 },
      { stage: 'ENGINEERING_CONCEPTS', status: 'completed', attempt: 1 },
      { stage: 'EVALUATING_CONCEPTS', status: 'started', attempt: 1 },
      { stage: 'EVALUATING_CONCEPTS', status: 'completed', attempt: 1 },
      { stage: 'ANALYZING_SPECIFICITY', status: 'started', attempt: 1 },
      { stage: 'GENERATING_SCENARIOS', status: 'completed', attempt: 1 },
    ]);
  });
});
