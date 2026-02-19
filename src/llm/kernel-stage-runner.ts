import type { GenerationStageCallback } from '../engine/types.js';
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

  onStage?.({
    stage: 'GENERATING_KERNELS',
    status: 'started',
    attempt: 1,
  });
  const ideation = await deps.generateKernels(seeds, apiKey);
  onStage?.({
    stage: 'GENERATING_KERNELS',
    status: 'completed',
    attempt: 1,
  });

  onStage?.({
    stage: 'EVALUATING_KERNELS',
    status: 'started',
    attempt: 1,
  });
  const evaluation: KernelEvaluationResult = await deps.evaluateKernels(
    {
      kernels: ideation.kernels,
      userSeeds: {
        ...seeds,
        apiKey,
      },
    },
    apiKey,
  );
  onStage?.({
    stage: 'EVALUATING_KERNELS',
    status: 'completed',
    attempt: 1,
  });

  return {
    ideatedKernels: ideation.kernels,
    scoredKernels: evaluation.scoredKernels,
    evaluatedKernels: evaluation.evaluatedKernels,
    rawIdeatorResponse: ideation.rawResponse,
    rawEvaluatorResponse: evaluation.rawResponse,
  };
}
