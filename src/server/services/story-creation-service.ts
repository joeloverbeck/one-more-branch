import type { LLMError } from '../../llm/llm-client-types.js';
import { logger } from '../../logging/index.js';
import type { Npc } from '../../models/npc.js';

export type StoryFormInput = {
  title?: string;
  characterConcept?: string;
  worldbuilding?: string;
  tone?: string;
  npcs?: Array<{ name?: string; description?: string }>;
  startingSituation?: string;
  apiKey?: string;
};

export type TrimmedStoryInput = {
  title: string;
  characterConcept: string;
  worldbuilding?: string;
  tone?: string;
  npcs?: Npc[];
  startingSituation?: string;
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

  const validNpcs = input.npcs
    ?.map((npc) => ({
      name: (npc.name ?? '').trim(),
      description: (npc.description ?? '').trim(),
    }))
    .filter((npc) => npc.name.length > 0 && npc.description.length > 0);

  return {
    valid: true,
    trimmed: {
      title: trimmedTitle,
      characterConcept: trimmedCharacterConcept,
      worldbuilding: input.worldbuilding?.trim(),
      tone: input.tone?.trim(),
      npcs: validNpcs && validNpcs.length > 0 ? validNpcs : undefined,
      startingSituation: input.startingSituation?.trim(),
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
