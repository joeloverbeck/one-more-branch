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

// Schema for emotion intensity
const EmotionIntensitySchema = z.enum(['mild', 'moderate', 'strong', 'overwhelming']);

// Schema for secondary emotions
const SecondaryEmotionSchema = z.object({
  emotion: z.string().min(1, 'Secondary emotion must not be empty'),
  cause: z.string().min(1, 'Secondary emotion cause must not be empty'),
});

// Schema for protagonist affect - emotional state snapshot
const ProtagonistAffectSchema = z.object({
  primaryEmotion: z.string().min(1, 'Primary emotion must not be empty'),
  primaryIntensity: EmotionIntensitySchema,
  primaryCause: z.string().min(1, 'Primary cause must not be empty'),
  secondaryEmotions: z.array(SecondaryEmotionSchema).optional().default([]),
  dominantMotivation: z.string().min(1, 'Dominant motivation must not be empty'),
});

// Default protagonist affect when LLM doesn't provide one
const defaultProtagonistAffect = {
  primaryEmotion: 'neutral',
  primaryIntensity: 'mild' as const,
  primaryCause: 'No specific emotional driver',
  secondaryEmotions: [],
  dominantMotivation: 'Continue forward',
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
    // Active state fields (replaces stateChangesAdded/stateChangesRemoved)
    currentLocation: z.string().optional().default(''),
    threatsAdded: z.array(z.string()).optional().default([]),
    threatsRemoved: z.array(z.string()).optional().default([]),
    constraintsAdded: z.array(z.string()).optional().default([]),
    constraintsRemoved: z.array(z.string()).optional().default([]),
    threadsAdded: z.array(z.string()).optional().default([]),
    threadsResolved: z.array(z.string()).optional().default([]),
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
    protagonistAffect: ProtagonistAffectSchema.optional().default(defaultProtagonistAffect),
    isEnding: z.boolean(),
    beatConcluded: z.boolean().default(false),
    beatResolution: z.string().default(''),
    deviationDetected: z.boolean().default(false),
    deviationReason: z.string().default(''),
    invalidatedBeatIds: z.array(z.string()).optional().default([]),
    narrativeSummary: z.string().default(''),
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
