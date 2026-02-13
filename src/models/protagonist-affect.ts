/**
 * Protagonist Affect System
 *
 * Tracks the protagonist's emotional state as a per-page snapshot.
 * Unlike stateChanges which accumulate, protagonistAffect is a complete
 * snapshot of how the protagonist feels at the END of each page.
 *
 * Key principle: Emotional state is a per-page snapshot, not an accumulated condition.
 */

/**
 * Intensity levels for emotions using semantic categories.
 * LLMs handle categorical values better than numerical scales.
 */
export type EmotionIntensity = 'mild' | 'moderate' | 'strong' | 'overwhelming';

/**
 * Represents a background emotion that colors the protagonist's state
 * but is not the primary driver of their behavior.
 */
export interface SecondaryEmotion {
  readonly emotion: string;
  readonly cause: string;
}

/**
 * Complete emotional state snapshot for the protagonist at the end of a page.
 *
 * This is NOT accumulated - each page has its own independent snapshot
 * reflecting how the protagonist feels after the events of that page.
 */
export interface ProtagonistAffect {
  /** The dominant feeling driving the protagonist's state (e.g., "fear", "attraction", "guilt") */
  readonly primaryEmotion: string;

  /** How intensely the protagonist feels the primary emotion */
  readonly primaryIntensity: EmotionIntensity;

  /** What's causing the primary emotion (brief, specific) */
  readonly primaryCause: string;

  /** Optional background feelings with their causes */
  readonly secondaryEmotions: readonly SecondaryEmotion[];

  /** What the protagonist most wants right now */
  readonly dominantMotivation: string;
}

/**
 * Type guard to validate EmotionIntensity values.
 */
export function isEmotionIntensity(value: unknown): value is EmotionIntensity {
  return value === 'mild' || value === 'moderate' || value === 'strong' || value === 'overwhelming';
}

/**
 * Type guard to validate SecondaryEmotion objects.
 */
export function isSecondaryEmotion(value: unknown): value is SecondaryEmotion {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj['emotion'] === 'string' && typeof obj['cause'] === 'string';
}

/**
 * Type guard to validate ProtagonistAffect objects.
 */
export function isProtagonistAffect(value: unknown): value is ProtagonistAffect {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['primaryEmotion'] === 'string' &&
    isEmotionIntensity(obj['primaryIntensity']) &&
    typeof obj['primaryCause'] === 'string' &&
    Array.isArray(obj['secondaryEmotions']) &&
    obj['secondaryEmotions'].every(isSecondaryEmotion) &&
    typeof obj['dominantMotivation'] === 'string'
  );
}

/**
 * Creates an empty/default protagonist affect for cases where
 * the LLM doesn't provide one in its response.
 */
export function createDefaultProtagonistAffect(): ProtagonistAffect {
  return {
    primaryEmotion: 'neutral',
    primaryIntensity: 'mild',
    primaryCause: 'No specific emotional driver',
    secondaryEmotions: [],
    dominantMotivation: 'Continue forward',
  };
}

/**
 * Formats a ProtagonistAffect object for display in prompts.
 * Used in continuation prompts to show the parent page's emotional state.
 */
export function formatProtagonistAffect(affect: ProtagonistAffect): string {
  const primaryLine = `Primary: ${affect.primaryEmotion.toUpperCase()} (${affect.primaryIntensity}) - ${affect.primaryCause}`;

  const secondaryLine =
    affect.secondaryEmotions.length > 0
      ? `Secondary: ${affect.secondaryEmotions
          .map((se) => `${se.emotion.toUpperCase()} - ${se.cause}`)
          .join('; ')}`
      : null;

  const motivationLine = `Motivation: ${affect.dominantMotivation}`;

  return [primaryLine, secondaryLine, motivationLine].filter(Boolean).join('\n');
}
