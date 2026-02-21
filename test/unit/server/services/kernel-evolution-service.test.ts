import { LLMError } from '@/llm/llm-client-types';
import type { EvaluatedKernel, StoryKernel } from '@/models';
import {
  createKernelEvolutionService,
  type EvolveKernelsInput,
} from '@/server/services/kernel-evolution-service';

function createKernel(index = 1): StoryKernel {
  return {
    dramaticThesis: `Thesis ${index}`,
    valueAtStake: `Value ${index}`,
    opposingForce: `Force ${index}`,
    directionOfChange: 'POSITIVE',
    thematicQuestion: `Question ${index}?`,
  };
}

function createEvaluatedKernel(index = 1): EvaluatedKernel {
  return {
    kernel: createKernel(index),
    scores: {
      dramaticClarity: 4,
      thematicUniversality: 3,
      generativePotential: 4,
      conflictTension: 5,
      emotionalDepth: 3,
    },
    overallScore: 78,
    passes: true,
    strengths: [`Strength ${index}`],
    weaknesses: [`Weakness ${index}`],
    tradeoffSummary: `Tradeoff ${index}`,
  };
}

function createInput(overrides: Partial<EvolveKernelsInput> = {}): EvolveKernelsInput {
  return {
    parentKernels: [createEvaluatedKernel(1), createEvaluatedKernel(2)],
    apiKey: 'valid-key-12345',
    ...overrides,
  };
}

describe('kernel-evolution-service', () => {
  describe('evolveKernels', () => {
    it('calls evolver then evaluator with expected inputs', async () => {
      const callOrder: string[] = [];
      const evolvedKernels = Array.from({ length: 6 }, (_, index) => createKernel(index + 1));
      const scoredKernels = [
        {
          kernel: createKernel(1),
          scores: {
            dramaticClarity: 4,
            thematicUniversality: 3,
            generativePotential: 4,
            conflictTension: 5,
            emotionalDepth: 3,
          },
          scoreEvidence: {
            dramaticClarity: ['evidence'],
            thematicUniversality: ['evidence'],
            generativePotential: ['evidence'],
            conflictTension: ['evidence'],
            emotionalDepth: ['evidence'],
          },
          overallScore: 78,
          passes: true,
        },
      ];
      const evaluatedKernels = [createEvaluatedKernel(1)];

      const evolveKernels = jest.fn(() => {
        callOrder.push('evolver');
        return Promise.resolve({
          kernels: evolvedKernels,
          rawResponse: 'raw-evolution',
        });
      });
      const evaluateKernels = jest.fn(() => {
        callOrder.push('evaluator');
        return Promise.resolve({
          scoredKernels,
          evaluatedKernels,
          rawResponse: 'raw-evaluation',
        });
      });

      const service = createKernelEvolutionService({ evolveKernels, evaluateKernels });

      const result = await service.evolveKernels(createInput({ apiKey: '  valid-key-12345  ' }));

      expect(callOrder).toEqual(['evolver', 'evaluator']);
      expect(evolveKernels).toHaveBeenCalledWith(
        { parentKernels: createInput().parentKernels },
        'valid-key-12345',
      );
      expect(evaluateKernels).toHaveBeenCalledWith(
        {
          kernels: evolvedKernels,
          userSeeds: { apiKey: 'valid-key-12345' },
        },
        'valid-key-12345',
      );
      expect(result).toEqual({
        evolvedKernels,
        scoredKernels,
        evaluatedKernels,
      });
    });

    it('emits stage callbacks for evolve and evaluate in order', async () => {
      const events: Array<{ stage: string; status: string; attempt: number }> = [];
      const service = createKernelEvolutionService({
        evolveKernels: jest.fn().mockResolvedValue({
          kernels: Array.from({ length: 6 }, (_, index) => createKernel(index + 1)),
          rawResponse: 'raw-evolution',
        }),
        evaluateKernels: jest.fn().mockResolvedValue({
          scoredKernels: [],
          evaluatedKernels: [createEvaluatedKernel(1)],
          rawResponse: 'raw-evaluation',
        }),
      });

      await service.evolveKernels(
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
        { stage: 'EVOLVING_KERNELS', status: 'started', attempt: 1 },
        { stage: 'EVOLVING_KERNELS', status: 'completed', attempt: 1 },
        { stage: 'EVALUATING_KERNELS', status: 'started', attempt: 1 },
        { stage: 'EVALUATING_KERNELS', status: 'completed', attempt: 1 },
      ]);
    });

    it('rejects fewer than 2 parent kernels', async () => {
      const service = createKernelEvolutionService({
        evolveKernels: jest.fn(),
        evaluateKernels: jest.fn(),
      });

      await expect(
        service.evolveKernels(createInput({ parentKernels: [createEvaluatedKernel(1)] })),
      ).rejects.toThrow('Select 2-3 parent kernels');
    });

    it('rejects more than 3 parent kernels', async () => {
      const service = createKernelEvolutionService({
        evolveKernels: jest.fn(),
        evaluateKernels: jest.fn(),
      });

      await expect(
        service.evolveKernels(
          createInput({
            parentKernels: [
              createEvaluatedKernel(1),
              createEvaluatedKernel(2),
              createEvaluatedKernel(3),
              createEvaluatedKernel(4),
            ],
          }),
        ),
      ).rejects.toThrow('Select 2-3 parent kernels');
    });

    it('accepts exactly 3 parent kernels', async () => {
      const service = createKernelEvolutionService({
        evolveKernels: jest.fn().mockResolvedValue({
          kernels: Array.from({ length: 6 }, (_, index) => createKernel(index + 1)),
          rawResponse: 'raw-evolution',
        }),
        evaluateKernels: jest.fn().mockResolvedValue({
          scoredKernels: [],
          evaluatedKernels: [createEvaluatedKernel(1)],
          rawResponse: 'raw-evaluation',
        }),
      });

      await expect(
        service.evolveKernels(
          createInput({
            parentKernels: [
              createEvaluatedKernel(1),
              createEvaluatedKernel(2),
              createEvaluatedKernel(3),
            ],
          }),
        ),
      ).resolves.toBeDefined();
    });

    it('rejects missing or short api keys', async () => {
      const service = createKernelEvolutionService({
        evolveKernels: jest.fn(),
        evaluateKernels: jest.fn(),
      });

      await expect(
        service.evolveKernels(createInput({ apiKey: ' short ' })),
      ).rejects.toThrow('OpenRouter API key is required');
    });

    it('propagates evolver errors', async () => {
      const llmError = new LLMError('Evolver failed', 'HTTP_429', true);
      const evaluateKernels = jest.fn();
      const service = createKernelEvolutionService({
        evolveKernels: jest.fn().mockRejectedValue(llmError),
        evaluateKernels,
      });

      await expect(service.evolveKernels(createInput())).rejects.toBe(llmError);
      expect(evaluateKernels).not.toHaveBeenCalled();
    });

    it('propagates evaluator errors (fail-fast invariant)', async () => {
      const llmError = new LLMError('Evaluator failed', 'STRUCTURE_PARSE_ERROR', true);
      const service = createKernelEvolutionService({
        evolveKernels: jest.fn().mockResolvedValue({
          kernels: Array.from({ length: 6 }, (_, index) => createKernel(index + 1)),
          rawResponse: 'raw-evolution',
        }),
        evaluateKernels: jest.fn().mockRejectedValue(llmError),
      });

      await expect(service.evolveKernels(createInput())).rejects.toBe(llmError);
    });
  });
});
