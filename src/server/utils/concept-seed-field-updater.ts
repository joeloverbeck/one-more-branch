import type { ConceptSeed } from '../../models/concept-seed.js';

const STRING_FIELDS = new Set([
  'name',
  'oneLineHook',
  'protagonistRole',
  'coreCompetence',
  'coreFlaw',
  'coreConflictLoop',
  'whatIfQuestion',
  'playerFantasy',
  'genreSubversion',
]);

const ARRAY_FIELDS = new Set([
  'actionVerbs',
  'settingAxioms',
  'constraintSet',
  'keyInstitutions',
]);

export function isEditableConceptSeedField(fieldPath: string): boolean {
  return STRING_FIELDS.has(fieldPath) || ARRAY_FIELDS.has(fieldPath);
}

export function validateConceptSeedFieldValue(fieldPath: string, value: unknown): string | null {
  if (STRING_FIELDS.has(fieldPath)) {
    if (typeof value !== 'string') {
      return `Expected string for field "${fieldPath}"`;
    }
    return null;
  }

  if (ARRAY_FIELDS.has(fieldPath)) {
    if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) {
      return `Expected string array for field "${fieldPath}"`;
    }
    return null;
  }

  return `Unknown field: "${fieldPath}"`;
}

export function applyConceptSeedFieldUpdate(
  seed: ConceptSeed,
  fieldPath: string,
  value: string | readonly string[]
): ConceptSeed {
  return { ...seed, [fieldPath]: value };
}
