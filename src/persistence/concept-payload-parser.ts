import type { ConceptSpec, EvaluatedConcept } from '../models/concept-generator.js';
import { computeOverallScore, passesConceptThresholds } from '../models/concept-generator.js';
import type { ConceptDimensionScores } from '../models/concept-generator.js';
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

function stripBranchingFitness(value: unknown): unknown {
  if (!isObjectRecord(value)) {
    return value;
  }

  if (!('branchingFitness' in value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== 'branchingFitness'),
  );
}

function withLegacyScoreDefaults(value: unknown): unknown {
  if (!isObjectRecord(value)) {
    return value;
  }

  const rawScores = value['scores'];
  const hasBranchingFitnessInScores =
    isObjectRecord(rawScores) && 'branchingFitness' in rawScores;
  const rawEvidence = value['scoreEvidence'];
  const hasBranchingFitnessInEvidence =
    isObjectRecord(rawEvidence) && 'branchingFitness' in rawEvidence;

  if (!hasBranchingFitnessInScores && !hasBranchingFitnessInEvidence) {
    return value;
  }

  const migratedScores = stripBranchingFitness(rawScores);
  const migratedEvidence = stripBranchingFitness(rawEvidence);

  const result: Record<string, unknown> = {
    ...value,
    scores: migratedScores,
  };

  if (migratedEvidence !== undefined) {
    result['scoreEvidence'] = migratedEvidence;
  }

  if (isObjectRecord(migratedScores)) {
    const scores = migratedScores as unknown as ConceptDimensionScores;
    result['overallScore'] = computeOverallScore(scores);
    result['passes'] = passesConceptThresholds(scores);
  }

  return result;
}

function withLegacyEvaluatedConceptDefaults(value: unknown): unknown {
  if (!isObjectRecord(value)) {
    return value;
  }

  const evaluated = value as Record<keyof EvaluatedConcept, unknown>;
  return withLegacyScoreDefaults({
    ...evaluated,
    concept: withLegacyConceptDefaults(evaluated.concept),
  });
}

function withSavedConceptLegacyDefaults(value: unknown): unknown {
  if (!isObjectRecord(value)) {
    return value;
  }

  const concept = value as Record<keyof SavedConcept, unknown>;
  const result: Record<string, unknown> = {
    ...concept,
    evaluatedConcept: withLegacyEvaluatedConceptDefaults(concept.evaluatedConcept),
  };

  if (concept.preHardenedConcept !== undefined) {
    result['preHardenedConcept'] = withLegacyEvaluatedConceptDefaults(concept.preHardenedConcept);
  }

  return result;
}

export function parseSavedConcept(value: unknown, sourcePath: string): SavedConcept {
  const migrated = withSavedConceptLegacyDefaults(value);
  if (isSavedConcept(migrated)) {
    return migrated;
  }

  if (isSavedConcept(value)) {
    return value;
  }

  throw new Error(`Invalid SavedConcept payload at ${sourcePath}`);
}
