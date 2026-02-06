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
          description: 'Events that happened in this scene only.',
        },
        canonFacts: {
          type: 'array',
          items: { type: 'string' },
          description: 'New permanent world facts that should persist.',
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
      required: ['narrative', 'choices', 'stateChanges', 'canonFacts', 'isEnding'],
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

  return {
    narrative: validated.narrative.trim(),
    choices: validated.choices.map(choice => choice.trim()),
    stateChanges: validated.stateChanges.map(change => change.trim()).filter(change => change),
    canonFacts: validated.canonFacts.map(fact => fact.trim()).filter(fact => fact),
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
