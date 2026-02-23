import type { ConceptSpec, EvaluatedConcept } from '../models/concept-generator.js';
import { isSavedConcept, type SavedConcept } from '../models/saved-concept.js';

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function withLegacyConceptDefaults(value: unknown): unknown {
  if (!isObjectRecord(value)) {
    return value;
  }

  const concept = value as Record<keyof ConceptSpec, unknown>;
  const incitingDisruption =
    concept.incitingDisruption ??
    (isNonEmptyString(concept.coreConflictLoop)
      ? concept.coreConflictLoop
      : 'A destabilizing event forces immediate action.');
  const escapeValve =
    concept.escapeValve ??
    (isNonEmptyString(concept.whatIfQuestion)
      ? concept.whatIfQuestion
      : 'A costly alternative remains available if pressure becomes intolerable.');

  return {
    ...concept,
    incitingDisruption,
    escapeValve,
  };
}

function withLegacyEvaluatedConceptDefaults(value: unknown): unknown {
  if (!isObjectRecord(value)) {
    return value;
  }

  const evaluated = value as Record<keyof EvaluatedConcept, unknown>;
  return {
    ...evaluated,
    concept: withLegacyConceptDefaults(evaluated.concept),
  };
}

function withSavedConceptLegacyDefaults(value: unknown): unknown {
  if (!isObjectRecord(value)) {
    return value;
  }

  const concept = value as Record<keyof SavedConcept, unknown>;
  return {
    ...concept,
    evaluatedConcept: withLegacyEvaluatedConceptDefaults(concept.evaluatedConcept),
    preHardenedConcept:
      concept.preHardenedConcept === undefined
        ? undefined
        : withLegacyEvaluatedConceptDefaults(concept.preHardenedConcept),
  };
}

export function parseSavedConcept(value: unknown, sourcePath: string): SavedConcept {
  if (isSavedConcept(value)) {
    return value;
  }

  const migrated = withSavedConceptLegacyDefaults(value);
  if (isSavedConcept(migrated)) {
    return migrated;
  }

  throw new Error(`Invalid SavedConcept payload at ${sourcePath}`);
}
