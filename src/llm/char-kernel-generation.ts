import {
  buildCharKernelPrompt,
  type CharacterDevPromptContext,
} from './prompts/char-kernel-prompt.js';
import { CHAR_KERNEL_GENERATION_SCHEMA } from './schemas/char-kernel-schema.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import type { CharacterKernel } from '../models/character-pipeline-types.js';
import { runLlmStage } from './llm-stage-runner.js';

export interface CharKernelGenerationResult {
  readonly characterKernel: CharacterKernel;
  readonly rawResponse: string;
}

function parseCharKernelResponse(parsed: unknown): CharacterKernel {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Character kernel response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;

  if (typeof data['characterName'] !== 'string' || data['characterName'].trim().length === 0) {
    throw new LLMError(
      'Character kernel response missing characterName',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['superObjective'] !== 'string' || data['superObjective'].trim().length === 0) {
    throw new LLMError(
      'Character kernel response missing superObjective',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (
    !Array.isArray(data['immediateObjectives']) ||
    data['immediateObjectives'].length === 0
  ) {
    throw new LLMError(
      'Character kernel response missing or empty immediateObjectives',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (
    typeof data['primaryOpposition'] !== 'string' ||
    data['primaryOpposition'].trim().length === 0
  ) {
    throw new LLMError(
      'Character kernel response missing primaryOpposition',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!Array.isArray(data['stakes']) || data['stakes'].length === 0) {
    throw new LLMError(
      'Character kernel response missing or empty stakes',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!Array.isArray(data['constraints']) || data['constraints'].length === 0) {
    throw new LLMError(
      'Character kernel response missing or empty constraints',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['pressurePoint'] !== 'string' || data['pressurePoint'].trim().length === 0) {
    throw new LLMError(
      'Character kernel response missing pressurePoint',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const immediateObjectives = (data['immediateObjectives'] as unknown[])
    .filter((item): item is string => typeof item === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const stakes = (data['stakes'] as unknown[])
    .filter((item): item is string => typeof item === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const constraints = (data['constraints'] as unknown[])
    .filter((item): item is string => typeof item === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return {
    characterName: data['characterName'].trim(),
    superObjective: data['superObjective'].trim(),
    immediateObjectives,
    primaryOpposition: data['primaryOpposition'].trim(),
    stakes,
    constraints,
    pressurePoint: data['pressurePoint'].trim(),
  };
}

export async function generateCharKernel(
  context: CharacterDevPromptContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<CharKernelGenerationResult> {
  const messages = buildCharKernelPrompt(context);
  const result = await runLlmStage({
    stageModel: 'charKernel',
    promptType: 'charKernel',
    apiKey,
    options,
    schema: CHAR_KERNEL_GENERATION_SCHEMA,
    messages,
    parseResponse: parseCharKernelResponse,
  });

  return {
    characterKernel: result.parsed,
    rawResponse: result.rawResponse,
  };
}
