import type { LLMError } from '../../llm/types.js';
import { logger } from '../../logging/index.js';

export type StoryFormInput = {
  title?: string;
  characterConcept?: string;
  worldbuilding?: string;
  tone?: string;
  apiKey?: string;
};

export type TrimmedStoryInput = {
  title: string;
  characterConcept: string;
  worldbuilding?: string;
  tone?: string;
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

  return {
    valid: true,
    trimmed: {
      title: trimmedTitle,
      characterConcept: trimmedCharacterConcept,
      worldbuilding: input.worldbuilding?.trim(),
      tone: input.tone?.trim(),
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
