import { z } from 'zod';
import { ChoiceType, PrimaryDelta } from '../../models/choice-enums.js';

const ChoiceObjectSchema = z.object({
  text: z
    .string()
    .min(3, 'Choice text must be at least 3 characters')
    .max(500, 'Choice text must be at most 500 characters'),
  choiceType: z.nativeEnum(ChoiceType),
  primaryDelta: z.nativeEnum(PrimaryDelta),
});

export const ChoiceGeneratorResultSchema = z
  .object({
    choices: z.array(ChoiceObjectSchema),
  })
  .superRefine((data, ctx) => {
    if (data.choices.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Must have at least 2 choices',
        path: ['choices'],
      });
    }

    if (data.choices.length > 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Must have at most 5 choices',
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
  });

export type ValidatedChoiceGeneratorResult = z.infer<typeof ChoiceGeneratorResultSchema>;
