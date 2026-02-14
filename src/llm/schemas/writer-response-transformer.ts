import type { PageWriterResult } from '../writer-types.js';
import { WriterResultSchema } from './writer-validation-schema.js';

export function validateWriterResponse(rawJson: unknown, rawResponse: string): PageWriterResult {
  const validated = WriterResultSchema.parse(rawJson);

  return {
    narrative: validated.narrative.trim(),
    choices: validated.choices.map((choice) => ({
      text: choice.text.trim(),
      choiceType: choice.choiceType,
      primaryDelta: choice.primaryDelta,
    })),
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
    isEnding: validated.isEnding,
    sceneSummary: validated.sceneSummary.trim(),
    rawResponse,
  };
}
