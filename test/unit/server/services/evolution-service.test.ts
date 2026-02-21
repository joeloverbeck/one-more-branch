import { LLMError } from '@/llm/llm-client-types';
import type { StoryKernel } from '@/models/story-kernel';
import { createEvolutionService, type EvolveConceptsInput } from '@/server/services/evolution-service';
import {
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
    thematicQuestion: 'Can safety exist without control?',
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

describe('evolution-service', () => {
  describe('evolveConcepts', () => {
    it('calls evolver then evaluator then verifier with expected inputs', async () => {
      const callOrder: string[] = [];
      const evolvedConcepts = Array.from({ length: 6 }, (_, index) => createConceptSpecFixture(index + 1));
      const scoredConcepts = [createScoredConceptFixture(1), createScoredConceptFixture(2)];
      const evaluatedConcepts = [createEvaluatedConceptFixture(1), createEvaluatedConceptFixture(2)];
      const verifications = [createConceptVerificationFixture(1), createConceptVerificationFixture(2)];
      const evolveConceptIdeas = jest.fn(() => {
        callOrder.push('evolver');
        return Promise.resolve({
          concepts: evolvedConcepts,
          rawResponse: 'raw-evolution',
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
        evolveConceptIdeas,
        evaluateConcepts,
        verifyConcepts,
      });

      const result = await service.evolveConcepts(createInput({ apiKey: '  valid-key-12345  ' }));

      expect(callOrder).toEqual(['evolver', 'evaluator', 'verifier']);
      expect(evolveConceptIdeas).toHaveBeenCalledWith(
        {
          parentConcepts: createInput().parentConcepts,
          kernel: createStoryKernel(),
        },
        'valid-key-12345',
      );
      expect(evaluateConcepts).toHaveBeenCalledWith(
        {
          concepts: evolvedConcepts,
          userSeeds: { apiKey: 'valid-key-12345' },
        },
        'valid-key-12345',
      );
      expect(verifyConcepts).toHaveBeenCalledWith(
        { evaluatedConcepts },
        'valid-key-12345',
      );
      expect(result).toEqual({
        evolvedConcepts,
        scoredConcepts,
        evaluatedConcepts,
        verifications,
      });
    });

    it('emits stage callbacks for evolve, evaluate, and verify in order', async () => {
      const events: Array<{ stage: string; status: string; attempt: number }> = [];
      const service = createEvolutionService({
        evolveConceptIdeas: jest.fn().mockResolvedValue({
          concepts: Array.from({ length: 6 }, (_, index) => createConceptSpecFixture(index + 1)),
          rawResponse: 'raw-evolution',
        }),
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
            events.push({
              stage: event.stage,
              status: event.status,
              attempt: event.attempt,
            });
          },
        }),
      );

      expect(events).toEqual([
        { stage: 'EVOLVING_CONCEPTS', status: 'started', attempt: 1 },
        { stage: 'EVOLVING_CONCEPTS', status: 'completed', attempt: 1 },
        { stage: 'EVALUATING_CONCEPTS', status: 'started', attempt: 1 },
        { stage: 'EVALUATING_CONCEPTS', status: 'completed', attempt: 1 },
        { stage: 'VERIFYING_CONCEPTS', status: 'started', attempt: 1 },
        { stage: 'VERIFYING_CONCEPTS', status: 'completed', attempt: 1 },
      ]);
    });

    it('rejects fewer than 2 parent concepts', async () => {
      const service = createEvolutionService({
        evolveConceptIdeas: jest.fn(),
        evaluateConcepts: jest.fn(),
        verifyConcepts: jest.fn(),
      });

      await expect(
        service.evolveConcepts(createInput({ parentConcepts: [createEvaluatedConceptFixture(1)] })),
      ).rejects.toThrow('Select 2-3 parent concepts');
    });

    it('rejects more than 3 parent concepts', async () => {
      const service = createEvolutionService({
        evolveConceptIdeas: jest.fn(),
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
        evolveConceptIdeas: jest.fn(),
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
        evolveConceptIdeas: jest.fn().mockRejectedValue(llmError),
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
      const service = createEvolutionService({
        evolveConceptIdeas: jest.fn().mockResolvedValue({
          concepts: Array.from({ length: 6 }, (_, index) => createConceptSpecFixture(index + 1)),
          rawResponse: 'raw-evolution',
        }),
        evaluateConcepts: jest.fn().mockRejectedValue(llmError),
        verifyConcepts,
      });

      await expect(service.evolveConcepts(createInput())).rejects.toBe(llmError);
      expect(verifyConcepts).not.toHaveBeenCalled();
    });

    it('propagates verifier errors', async () => {
      const llmError = new LLMError('Verifier failed', 'HTTP_500', true);
      const service = createEvolutionService({
        evolveConceptIdeas: jest.fn().mockResolvedValue({
          concepts: Array.from({ length: 6 }, (_, index) => createConceptSpecFixture(index + 1)),
          rawResponse: 'raw-evolution',
        }),
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
