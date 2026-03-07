import type { PageWriterResult } from '../writer-types.js';
import { WriterResultSchema } from './writer-validation-schema.js';

export function validateWriterResponse(rawJson: unknown, rawResponse: string): PageWriterResult {
  const validated = WriterResultSchema.parse(rawJson);

  return {
    narrative: validated.narrative.trim(),
    protagonistAffect: {
      primaryEmotion: validated.protagonistAffect.primaryEmotion.trim(),
      primaryIntensity: validated.protagonistAffect.primaryIntensity,
      primaryCause: validated.protagonistAffect.primaryCause.trim(),
      secondaryEmotions: validated.protagonistAffect.secondaryEmotions.map((se) => ({
        emotion: se.emotion.trim(),
        cause: se.cause.trim(),
      })),
      dominantMotivation: validated.protagonistAffect.dominantMotivation.trim(),
    },
    sceneSummary: validated.sceneSummary.trim(),
    rawResponse,
  };
}
