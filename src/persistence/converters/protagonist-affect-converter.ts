/**
 * Converts ProtagonistAffect between domain model and file format.
 * Includes backward compatibility for pages created before protagonistAffect was added.
 */

import { ProtagonistAffect, createDefaultProtagonistAffect } from '../../models';
import { ProtagonistAffectFileData } from '../page-serializer-types';

export function protagonistAffectToFileData(
  affect: ProtagonistAffect
): ProtagonistAffectFileData {
  return {
    primaryEmotion: affect.primaryEmotion,
    primaryIntensity: affect.primaryIntensity,
    primaryCause: affect.primaryCause,
    secondaryEmotions: affect.secondaryEmotions.map((se) => ({
      emotion: se.emotion,
      cause: se.cause,
    })),
    dominantMotivation: affect.dominantMotivation,
  };
}

export function fileDataToProtagonistAffect(
  data: ProtagonistAffectFileData | undefined
): ProtagonistAffect {
  // Backward compatibility: pages without protagonistAffect get default values
  if (!data) {
    return createDefaultProtagonistAffect();
  }

  return {
    primaryEmotion: data.primaryEmotion,
    primaryIntensity: data.primaryIntensity,
    primaryCause: data.primaryCause,
    secondaryEmotions: data.secondaryEmotions.map((se) => ({
      emotion: se.emotion,
      cause: se.cause,
    })),
    dominantMotivation: data.dominantMotivation,
  };
}
