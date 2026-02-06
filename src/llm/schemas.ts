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
            'Array of 2-5 meaningful choices. Use an empty array only for a story ending.',
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
          type: 'object',
          additionalProperties: {
            type: 'array',
            items: { type: 'string' },
          },
          description:
            'New permanent CHARACTER facts keyed by character name. Include fixed information unlikely to change: roles, relationships, defining traits. Example: {"Dr. Cohen": ["Dr. Cohen is the head psychiatrist"]}. For facts involving multiple characters, add an entry to EACH character.',
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
    characterCanonFacts: z.record(z.string(), z.array(z.string())).optional().default({}),
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
  return (
    normalized.includes('response_format') ||
    normalized.includes('json_schema') ||
    normalized.includes('structured output') ||
    normalized.includes('not supported')
  );
}
