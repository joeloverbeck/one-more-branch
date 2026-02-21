import type { KernelEvolutionResult, KernelEvolverContext, StoryKernel } from '../models/index.js';
import { isStoryKernel } from '../models/index.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import { runLlmStage } from './llm-stage-runner.js';
import { buildKernelEvolverPrompt } from './prompts/kernel-evolver-prompt.js';
import { KERNEL_EVOLUTION_SCHEMA } from './schemas/kernel-evolver-schema.js';

export function parseKernelEvolutionResponse(parsed: unknown): readonly StoryKernel[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Kernel evolution response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data['kernels'])) {
    throw new LLMError(
      'Kernel evolution response missing kernels array',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  if (data['kernels'].length !== 6) {
    throw new LLMError(
      `Kernel evolution response must include exactly 6 kernels (received: ${data['kernels'].length})`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const kernels: StoryKernel[] = [];
  for (let i = 0; i < data['kernels'].length; i++) {
    const item = data['kernels'][i];
    if (!isStoryKernel(item)) {
      throw new LLMError(
        `Kernel evolution response item ${i + 1} is not a valid StoryKernel`,
        'STRUCTURE_PARSE_ERROR',
        true,
      );
    }
    kernels.push(item);
  }

  const valueAtStakeSet = new Set<string>();
  for (const kernel of kernels) {
    const normalized = kernel.valueAtStake.toLowerCase().trim();
    if (valueAtStakeSet.has(normalized)) {
      throw new LLMError(
        `Kernel evolution response contains duplicate valueAtStake: ${kernel.valueAtStake}`,
        'STRUCTURE_PARSE_ERROR',
        true,
      );
    }
    valueAtStakeSet.add(normalized);
  }

  const opposingForceSet = new Set<string>();
  for (const kernel of kernels) {
    const normalized = kernel.opposingForce.toLowerCase().trim();
    if (opposingForceSet.has(normalized)) {
      throw new LLMError(
        `Kernel evolution response contains duplicate opposingForce: ${kernel.opposingForce}`,
        'STRUCTURE_PARSE_ERROR',
        true,
      );
    }
    opposingForceSet.add(normalized);
  }

  const directionSet = new Set<string>();
  for (const kernel of kernels) {
    directionSet.add(kernel.directionOfChange);
  }
  if (directionSet.size < 3) {
    throw new LLMError(
      `Kernel evolution response must use at least 3 distinct directionOfChange values (found: ${directionSet.size})`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return kernels;
}

export async function evolveKernels(
  context: KernelEvolverContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<KernelEvolutionResult> {
  const messages = buildKernelEvolverPrompt(context);
  const result = await runLlmStage({
    stageModel: 'kernelEvolver',
    promptType: 'kernelEvolver',
    apiKey,
    options,
    schema: KERNEL_EVOLUTION_SCHEMA,
    messages,
    parseResponse: parseKernelEvolutionResponse,
  });

  return {
    kernels: result.parsed,
    rawResponse: result.rawResponse,
  };
}
