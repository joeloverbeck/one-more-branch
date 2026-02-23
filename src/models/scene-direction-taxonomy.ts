/**
 * Narrative taxonomy enums for scene direction selection.
 *
 * Three dimensions classify the dramatic intent of an upcoming scene:
 * - ScenePurpose: What dramatic function the scene serves (McKee/Truby)
 * - ValuePolarityShift: How values change within the scene (McKee)
 * - PacingMode: The rhythmic energy of the scene (Swain/Weiland)
 */

export type ScenePurpose =
  | 'EXPOSITION'
  | 'INCITING_INCIDENT'
  | 'RISING_COMPLICATION'
  | 'REVERSAL'
  | 'REVELATION'
  | 'CONFRONTATION'
  | 'NEGOTIATION'
  | 'INVESTIGATION'
  | 'PREPARATION'
  | 'ESCAPE'
  | 'PURSUIT'
  | 'SACRIFICE'
  | 'BETRAYAL'
  | 'REUNION'
  | 'TRANSFORMATION'
  | 'CLIMACTIC_CHOICE'
  | 'AFTERMATH';

export type ValuePolarityShift =
  | 'POSITIVE_TO_NEGATIVE'
  | 'NEGATIVE_TO_POSITIVE'
  | 'POSITIVE_TO_DOUBLE_NEGATIVE'
  | 'NEGATIVE_TO_DOUBLE_POSITIVE'
  | 'IRONIC_SHIFT';

export type PacingMode =
  | 'ACCELERATING'
  | 'DECELERATING'
  | 'SUSTAINED_HIGH'
  | 'OSCILLATING'
  | 'BUILDING_SLOW';

export const SCENE_PURPOSE_VALUES: readonly ScenePurpose[] = [
  'EXPOSITION',
  'INCITING_INCIDENT',
  'RISING_COMPLICATION',
  'REVERSAL',
  'REVELATION',
  'CONFRONTATION',
  'NEGOTIATION',
  'INVESTIGATION',
  'PREPARATION',
  'ESCAPE',
  'PURSUIT',
  'SACRIFICE',
  'BETRAYAL',
  'REUNION',
  'TRANSFORMATION',
  'CLIMACTIC_CHOICE',
  'AFTERMATH',
] as const;

export const VALUE_POLARITY_SHIFT_VALUES: readonly ValuePolarityShift[] = [
  'POSITIVE_TO_NEGATIVE',
  'NEGATIVE_TO_POSITIVE',
  'POSITIVE_TO_DOUBLE_NEGATIVE',
  'NEGATIVE_TO_DOUBLE_POSITIVE',
  'IRONIC_SHIFT',
] as const;

export const PACING_MODE_VALUES: readonly PacingMode[] = [
  'ACCELERATING',
  'DECELERATING',
  'SUSTAINED_HIGH',
  'OSCILLATING',
  'BUILDING_SLOW',
] as const;

export function isScenePurpose(value: unknown): value is ScenePurpose {
  return typeof value === 'string' && (SCENE_PURPOSE_VALUES as readonly string[]).includes(value);
}

export function isValuePolarityShift(value: unknown): value is ValuePolarityShift {
  return (
    typeof value === 'string' &&
    (VALUE_POLARITY_SHIFT_VALUES as readonly string[]).includes(value)
  );
}

export function isPacingMode(value: unknown): value is PacingMode {
  return typeof value === 'string' && (PACING_MODE_VALUES as readonly string[]).includes(value);
}

export const SCENE_PURPOSE_LABELS: Record<ScenePurpose, string> = {
  EXPOSITION: 'Exposition',
  INCITING_INCIDENT: 'Inciting Incident',
  RISING_COMPLICATION: 'Rising Complication',
  REVERSAL: 'Reversal',
  REVELATION: 'Revelation',
  CONFRONTATION: 'Confrontation',
  NEGOTIATION: 'Negotiation',
  INVESTIGATION: 'Investigation',
  PREPARATION: 'Preparation',
  ESCAPE: 'Escape',
  PURSUIT: 'Pursuit',
  SACRIFICE: 'Sacrifice',
  BETRAYAL: 'Betrayal',
  REUNION: 'Reunion',
  TRANSFORMATION: 'Transformation',
  CLIMACTIC_CHOICE: 'Climactic Choice',
  AFTERMATH: 'Aftermath',
};

export const VALUE_POLARITY_SHIFT_LABELS: Record<ValuePolarityShift, string> = {
  POSITIVE_TO_NEGATIVE: 'Positive to Negative',
  NEGATIVE_TO_POSITIVE: 'Negative to Positive',
  POSITIVE_TO_DOUBLE_NEGATIVE: 'Positive to Double Negative',
  NEGATIVE_TO_DOUBLE_POSITIVE: 'Negative to Double Positive',
  IRONIC_SHIFT: 'Ironic Shift',
};

export const PACING_MODE_LABELS: Record<PacingMode, string> = {
  ACCELERATING: 'Accelerating',
  DECELERATING: 'Decelerating',
  SUSTAINED_HIGH: 'Sustained High',
  OSCILLATING: 'Oscillating',
  BUILDING_SLOW: 'Building Slow',
};
