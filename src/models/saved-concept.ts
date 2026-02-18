import type { DriftRisk, EvaluatedConcept, PlayerBreak } from './concept-generator.js';

export interface ConceptSeeds {
  readonly genreVibes?: string;
  readonly moodKeywords?: string;
  readonly contentPreferences?: string;
  readonly thematicInterests?: string;
  readonly sparkLine?: string;
}

export interface SavedConcept {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly seeds: ConceptSeeds;
  readonly evaluatedConcept: EvaluatedConcept;
  readonly hardenedAt?: string;
  readonly stressTestResult?: {
    readonly driftRisks: readonly DriftRisk[];
    readonly playerBreaks: readonly PlayerBreak[];
  };
}

export function isSavedConcept(value: unknown): value is SavedConcept {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj['id'] === 'string' &&
    obj['id'].length > 0 &&
    typeof obj['name'] === 'string' &&
    typeof obj['createdAt'] === 'string' &&
    typeof obj['updatedAt'] === 'string' &&
    typeof obj['seeds'] === 'object' &&
    obj['seeds'] !== null &&
    typeof obj['evaluatedConcept'] === 'object' &&
    obj['evaluatedConcept'] !== null
  );
}
