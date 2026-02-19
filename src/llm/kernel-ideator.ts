import { isStoryKernel, type KernelIdeationResult, type KernelIdeatorContext } from '../models/index.js';
import { runLlmStage } from './llm-stage-runner.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import { buildKernelIdeatorPrompt } from './prompts/kernel-ideator-prompt.js';
import { KERNEL_IDEATION_SCHEMA } from './schemas/kernel-ideator-schema.js';

export function parseKernelIdeationResponse(parsed: unknown): KernelIdeationResult['kernels'] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Kernel ideation response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data['kernels'])) {
    throw new LLMError(
      'Kernel ideation response missing kernels array',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  if (data['kernels'].length < 6 || data['kernels'].length > 8) {
    throw new LLMError(
      `Kernel ideation response must include 6-8 kernels (received: ${data['kernels'].length})`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return data['kernels'].map((kernel, index) => {
    if (!isStoryKernel(kernel)) {
      throw new LLMError(
        `Kernel ideation response includes invalid kernel at index ${index}`,
        'STRUCTURE_PARSE_ERROR',
        true,
      );
    }

    return kernel;
  });
}

export async function generateKernels(
  context: KernelIdeatorContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<KernelIdeationResult> {
  const messages = buildKernelIdeatorPrompt(context);

  const result = await runLlmStage({
    stageModel: 'kernelIdeator',
    promptType: 'kernelIdeator',
    apiKey,
    options,
    schema: KERNEL_IDEATION_SCHEMA,
    messages,
    parseResponse: parseKernelIdeationResponse,
  });

  return {
    kernels: result.parsed,
    rawResponse: result.rawResponse,
  };
}
