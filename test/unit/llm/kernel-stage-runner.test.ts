import { runKernelStage } from '../../../src/llm/kernel-stage-runner';
import { logger } from '../../../src/logging';
import type { LogEntry } from '../../../src/logging';
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
    antithesis: 'Counter-argument challenges the thesis.',
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
    passes: true,
  };
}

function createEvaluatedKernel(kernel: StoryKernel): EvaluatedKernel {
  return {
    kernel,
    scores: createScores(),
    overallScore: 78,
    passes: true,
    strengths: ['Strong conflict', 'Clear value tension'],
    weaknesses: ['Could sharpen universality', 'Depth can be expanded'],
    tradeoffSummary: 'Strong dramatic engine with moderate thematic breadth.',
  };
}

function findStageEntry(
  entries: LogEntry[],
  message: string,
  stage: string,
): LogEntry | undefined {
  return entries.find(
    (entry) =>
      entry.message === message &&
      typeof entry.context?.stage === 'string' &&
      entry.context.stage === stage,
  );
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

    const entries = logger.getEntries();
    const ideatorStart = findStageEntry(entries, 'Generation stage started', 'kernel-ideator');
    const ideatorComplete = findStageEntry(entries, 'Generation stage completed', 'kernel-ideator');
    const evaluatorStart = findStageEntry(entries, 'Generation stage started', 'kernel-evaluator');
    const evaluatorComplete = findStageEntry(entries, 'Generation stage completed', 'kernel-evaluator');

    expect(ideatorStart?.level).toBe('info');
    expect(ideatorStart?.context?.flow).toBe('kernel-generation');
    expect(ideatorStart?.context?.attempt).toBe(1);

    expect(ideatorComplete?.level).toBe('info');
    expect(ideatorComplete?.context?.flow).toBe('kernel-generation');
    expect(ideatorComplete?.context?.attempt).toBe(1);
    expect(typeof ideatorComplete?.context?.durationMs).toBe('number');

    expect(evaluatorStart?.level).toBe('info');
    expect(evaluatorStart?.context?.flow).toBe('kernel-generation');
    expect(evaluatorStart?.context?.attempt).toBe(1);

    expect(evaluatorComplete?.level).toBe('info');
    expect(evaluatorComplete?.context?.flow).toBe('kernel-generation');
    expect(evaluatorComplete?.context?.attempt).toBe(1);
    expect(typeof evaluatorComplete?.context?.durationMs).toBe('number');
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

  it('logs a failed stage when ideation throws', async () => {
    const error = new Error('ideation failed');
    const evaluateKernels = jest.fn();

    await expect(
      runKernelStage(
        {
          apiKey: 'test-api-key-123',
        },
        undefined,
        {
          generateKernels: jest.fn().mockRejectedValue(error),
          evaluateKernels,
        },
      ),
    ).rejects.toThrow('ideation failed');

    expect(evaluateKernels).not.toHaveBeenCalled();
    const failureEntry = findStageEntry(
      logger.getEntries(),
      'Generation stage failed',
      'kernel-ideator',
    );

    expect(failureEntry?.level).toBe('error');
    expect(failureEntry?.context?.flow).toBe('kernel-generation');
    expect(failureEntry?.context?.attempt).toBe(1);
    expect(typeof failureEntry?.context?.durationMs).toBe('number');
  });
});
