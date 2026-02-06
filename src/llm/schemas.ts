import { z } from 'zod';
import type { GenerationResult, JsonSchema } from './types.js';

export const STORY_GENERATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'story_generation',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        narrative: {
          type: 'string',
          description:
            'Vivid prose describing scene, action, dialogue, and outcomes. Minimum 100 words. Write in second person.',
        },
        choices: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Array of typically 3 meaningful choices (add a 4th only when truly warranted). Use an empty array only for a story ending.',
        },
        stateChanges: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Events that happened in this scene only. Use second person for player actions (e.g., "You discovered...", "You were wounded..."). Identify other characters by name (e.g., "Captain Mira was wounded").',
        },
        canonFacts: {
          type: 'array',
          items: { type: 'string' },
          description:
            'New permanent WORLD facts that apply globally. Examples: place names, historical events, institutional rules. Do NOT include character-specific facts here—use characterCanonFacts for those.',
        },
        characterCanonFacts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              characterName: { type: 'string' },
              facts: { type: 'array', items: { type: 'string' } },
            },
            required: ['characterName', 'facts'],
            additionalProperties: false,
          },
          description:
            'Array of character canon facts. Each entry has characterName and facts array. Example: [{"characterName": "Dr. Cohen", "facts": ["Dr. Cohen is the head psychiatrist"]}]. For facts involving multiple characters, add an entry for EACH character.',
        },
        isEnding: {
          type: 'boolean',
          description: 'True only when the story concludes and choices is empty.',
        },
        storyArc: {
          type: 'string',
          description: 'Main goal/conflict for the story opening page.',
        },
      },
      required: ['narrative', 'choices', 'stateChanges', 'canonFacts', 'characterCanonFacts', 'isEnding'],
      additionalProperties: false,
    },
  },
};

// Schema for the array format that OpenRouter returns
const CharacterCanonFactsArraySchema = z.array(
  z.object({
    characterName: z.string(),
    facts: z.array(z.string()),
  }),
);

// Transform array format to Record format for internal use
function transformCharacterCanonFactsToRecord(
  input: z.infer<typeof CharacterCanonFactsArraySchema>,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const entry of input) {
    const existing = result[entry.characterName] ?? [];
    result[entry.characterName] = [...existing, ...entry.facts];
  }
  return result;
}

export const GenerationResultSchema = z
  .object({
    narrative: z
      .string()
      .min(50, 'Narrative must be at least 50 characters')
      .max(15000, 'Narrative must be at most 15000 characters'),
    choices: z.array(
      z
        .string()
        .min(3, 'Choice must be at least 3 characters')
        .max(300, 'Choice must be at most 300 characters'),
    ),
    stateChanges: z.array(z.string()),
    canonFacts: z.array(z.string()),
    // Accept array format from LLM (per JSON schema), transform to Record for internal use
    characterCanonFacts: CharacterCanonFactsArraySchema.optional()
      .default([])
      .transform(transformCharacterCanonFactsToRecord),
    isEnding: z.boolean(),
    storyArc: z.string().optional().default(''),
  })
  .superRefine((data, ctx) => {
    if (data.isEnding && data.choices.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Endings must have zero choices',
        path: ['choices'],
      });
    }

    if (!data.isEnding && data.choices.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Non-endings must have at least 2 choices',
        path: ['choices'],
      });
    }

    if (!data.isEnding && data.choices.length > 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Non-endings must have at most 5 choices',
        path: ['choices'],
      });
    }

    const normalizedChoices = data.choices.map(choice => choice.toLowerCase().trim());
    if (new Set(normalizedChoices).size !== normalizedChoices.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Choices must be unique (case-insensitive)',
        path: ['choices'],
      });
    }
  });

export type ValidatedGenerationResult = z.infer<typeof GenerationResultSchema>;

export function validateGenerationResponse(
  rawJson: unknown,
  rawResponse: string,
): GenerationResult {
  const validated = GenerationResultSchema.parse(rawJson);
  const storyArc = validated.storyArc.trim();

  // Process characterCanonFacts: trim all values
  const characterCanonFacts: Record<string, string[]> = {};
  for (const [name, facts] of Object.entries(validated.characterCanonFacts)) {
    const trimmedFacts = facts.map(fact => fact.trim()).filter(fact => fact);
    if (trimmedFacts.length > 0) {
      characterCanonFacts[name.trim()] = trimmedFacts;
    }
  }

  return {
    narrative: validated.narrative.trim(),
    choices: validated.choices.map(choice => choice.trim()),
    stateChanges: validated.stateChanges.map(change => change.trim()).filter(change => change),
    canonFacts: validated.canonFacts.map(fact => fact.trim()).filter(fact => fact),
    characterCanonFacts,
    isEnding: validated.isEnding,
    storyArc: storyArc ? storyArc : undefined,
    rawResponse,
  };
}

/**
 * Determines if an error indicates that the model does not support structured outputs.
 * This function is intentionally conservative - it only triggers the fallback for errors
 * that specifically indicate the model/provider cannot handle response_format or json_schema.
 *
 * Validation errors (e.g., schema violations) should NOT trigger the fallback, as they
 * indicate the model supports structured output but the response failed validation.
 */
export function isStructuredOutputNotSupported(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();

  // Specific patterns that indicate lack of structured output support
  const unsupportedPatterns = [
    // Model explicitly doesn't support the feature
    'response_format is not supported',
    'json_schema is not supported',
    'structured output is not supported',
    'does not support response_format',
    'does not support json_schema',
    'does not support structured',
    // Provider-specific errors indicating feature unavailability
    'unsupported parameter: response_format',
    'unsupported parameter: json_schema',
    'invalid parameter: response_format',
    // OpenRouter specific
    'model does not support',
    'provider does not support',
  ];

  return unsupportedPatterns.some(pattern => normalized.includes(pattern));
}
