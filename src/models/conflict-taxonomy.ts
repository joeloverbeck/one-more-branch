export const CONFLICT_AXES = [
  'INDIVIDUAL_VS_SYSTEM',
  'TRUTH_VS_STABILITY',
  'DUTY_VS_DESIRE',
  'FREEDOM_VS_SAFETY',
  'KNOWLEDGE_VS_INNOCENCE',
  'POWER_VS_MORALITY',
  'LOYALTY_VS_SURVIVAL',
  'IDENTITY_VS_BELONGING',
] as const;

export type ConflictAxis = (typeof CONFLICT_AXES)[number];

export const CONFLICT_TYPE_VALUES = [
  'PERSON_VS_PERSON',
  'PERSON_VS_SELF',
  'PERSON_VS_SOCIETY',
  'PERSON_VS_NATURE',
  'PERSON_VS_TECHNOLOGY',
  'PERSON_VS_SUPERNATURAL',
  'PERSON_VS_FATE',
] as const;

export type ConflictType = (typeof CONFLICT_TYPE_VALUES)[number];

export function isConflictAxis(value: unknown): value is ConflictAxis {
  return typeof value === 'string' && (CONFLICT_AXES as readonly string[]).includes(value);
}

export function isConflictType(value: unknown): value is ConflictType {
  return typeof value === 'string' && (CONFLICT_TYPE_VALUES as readonly string[]).includes(value);
}
