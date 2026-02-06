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
            'Array of 2-4 meaningful choices. INVARIANT: 2-4 choices if isEnding=false; exactly 0 if isEnding=true. Typically 3 choices; add a 4th only when truly warranted.',
        },
        stateChanges: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Events and CONDITIONS that happened in this scene only. Use for status changes, relationships, emotional states - NOT for items gained or lost (use inventoryAdded/inventoryRemoved for physical objects). Use second person for player actions (e.g., "You were wounded...", "You befriended..."). Identify other characters by name.',
        },
        newCanonFacts: {
          type: 'array',
          items: { type: 'string' },
          description:
            'NEW permanent WORLD facts introduced IN THIS SCENE ONLY. For world-building facts like place names, historical events, institutional rules. Do NOT include: character-specific facts (use newCharacterCanonFacts), or items the protagonist possesses (use inventoryAdded/inventoryRemoved).',
        },
        newCharacterCanonFacts: {
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
            'NEW character-specific facts introduced IN THIS SCENE ONLY. For persistent character traits, relationships, backgrounds. Do NOT include: items the protagonist possesses (use inventoryAdded/inventoryRemoved) or general world facts (use newCanonFacts).',
        },
        inventoryAdded: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Items the protagonist GAINED in this scene. Be specific (e.g., "Rusty iron key", "50 gold coins", "Leather satchel"). Empty array if nothing gained.',
        },
        inventoryRemoved: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Items the protagonist LOST, USED UP, or DISCARDED in this scene. Use the EXACT text of the existing inventory item. Empty array if nothing lost.',
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
      required: ['narrative', 'choices', 'stateChanges', 'newCanonFacts', 'newCharacterCanonFacts', 'inventoryAdded', 'inventoryRemoved', 'isEnding'],
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
    newCanonFacts: z.array(z.string()),
    // Accept array format from LLM (per JSON schema), transform to Record for internal use
    newCharacterCanonFacts: CharacterCanonFactsArraySchema.optional()
      .default([])
      .transform(transformCharacterCanonFactsToRecord),
    inventoryAdded: z.array(z.string()).optional().default([]),
    inventoryRemoved: z.array(z.string()).optional().default([]),
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

  // Process newCharacterCanonFacts: trim all values
  const newCharacterCanonFacts: Record<string, string[]> = {};
  for (const [name, facts] of Object.entries(validated.newCharacterCanonFacts)) {
    const trimmedFacts = facts.map(fact => fact.trim()).filter(fact => fact);
    if (trimmedFacts.length > 0) {
      newCharacterCanonFacts[name.trim()] = trimmedFacts;
    }
  }

  return {
    narrative: validated.narrative.trim(),
    choices: validated.choices.map(choice => choice.trim()),
    stateChanges: validated.stateChanges.map(change => change.trim()).filter(change => change),
    newCanonFacts: validated.newCanonFacts.map(fact => fact.trim()).filter(fact => fact),
    newCharacterCanonFacts,
    inventoryAdded: validated.inventoryAdded.map(item => item.trim()).filter(item => item),
    inventoryRemoved: validated.inventoryRemoved.map(item => item.trim()).filter(item => item),
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
