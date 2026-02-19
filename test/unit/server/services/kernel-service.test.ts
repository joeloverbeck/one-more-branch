import { LLMError } from '@/llm/llm-client-types';
import type { EvaluatedKernel, StoryKernel } from '@/models';
import { createKernelService, type GenerateKernelsInput } from '@/server/services/kernel-service';

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
    strengths: ['Strong thesis'],
    weaknesses: ['Needs more ambiguity'],
    tradeoffSummary: 'Strong conflict with moderate depth.',
  };
}

describe('kernel-service', () => {
  describe('generateKernels', () => {
    it('calls stage runner with normalized seeds and api key', async () => {
      const evaluatedKernels = [createEvaluatedKernel(1), createEvaluatedKernel(2)];
      const runKernelStage = jest.fn().mockResolvedValue({
        ideatedKernels: [],
        scoredKernels: [],
        evaluatedKernels,
        rawIdeatorResponse: 'raw-ideas',
        rawEvaluatorResponse: 'raw-eval',
      });
      const service = createKernelService({ runKernelStage });

      const input: GenerateKernelsInput = {
        thematicInterests: ' power ',
        emotionalCore: ' dread ',
        sparkLine: ' a loyal rival ',
        apiKey: '  valid-key-12345 ',
      };

      const result = await service.generateKernels(input);

      expect(runKernelStage).toHaveBeenCalledWith(
        {
          thematicInterests: 'power',
          emotionalCore: 'dread',
          sparkLine: 'a loyal rival',
          apiKey: 'valid-key-12345',
        },
        undefined,
      );
      expect(result).toEqual({ evaluatedKernels });
    });

    it('allows empty seeds and forwards undefined values', async () => {
      const runKernelStage = jest.fn().mockResolvedValue({
        ideatedKernels: [],
        scoredKernels: [],
        evaluatedKernels: [createEvaluatedKernel(1)],
        rawIdeatorResponse: 'raw-ideas',
        rawEvaluatorResponse: 'raw-eval',
      });
      const service = createKernelService({ runKernelStage });

      await service.generateKernels({
        thematicInterests: '  ',
        emotionalCore: '',
        sparkLine: undefined,
        apiKey: 'valid-key-12345',
      });

      expect(runKernelStage).toHaveBeenCalledWith(
        {
          thematicInterests: undefined,
          emotionalCore: undefined,
          sparkLine: undefined,
          apiKey: 'valid-key-12345',
        },
        undefined,
      );
    });

    it('passes through onGenerationStage callback', async () => {
      const runKernelStage = jest.fn().mockResolvedValue({
        ideatedKernels: [],
        scoredKernels: [],
        evaluatedKernels: [createEvaluatedKernel(1)],
        rawIdeatorResponse: 'raw-ideas',
        rawEvaluatorResponse: 'raw-eval',
      });
      const service = createKernelService({ runKernelStage });
      const onGenerationStage = jest.fn();

      await service.generateKernels({
        thematicInterests: 'trust',
        apiKey: 'valid-key-12345',
        onGenerationStage,
      });

      expect(runKernelStage).toHaveBeenCalledWith(
        {
          thematicInterests: 'trust',
          emotionalCore: undefined,
          sparkLine: undefined,
          apiKey: 'valid-key-12345',
        },
        onGenerationStage,
      );
    });

    it('rejects missing api key', async () => {
      const service = createKernelService({
        runKernelStage: jest.fn(),
      });

      await expect(
        service.generateKernels({
          thematicInterests: 'trust',
          apiKey: ' short ',
        }),
      ).rejects.toThrow('OpenRouter API key is required');
    });

    it('propagates LLMError from stage runner', async () => {
      const llmError = new LLMError('Rate limited', 'HTTP_429', true);
      const service = createKernelService({
        runKernelStage: jest.fn().mockRejectedValue(llmError),
      });

      await expect(
        service.generateKernels({
          thematicInterests: 'trust',
          apiKey: 'valid-key-12345',
        }),
      ).rejects.toBe(llmError);
    });
  });
});
