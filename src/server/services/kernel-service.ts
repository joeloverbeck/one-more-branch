import type { GenerationStageCallback } from '../../engine/types.js';
import type { EvaluatedKernel } from '../../models/index.js';
import { runKernelStage } from '../../llm/kernel-stage-runner.js';

export interface GenerateKernelsInput {
  readonly thematicInterests?: string;
  readonly emotionalCore?: string;
  readonly sparkLine?: string;
  readonly apiKey: string;
  readonly onGenerationStage?: GenerationStageCallback;
}

export interface GenerateKernelsResult {
  readonly evaluatedKernels: readonly EvaluatedKernel[];
}

interface KernelServiceDeps {
  readonly runKernelStage: typeof runKernelStage;
}

export interface KernelService {
  generateKernels(input: GenerateKernelsInput): Promise<GenerateKernelsResult>;
}

const defaultDeps: KernelServiceDeps = {
  runKernelStage,
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

export function createKernelService(deps: KernelServiceDeps = defaultDeps): KernelService {
  return {
    async generateKernels(input: GenerateKernelsInput): Promise<GenerateKernelsResult> {
      const apiKey = requireApiKey(input.apiKey);
      const result = await deps.runKernelStage(
        {
          thematicInterests: trimSeed(input.thematicInterests),
          emotionalCore: trimSeed(input.emotionalCore),
          sparkLine: trimSeed(input.sparkLine),
          apiKey,
        },
        input.onGenerationStage,
      );

      return {
        evaluatedKernels: result.evaluatedKernels,
      };
    },
  };
}

export const kernelService = createKernelService();
