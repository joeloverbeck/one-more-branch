import { z } from 'zod';

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

// Schema for character state changes (add/remove pattern for branch-isolated state)
const CharacterStateChangesArraySchema = z.array(
  z.object({
    characterName: z.string(),
    states: z.array(z.string()),
  }),
);

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
    stateChangesAdded: z.array(z.string()).optional().default([]),
    stateChangesRemoved: z
      .array(z.string())
      .optional()
      .default([])
      .refine(
        removed => removed.every(r => r.trim().length === 0 || r.trim().length > 0),
        { message: 'State removal entries must be valid strings' }
      ),
    newCanonFacts: z.array(z.string()),
    // Accept array format from LLM (per JSON schema), transform to Record for internal use
    newCharacterCanonFacts: CharacterCanonFactsArraySchema.optional()
      .default([])
      .transform(transformCharacterCanonFactsToRecord),
    inventoryAdded: z.array(z.string()).optional().default([]),
    inventoryRemoved: z.array(z.string()).optional().default([]),
    healthAdded: z.array(z.string()).optional().default([]),
    healthRemoved: z.array(z.string()).optional().default([]),
    characterStateChangesAdded: CharacterStateChangesArraySchema.optional().default([]),
    characterStateChangesRemoved: CharacterStateChangesArraySchema.optional().default([]),
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
