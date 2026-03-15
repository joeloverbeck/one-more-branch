import {
  buildCharTridimensionalPrompt,
  type CharTridimensionalPromptContext,
} from './prompts/char-tridimensional-prompt.js';
import { CHAR_TRIDIMENSIONAL_GENERATION_SCHEMA } from './schemas/char-tridimensional-schema.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import type { TridimensionalProfile } from '../models/character-pipeline-types.js';
import { runLlmStage } from './llm-stage-runner.js';

export interface CharTridimensionalGenerationResult {
  readonly tridimensionalProfile: TridimensionalProfile;
  readonly rawResponse: string;
}

function parseCharTridimensionalResponse(parsed: unknown): TridimensionalProfile {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'Tridimensional profile response must be an object',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const data = parsed as Record<string, unknown>;

  if (typeof data['characterName'] !== 'string' || data['characterName'].trim().length === 0) {
    throw new LLMError(
      'Tridimensional profile response missing characterName',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['physiology'] !== 'string' || data['physiology'].trim().length === 0) {
    throw new LLMError(
      'Tridimensional profile response missing physiology',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['sociology'] !== 'string' || data['sociology'].trim().length === 0) {
    throw new LLMError(
      'Tridimensional profile response missing sociology',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['psychology'] !== 'string' || data['psychology'].trim().length === 0) {
    throw new LLMError(
      'Tridimensional profile response missing psychology',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!Array.isArray(data['coreTraits']) || data['coreTraits'].length === 0) {
    throw new LLMError(
      'Tridimensional profile response missing or empty coreTraits',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const coreTraits = (data['coreTraits'] as unknown[])
    .filter((item): item is string => typeof item === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (typeof data['formativeWound'] !== 'string' || data['formativeWound'].trim().length === 0) {
    throw new LLMError(
      'Tridimensional profile response missing formativeWound',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['protectiveMask'] !== 'string' || data['protectiveMask'].trim().length === 0) {
    throw new LLMError(
      'Tridimensional profile response missing protectiveMask',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['misbelief'] !== 'string' || data['misbelief'].trim().length === 0) {
    throw new LLMError(
      'Tridimensional profile response missing misbelief',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  return {
    characterName: data['characterName'].trim(),
    physiology: data['physiology'].trim(),
    sociology: data['sociology'].trim(),
    psychology: data['psychology'].trim(),
    coreTraits,
    formativeWound: data['formativeWound'].trim(),
    protectiveMask: data['protectiveMask'].trim(),
    misbelief: data['misbelief'].trim(),
  };
}

export async function generateCharTridimensional(
  context: CharTridimensionalPromptContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<CharTridimensionalGenerationResult> {
  const messages = buildCharTridimensionalPrompt(context);
  const result = await runLlmStage({
    stageModel: 'charTridimensional',
    promptType: 'charTridimensional',
    apiKey,
    options,
    schema: CHAR_TRIDIMENSIONAL_GENERATION_SCHEMA,
    messages,
    parseResponse: parseCharTridimensionalResponse,
  });

  return {
    tridimensionalProfile: result.parsed,
    rawResponse: result.rawResponse,
  };
}
