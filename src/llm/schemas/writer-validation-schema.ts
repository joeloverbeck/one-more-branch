import { z } from 'zod';
import { ChoiceType, PrimaryDelta } from '../../models/choice-enums.js';

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
    narrative: z.string().min(50, 'Narrative must be at least 50 characters'),
    choices: z.array(ChoiceObjectSchema),
    protagonistAffect: ProtagonistAffectSchema.optional().default(defaultProtagonistAffect),
    sceneSummary: z.string().min(20),
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

    const normalizedChoices = data.choices.map((choice) => choice.text.toLowerCase().trim());
    if (new Set(normalizedChoices).size !== normalizedChoices.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Choices must be unique (case-insensitive)',
        path: ['choices'],
      });
    }

    if (data.choices.length >= 2) {
      const types = new Set(data.choices.map((c) => c.choiceType));
      const deltas = new Set(data.choices.map((c) => c.primaryDelta));
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
