import type { GenerationStageCallback } from '../engine/types.js';
import { logger } from '../logging/index.js';
import {
  type EvaluatedKernel,
  type KernelEvaluationResult,
  type KernelSeedInput,
  type ScoredKernel,
  type StoryKernel,
} from '../models/index.js';
import { evaluateKernels } from './kernel-evaluator.js';
import { generateKernels } from './kernel-ideator.js';

export interface KernelStageResult {
  readonly ideatedKernels: readonly StoryKernel[];
  readonly scoredKernels: readonly ScoredKernel[];
  readonly evaluatedKernels: readonly EvaluatedKernel[];
  readonly rawIdeatorResponse: string;
  readonly rawEvaluatorResponse: string;
}

export interface KernelStageRunnerDeps {
  readonly generateKernels: typeof generateKernels;
  readonly evaluateKernels: typeof evaluateKernels;
}

const defaultDeps: KernelStageRunnerDeps = {
  generateKernels,
  evaluateKernels,
};

function trimSeed(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function requireApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length < 10) {
    throw new Error('OpenRouter API key is required');
  }

  return trimmed;
}

interface KernelStageExecutionContext {
  readonly stageEvent: 'GENERATING_KERNELS' | 'EVALUATING_KERNELS';
  readonly logStage: 'kernel-ideator' | 'kernel-evaluator';
  readonly onStage?: GenerationStageCallback;
}

async function executeKernelStage<T>(
  context: KernelStageExecutionContext,
  work: () => Promise<T>,
): Promise<T> {
  const attempt = 1;
  context.onStage?.({
    stage: context.stageEvent,
    status: 'started',
    attempt,
  });
  logger.info('Generation stage started', {
    flow: 'kernel-generation',
    stage: context.logStage,
    attempt,
  });

  const startTime = Date.now();
  try {
    const result = await work();
    logger.info('Generation stage completed', {
      flow: 'kernel-generation',
      stage: context.logStage,
      attempt,
      durationMs: Date.now() - startTime,
    });
    context.onStage?.({
      stage: context.stageEvent,
      status: 'completed',
      attempt,
    });
    return result;
  } catch (error) {
    logger.error('Generation stage failed', {
      flow: 'kernel-generation',
      stage: context.logStage,
      attempt,
      durationMs: Date.now() - startTime,
      error,
    });
    throw error;
  }
}

export async function runKernelStage(
  input: KernelSeedInput,
  onStage?: GenerationStageCallback,
  deps: KernelStageRunnerDeps = defaultDeps,
): Promise<KernelStageResult> {
  const apiKey = requireApiKey(input.apiKey);
  const seeds = {
    thematicInterests: trimSeed(input.thematicInterests),
    emotionalCore: trimSeed(input.emotionalCore),
    sparkLine: trimSeed(input.sparkLine),
  };

  const ideation = await executeKernelStage(
    {
      stageEvent: 'GENERATING_KERNELS',
      logStage: 'kernel-ideator',
      onStage,
    },
    () => deps.generateKernels(seeds, apiKey),
  );

  const evaluation: KernelEvaluationResult = await executeKernelStage(
    {
      stageEvent: 'EVALUATING_KERNELS',
      logStage: 'kernel-evaluator',
      onStage,
    },
    () =>
      deps.evaluateKernels(
        {
          kernels: ideation.kernels,
          userSeeds: {
            ...seeds,
            apiKey,
          },
        },
        apiKey,
      ),
  );

  return {
    ideatedKernels: ideation.kernels,
    scoredKernels: evaluation.scoredKernels,
    evaluatedKernels: evaluation.evaluatedKernels,
    rawIdeatorResponse: ideation.rawResponse,
    rawEvaluatorResponse: evaluation.rawResponse,
  };
}
