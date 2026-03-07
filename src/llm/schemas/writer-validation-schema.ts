import { z } from 'zod';
import {
  WRITER_DEFAULT_PROTAGONIST_AFFECT,
  WRITER_EMOTION_INTENSITY_ENUM,
} from '../writer-contract.js';

const EmotionIntensitySchema = z.enum(WRITER_EMOTION_INTENSITY_ENUM);

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

export const WriterResultSchema = z.object({
  narrative: z.string().min(50, 'Narrative must be at least 50 characters'),
  protagonistAffect: ProtagonistAffectSchema.optional().default(WRITER_DEFAULT_PROTAGONIST_AFFECT),
  sceneSummary: z.string().min(20),
});

export type ValidatedWriterResult = z.infer<typeof WriterResultSchema>;
