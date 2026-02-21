import { evolveKernels as runEvolveKernels } from '../../llm/kernel-evolver.js';
import { evaluateKernels as runEvaluateKernels } from '../../llm/kernel-evaluator.js';
import type { GenerationStageCallback } from '../../engine/types.js';
import type {
  EvaluatedKernel,
  KernelEvaluationResult,
  KernelEvolutionResult,
  ScoredKernel,
  StoryKernel,
} from '../../models/index.js';

export interface EvolveKernelsInput {
  readonly parentKernels: readonly EvaluatedKernel[];
  readonly apiKey: string;
  readonly onGenerationStage?: GenerationStageCallback;
}

export interface EvolveKernelsResult {
  readonly evolvedKernels: readonly StoryKernel[];
  readonly scoredKernels: readonly ScoredKernel[];
  readonly evaluatedKernels: readonly EvaluatedKernel[];
}

interface KernelEvolutionServiceDeps {
  readonly evolveKernels: typeof runEvolveKernels;
  readonly evaluateKernels: typeof runEvaluateKernels;
}

export interface KernelEvolutionService {
  evolveKernels(input: EvolveKernelsInput): Promise<EvolveKernelsResult>;
}

const defaultDeps: KernelEvolutionServiceDeps = {
  evolveKernels: runEvolveKernels,
  evaluateKernels: runEvaluateKernels,
};

function requireApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length < 10) {
    throw new Error('OpenRouter API key is required');
  }

  return trimmed;
}

function requireParentKernels(parentKernels: unknown): readonly EvaluatedKernel[] {
  if (!Array.isArray(parentKernels)) {
    throw new Error('Select 2-3 parent kernels');
  }

  if (parentKernels.length < 2 || parentKernels.length > 3) {
    throw new Error('Select 2-3 parent kernels');
  }

  return parentKernels as readonly EvaluatedKernel[];
}

export function createKernelEvolutionService(
  deps: KernelEvolutionServiceDeps = defaultDeps,
): KernelEvolutionService {
  return {
    async evolveKernels(input: EvolveKernelsInput): Promise<EvolveKernelsResult> {
      const apiKey = requireApiKey(input.apiKey);
      const parentKernels = requireParentKernels(input.parentKernels);
      const onGenerationStage = input.onGenerationStage;

      onGenerationStage?.({
        stage: 'EVOLVING_KERNELS',
        status: 'started',
        attempt: 1,
      });
      const evolution: KernelEvolutionResult = await deps.evolveKernels(
        { parentKernels },
        apiKey,
      );
      onGenerationStage?.({
        stage: 'EVOLVING_KERNELS',
        status: 'completed',
        attempt: 1,
      });

      onGenerationStage?.({
        stage: 'EVALUATING_KERNELS',
        status: 'started',
        attempt: 1,
      });
      const evaluation: KernelEvaluationResult = await deps.evaluateKernels(
        {
          kernels: evolution.kernels,
          userSeeds: { apiKey },
        },
        apiKey,
      );
      onGenerationStage?.({
        stage: 'EVALUATING_KERNELS',
        status: 'completed',
        attempt: 1,
      });

      return {
        evolvedKernels: evolution.kernels,
        scoredKernels: evaluation.scoredKernels,
        evaluatedKernels: evaluation.evaluatedKernels,
      };
    },
  };
}

export const kernelEvolutionService = createKernelEvolutionService();
