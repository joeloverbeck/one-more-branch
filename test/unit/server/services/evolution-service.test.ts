import { LLMError } from '@/llm/llm-client-types';
import type { StoryKernel } from '@/models/story-kernel';
import { createEvolutionService, type EvolveConceptsInput } from '@/server/services/evolution-service';
import {
  createConceptCharacterWorldFixture,
  createConceptEngineFixture,
  createConceptSeedFixture,
  createConceptSpecFixture,
  createConceptVerificationFixture,
  createEvaluatedConceptFixture,
  createScoredConceptFixture,
} from '../../../fixtures/concept-generator';

function createStoryKernel(): StoryKernel {
  return {
    dramaticThesis: 'Control destroys trust',
    valueAtStake: 'Trust',
    opposingForce: 'Fear of uncertainty',
    directionOfChange: 'IRONIC',
    conflictAxis: 'KNOWLEDGE_VS_INNOCENCE',
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
  };
}

function createInput(overrides: Partial<EvolveConceptsInput> = {}): EvolveConceptsInput {
  return {
    parentConcepts: [createEvaluatedConceptFixture(1), createEvaluatedConceptFixture(2)],
    kernel: createStoryKernel(),
    apiKey: 'valid-key-12345',
    ...overrides,
  };
}

function expectCompletedStage(
  event: { stage: string; status: string; attempt: number; durationMs?: number },
  stage: string,
): void {
  expect(event).toMatchObject({ stage, status: 'completed', attempt: 1 });
  expect(typeof event.durationMs).toBe('number');
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createEvolutionStageDeps() {
  const generatedSeeds = [createConceptSeedFixture(1), createConceptSeedFixture(2)];
  const generatedCharacterWorlds = [
    createConceptCharacterWorldFixture(1),
    createConceptCharacterWorldFixture(2),
  ];
  const generatedEngines = [createConceptEngineFixture(1), createConceptEngineFixture(2)];

  return {
    generatedSeeds,
    generatedCharacterWorlds,
    generatedEngines,
    generateEvolvedConceptSeeds: jest.fn().mockResolvedValue({
      seeds: generatedSeeds,
      rawResponse: 'raw-seeds',
    }),
    generateConceptCharacterWorlds: jest.fn().mockResolvedValue({
      characterWorlds: generatedCharacterWorlds,
      rawResponse: 'raw-character-worlds',
    }),
    generateConceptEngines: jest.fn().mockResolvedValue({
      engines: generatedEngines,
      rawResponse: 'raw-engines',
    }),
  };
}

describe('evolution-service', () => {
  describe('evolveConcepts', () => {
    it('calls evolver then evaluator then verifier with expected inputs', async () => {
      const callOrder: string[] = [];
      const scoredConcepts = [createScoredConceptFixture(1), createScoredConceptFixture(2)];
      const evaluatedConcepts = [createEvaluatedConceptFixture(1), createEvaluatedConceptFixture(2)];
      const verifications = [createConceptVerificationFixture(1), createConceptVerificationFixture(2)];
      const deps = createEvolutionStageDeps();
      deps.generateEvolvedConceptSeeds.mockImplementation(() => {
        callOrder.push('seeder');
        return Promise.resolve({
          seeds: deps.generatedSeeds,
          rawResponse: 'raw-seeds',
        });
      });
      deps.generateConceptCharacterWorlds.mockImplementation(() => {
        callOrder.push('architect');
        return Promise.resolve({
          characterWorlds: deps.generatedCharacterWorlds,
          rawResponse: 'raw-character-worlds',
        });
      });
      deps.generateConceptEngines.mockImplementation(() => {
        callOrder.push('engineer');
        return Promise.resolve({
          engines: deps.generatedEngines,
          rawResponse: 'raw-engines',
        });
      });
      const evaluateConcepts = jest.fn(() => {
        callOrder.push('evaluator');
        return Promise.resolve({
          scoredConcepts,
          evaluatedConcepts,
          rawResponse: 'raw-evaluation',
        });
      });
      const verifyConcepts = jest.fn(() => {
        callOrder.push('verifier');
        return Promise.resolve({
          verifications,
          rawResponse: 'raw-verification',
        });
      });
      const service = createEvolutionService({
        ...deps,
        evaluateConcepts,
        verifyConcepts,
      });

      const result = await service.evolveConcepts(createInput({ apiKey: '  valid-key-12345  ' }));

      expect(callOrder).toEqual(['seeder', 'architect', 'engineer', 'evaluator', 'verifier']);
      expect(deps.generateEvolvedConceptSeeds).toHaveBeenCalledWith(
        {
          parentConcepts: createInput().parentConcepts,
          kernel: createStoryKernel(),
        },
        'valid-key-12345',
      );
      expect(deps.generateConceptCharacterWorlds).toHaveBeenCalledWith(
        {
          seeds: deps.generatedSeeds,
          kernel: createStoryKernel(),
          protagonistDetails: undefined,
          genreVibes: undefined,
          moodKeywords: undefined,
          contentPreferences: undefined,
        },
        'valid-key-12345',
      );
      expect(deps.generateConceptEngines).toHaveBeenCalledWith(
        {
          seeds: deps.generatedSeeds,
          characterWorlds: deps.generatedCharacterWorlds,
          kernel: createStoryKernel(),
          protagonistDetails: undefined,
          genreVibes: undefined,
          moodKeywords: undefined,
          contentPreferences: undefined,
        },
        'valid-key-12345',
      );
      expect(evaluateConcepts).toHaveBeenCalledWith(
        {
          concepts: [createConceptSpecFixture(1), createConceptSpecFixture(2)],
          userSeeds: { apiKey: 'valid-key-12345' },
        },
        'valid-key-12345',
      );
      expect(verifyConcepts).toHaveBeenCalledWith(
        { evaluatedConcepts, kernel: createStoryKernel() },
        'valid-key-12345',
      );
      expect(result).toEqual({
        evolvedConcepts: [createConceptSpecFixture(1), createConceptSpecFixture(2)],
        scoredConcepts,
        evaluatedConcepts,
        verifications,
      });
    });

    it('emits stage callbacks for evolve, evaluate, and verify in order', async () => {
      const events: Array<{ stage: string; status: string; attempt: number; durationMs?: number }> = [];
      const deps = createEvolutionStageDeps();
      const service = createEvolutionService({
        ...deps,
        evaluateConcepts: jest.fn().mockResolvedValue({
          scoredConcepts: [createScoredConceptFixture(1)],
          evaluatedConcepts: [createEvaluatedConceptFixture(1)],
          rawResponse: 'raw-evaluation',
        }),
        verifyConcepts: jest.fn().mockResolvedValue({
          verifications: [createConceptVerificationFixture(1)],
          rawResponse: 'raw-verification',
        }),
      });

      await service.evolveConcepts(
        createInput({
          onGenerationStage: (event) => {
            events.push(event);
          },
        }),
      );

      expect(events).toHaveLength(10);
      expect(events[0]).toEqual({ stage: 'SEEDING_EVOLVED_CONCEPTS', status: 'started', attempt: 1 });
      expectCompletedStage(events[1] as { stage: string; status: string; attempt: number; durationMs?: number }, 'SEEDING_EVOLVED_CONCEPTS');
      expect(events[2]).toEqual({ stage: 'ARCHITECTING_CONCEPTS', status: 'started', attempt: 1 });
      expectCompletedStage(events[3] as { stage: string; status: string; attempt: number; durationMs?: number }, 'ARCHITECTING_CONCEPTS');
      expect(events[4]).toEqual({ stage: 'ENGINEERING_CONCEPTS', status: 'started', attempt: 1 });
      expectCompletedStage(events[5] as { stage: string; status: string; attempt: number; durationMs?: number }, 'ENGINEERING_CONCEPTS');
      expect(events[6]).toEqual({ stage: 'EVALUATING_CONCEPTS', status: 'started', attempt: 1 });
      expectCompletedStage(events[7] as { stage: string; status: string; attempt: number; durationMs?: number }, 'EVALUATING_CONCEPTS');
      expect(events[8]).toEqual({ stage: 'ANALYZING_SPECIFICITY', status: 'started', attempt: 1 });
      expectCompletedStage(events[9] as { stage: string; status: string; attempt: number; durationMs?: number }, 'ANALYZING_SPECIFICITY');
    });

    it('rejects fewer than 2 parent concepts', async () => {
      const service = createEvolutionService({
        ...createEvolutionStageDeps(),
        evaluateConcepts: jest.fn(),
        verifyConcepts: jest.fn(),
      });

      await expect(
        service.evolveConcepts(createInput({ parentConcepts: [createEvaluatedConceptFixture(1)] })),
      ).rejects.toThrow('Select 2-3 parent concepts');
    });

    it('rejects more than 3 parent concepts', async () => {
      const service = createEvolutionService({
        ...createEvolutionStageDeps(),
        evaluateConcepts: jest.fn(),
        verifyConcepts: jest.fn(),
      });

      await expect(
        service.evolveConcepts(
          createInput({
            parentConcepts: [
              createEvaluatedConceptFixture(1),
              createEvaluatedConceptFixture(2),
              createEvaluatedConceptFixture(3),
              createEvaluatedConceptFixture(4),
            ],
          }),
        ),
      ).rejects.toThrow('Select 2-3 parent concepts');
    });

    it('rejects missing or short api keys', async () => {
      const service = createEvolutionService({
        ...createEvolutionStageDeps(),
        evaluateConcepts: jest.fn(),
        verifyConcepts: jest.fn(),
      });

      await expect(service.evolveConcepts(createInput({ apiKey: ' short ' }))).rejects.toThrow(
        'OpenRouter API key is required',
      );
    });

    it('rejects invalid kernel payloads', async () => {
      const service = createEvolutionService({
        evolveConceptIdeas: jest.fn(),
        evaluateConcepts: jest.fn(),
        verifyConcepts: jest.fn(),
      });

      await expect(
        service.evolveConcepts(
          createInput({
            kernel: {
              dramaticThesis: '',
              valueAtStake: '',
              opposingForce: '',
              directionOfChange: 'IRONIC',
              thematicQuestion: '',
            antithesis: 'Counter-argument challenges the thesis.',
            },
          }),
        ),
      ).rejects.toThrow('Story kernel is required');
    });

    it('propagates evolver errors', async () => {
      const llmError = new LLMError('Evolver failed', 'HTTP_429', true);
      const evaluateConcepts = jest.fn();
      const verifyConcepts = jest.fn();
      const service = createEvolutionService({
        ...createEvolutionStageDeps(),
        generateEvolvedConceptSeeds: jest.fn().mockRejectedValue(llmError),
        evaluateConcepts,
        verifyConcepts,
      });

      await expect(service.evolveConcepts(createInput())).rejects.toBe(llmError);
      expect(evaluateConcepts).not.toHaveBeenCalled();
      expect(verifyConcepts).not.toHaveBeenCalled();
    });

    it('propagates evaluator errors and does not invoke verifier (fail-fast invariant)', async () => {
      const llmError = new LLMError('Evaluator failed', 'STRUCTURE_PARSE_ERROR', true);
      const verifyConcepts = jest.fn();
      const deps = createEvolutionStageDeps();
      const service = createEvolutionService({
        ...deps,
        evaluateConcepts: jest.fn().mockRejectedValue(llmError),
        verifyConcepts,
      });

      await expect(service.evolveConcepts(createInput())).rejects.toBe(llmError);
      expect(verifyConcepts).not.toHaveBeenCalled();
    });

    it('propagates verifier errors', async () => {
      const llmError = new LLMError('Verifier failed', 'HTTP_500', true);
      const deps = createEvolutionStageDeps();
      const service = createEvolutionService({
        ...deps,
        evaluateConcepts: jest.fn().mockResolvedValue({
          scoredConcepts: [createScoredConceptFixture(1)],
          evaluatedConcepts: [createEvaluatedConceptFixture(1)],
          rawResponse: 'raw-evaluation',
        }),
        verifyConcepts: jest.fn().mockRejectedValue(llmError),
      });

      await expect(service.evolveConcepts(createInput())).rejects.toBe(llmError);
    });
  });
});
