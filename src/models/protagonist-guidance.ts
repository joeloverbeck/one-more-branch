export interface ProtagonistGuidance {
  readonly suggestedEmotions?: string;
  readonly suggestedThoughts?: string;
  readonly suggestedSpeech?: string;
}

/**
 * Returns true if all guidance fields are absent or empty strings after trimming.
 */
export function isProtagonistGuidanceEmpty(
  guidance: ProtagonistGuidance | undefined
): boolean {
  if (!guidance) {
    return true;
  }

  return (
    (!guidance.suggestedEmotions || guidance.suggestedEmotions.trim().length === 0) &&
    (!guidance.suggestedThoughts || guidance.suggestedThoughts.trim().length === 0) &&
    (!guidance.suggestedSpeech || guidance.suggestedSpeech.trim().length === 0)
  );
}
