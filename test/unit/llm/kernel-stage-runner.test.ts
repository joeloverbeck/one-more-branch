import { runKernelStage } from '../../../src/llm/kernel-stage-runner';
import type {
  EvaluatedKernel,
  KernelDimensionScores,
  ScoredKernel,
  StoryKernel,
} from '../../../src/models';

function createKernel(index: number): StoryKernel {
  return {
    dramaticThesis: `Thesis ${index}`,
    valueAtStake: `Value ${index}`,
    opposingForce: `Force ${index}`,
    directionOfChange: 'POSITIVE',
    thematicQuestion: `Question ${index}?`,
  };
}

function createScores(): KernelDimensionScores {
  return {
    dramaticClarity: 4,
    thematicUniversality: 3,
    generativePotential: 4,
    conflictTension: 4,
    emotionalDepth: 3,
  };
}

function createScoredKernel(kernel: StoryKernel): ScoredKernel {
  return {
    kernel,
    scores: createScores(),
    scoreEvidence: {
      dramaticClarity: ['Clear causal claim'],
      thematicUniversality: ['Broad human concern'],
      generativePotential: ['Supports multiple concepts'],
      conflictTension: ['Real opposition'],
      emotionalDepth: ['Emotional stakes'],
    },
    overallScore: 78,
  };
}

function createEvaluatedKernel(kernel: StoryKernel): EvaluatedKernel {
  return {
    kernel,
    scores: createScores(),
    overallScore: 78,
    strengths: ['Strong conflict', 'Clear value tension'],
    weaknesses: ['Could sharpen universality', 'Depth can be expanded'],
    tradeoffSummary: 'Strong dramatic engine with moderate thematic breadth.',
  };
}

describe('kernel-stage-runner', () => {
  it('runs ideator then evaluator and emits stage callbacks in order', async () => {
    const kernels = Array.from({ length: 6 }, (_, index) => createKernel(index + 1));
    const scoredKernels = kernels.map((kernel) => createScoredKernel(kernel));
    const evaluatedKernels = kernels.map((kernel) => createEvaluatedKernel(kernel));

    const generateKernels = jest.fn().mockResolvedValue({
      kernels,
      rawResponse: 'ideator raw',
    });
    const evaluateKernels = jest.fn().mockResolvedValue({
      scoredKernels,
      evaluatedKernels,
      rawResponse: 'evaluator raw',
    });

    const events: Array<{ stage: string; status: string; attempt: number }> = [];
    const result = await runKernelStage(
      {
        thematicInterests: ' trust and control ',
        emotionalCore: ' grief ',
        sparkLine: ' ',
        apiKey: 'test-api-key-123',
      },
      (event) => {
        events.push(event);
      },
      {
        generateKernels,
        evaluateKernels,
      },
    );

    expect(generateKernels).toHaveBeenCalledWith(
      {
        thematicInterests: 'trust and control',
        emotionalCore: 'grief',
        sparkLine: undefined,
      },
      'test-api-key-123',
    );
    expect(evaluateKernels).toHaveBeenCalledWith(
      {
        kernels,
        userSeeds: {
          thematicInterests: 'trust and control',
          emotionalCore: 'grief',
          sparkLine: undefined,
          apiKey: 'test-api-key-123',
        },
      },
      'test-api-key-123',
    );

    expect(events).toEqual([
      { stage: 'GENERATING_KERNELS', status: 'started', attempt: 1 },
      { stage: 'GENERATING_KERNELS', status: 'completed', attempt: 1 },
      { stage: 'EVALUATING_KERNELS', status: 'started', attempt: 1 },
      { stage: 'EVALUATING_KERNELS', status: 'completed', attempt: 1 },
    ]);

    expect(result).toEqual({
      ideatedKernels: kernels,
      scoredKernels,
      evaluatedKernels,
      rawIdeatorResponse: 'ideator raw',
      rawEvaluatorResponse: 'evaluator raw',
    });
  });

  it('throws for short api keys before invoking dependencies', async () => {
    const generateKernels = jest.fn();
    const evaluateKernels = jest.fn();

    await expect(
      runKernelStage(
        {
          apiKey: 'short',
        },
        undefined,
        {
          generateKernels,
          evaluateKernels,
        },
      ),
    ).rejects.toThrow('OpenRouter API key is required');

    expect(generateKernels).not.toHaveBeenCalled();
    expect(evaluateKernels).not.toHaveBeenCalled();
  });
});
