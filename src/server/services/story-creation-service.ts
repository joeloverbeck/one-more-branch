import type { LLMError } from '../../llm/llm-client-types.js';
import { logger } from '../../logging/index.js';
import { type ConceptSpec, isConceptSpec } from '../../models/index.js';
import type { ConceptVerification } from '../../models/concept-generator.js';
import type { Npc } from '../../models/npc.js';
import type { StoryKernel } from '../../models/story-kernel.js';
import { isStoryKernel } from '../../models/story-kernel.js';

export type StoryFormInput = {
  title?: string;
  characterConcept?: string;
  worldbuilding?: string;
  tone?: string;
  npcs?: Array<{ name?: string; description?: string }>;
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
  npcs?: Npc[];
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

  if (input.conceptSpec !== undefined && !isConceptSpec(input.conceptSpec)) {
    return { valid: false, error: 'Concept payload is invalid' };
  }
  const conceptSpec = isConceptSpec(input.conceptSpec) ? input.conceptSpec : undefined;
  const storyKernel = isStoryKernel(input.storyKernel) ? input.storyKernel : undefined;

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
