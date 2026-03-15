import type { LLMError } from '../../llm/llm-client-types.js';
import { logger } from '../../logging/index.js';
import { type ConceptSpec, isConceptSpec } from '../../models/index.js';
import type { ConceptVerification } from '../../models/concept-generator.js';
import type { StoryKernel } from '../../models/story-kernel.js';
import { isStoryKernel } from '../../models/story-kernel.js';

export type StoryFormInput = {
  title?: string;
  characterConcept?: string;
  worldbuilding?: string;
  tone?: string;
  protagonistCharacterId?: string;
  npcCharacterIds?: string[];
  startingSituation?: string;
  conceptSpec?: unknown;
  storyKernel?: unknown;
  conceptVerification?: ConceptVerification;
  apiKey?: string;
};

export type TrimmedStoryInput = {
  title: string;
  characterConcept: string;
  worldbuilding?: string;
  tone?: string;
  protagonistCharacterId?: string;
  npcCharacterIds?: string[];
  startingSituation?: string;
  conceptSpec?: ConceptSpec;
  storyKernel?: StoryKernel;
  conceptVerification?: ConceptVerification;
  apiKey: string;
};

export type ValidationResult =
  | { valid: true; trimmed: TrimmedStoryInput }
  | { valid: false; error: string };

/**
 * Validates story creation form input.
 * Returns either a valid result with trimmed values or an error message.
 */
export function validateStoryInput(input: StoryFormInput): ValidationResult {
  const trimmedTitle = input.title?.trim();
  const trimmedCharacterConcept = input.characterConcept?.trim();
  const trimmedApiKey = input.apiKey?.trim();

  if (!trimmedTitle || trimmedTitle.length === 0) {
    return { valid: false, error: 'Story title is required' };
  }

  if (!trimmedCharacterConcept || trimmedCharacterConcept.length < 10) {
    return { valid: false, error: 'Character concept must be at least 10 characters' };
  }

  if (!trimmedApiKey || trimmedApiKey.length < 10) {
    return { valid: false, error: 'OpenRouter API key is required' };
  }

  const conceptSpec = isConceptSpec(input.conceptSpec) ? input.conceptSpec : undefined;
  const storyKernel = isStoryKernel(input.storyKernel) ? input.storyKernel : undefined;

  if (!storyKernel) {
    return { valid: false, error: 'A story kernel is required' };
  }

  return {
    valid: true,
    trimmed: {
      title: trimmedTitle,
      characterConcept: trimmedCharacterConcept,
      worldbuilding: input.worldbuilding?.trim(),
      tone: input.tone?.trim(),
      ...(input.protagonistCharacterId ? { protagonistCharacterId: input.protagonistCharacterId } : {}),
      ...(input.npcCharacterIds && input.npcCharacterIds.length > 0
        ? { npcCharacterIds: input.npcCharacterIds }
        : {}),
      startingSituation: input.startingSituation?.trim(),
      ...(conceptSpec !== undefined ? { conceptSpec } : {}),
      ...(storyKernel !== undefined ? { storyKernel } : {}),
      ...(input.conceptVerification ? { conceptVerification: input.conceptVerification } : {}),
      apiKey: trimmedApiKey,
    },
  };
}

/**
 * Logs LLMError details for debugging purposes.
 */
export function logLLMError(error: LLMError, context: string): void {
  logger.error(`LLM error ${context}:`, {
    message: error.message,
    code: error.code,
    retryable: error.retryable,
    httpStatus: error.context?.['httpStatus'],
    model: error.context?.['model'],
    parsedError: error.context?.['parsedError'],
    rawErrorBody: error.context?.['rawErrorBody'],
  });
}
