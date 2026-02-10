import { z } from 'zod';
import { ChoiceType, PrimaryDelta } from '../../models/choice-enums.js';

const CharacterCanonFactsArraySchema = z.array(
  z.object({
    characterName: z.string(),
    facts: z.array(z.string()),
  }),
);

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

const CharacterStateChangesArraySchema = z.array(
  z.object({
    characterName: z.string(),
    states: z.array(z.string()),
  }),
);

const EmotionIntensitySchema = z.enum(['mild', 'moderate', 'strong', 'overwhelming']);

const SecondaryEmotionSchema = z.object({
  emotion: z.string().min(1, 'Secondary emotion must not be empty'),
  cause: z.string().min(1, 'Secondary emotion cause must not be empty'),
});

const ProtagonistAffectSchema = z.object({
  primaryEmotion: z.string().min(1, 'Primary emotion must not be empty'),
  primaryIntensity: EmotionIntensitySchema,
  primaryCause: z.string().min(1, 'Primary cause must not be empty'),
  secondaryEmotions: z.array(SecondaryEmotionSchema).optional().default([]),
  dominantMotivation: z.string().min(1, 'Dominant motivation must not be empty'),
});

const defaultProtagonistAffect = {
  primaryEmotion: 'neutral',
  primaryIntensity: 'mild' as const,
  primaryCause: 'No specific emotional driver',
  secondaryEmotions: [],
  dominantMotivation: 'Continue forward',
};

const ChoiceObjectSchema = z.object({
  text: z
    .string()
    .min(3, 'Choice text must be at least 3 characters')
    .max(300, 'Choice text must be at most 300 characters'),
  choiceType: z.nativeEnum(ChoiceType),
  primaryDelta: z.nativeEnum(PrimaryDelta),
});

export const WriterResultSchema = z
  .object({
    narrative: z
      .string()
      .min(50, 'Narrative must be at least 50 characters')
      .max(15000, 'Narrative must be at most 15000 characters'),
    choices: z.array(ChoiceObjectSchema),
    currentLocation: z.string().optional().default(''),
    threatsAdded: z.array(z.string()).optional().default([]),
    threatsRemoved: z.array(z.string()).optional().default([]),
    constraintsAdded: z.array(z.string()).optional().default([]),
    constraintsRemoved: z.array(z.string()).optional().default([]),
    threadsAdded: z.array(z.string()).optional().default([]),
    threadsResolved: z.array(z.string()).optional().default([]),
    newCanonFacts: z.array(z.string()),
    newCharacterCanonFacts: CharacterCanonFactsArraySchema.optional()
      .default([])
      .transform(transformCharacterCanonFactsToRecord),
    inventoryAdded: z.array(z.string()).optional().default([]),
    inventoryRemoved: z.array(z.string()).optional().default([]),
    healthAdded: z.array(z.string()).optional().default([]),
    healthRemoved: z.array(z.string()).optional().default([]),
    characterStateChangesAdded: CharacterStateChangesArraySchema.optional().default([]),
    characterStateChangesRemoved: z.array(z.string()).optional().default([]),
    protagonistAffect: ProtagonistAffectSchema.optional().default(defaultProtagonistAffect),
    sceneSummary: z.string().min(20).max(500),
    isEnding: z.boolean(),
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

    const normalizedChoices = data.choices.map(choice => choice.text.toLowerCase().trim());
    if (new Set(normalizedChoices).size !== normalizedChoices.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Choices must be unique (case-insensitive)',
        path: ['choices'],
      });
    }

    if (data.choices.length >= 2) {
      const types = new Set(data.choices.map(c => c.choiceType));
      const deltas = new Set(data.choices.map(c => c.primaryDelta));
      if (types.size === 1 && deltas.size === 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'All choices share the same choiceType and primaryDelta - consider diversifying',
          path: ['choices'],
        });
      }
    }
  });

export type ValidatedWriterResult = z.infer<typeof WriterResultSchema>;
