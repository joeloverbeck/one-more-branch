import type {
  ConceptSpec,
  DriftRisk,
  EvaluatedConcept,
  PlayerBreak,
  ScoredConcept,
} from './concept-generator.js';
import { isConceptSpec, isDriftRiskMitigationType } from './concept-generator.js';

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

export interface GeneratedConceptBatch {
  readonly id: string;
  readonly generatedAt: string;
  readonly seeds: ConceptSeeds;
  readonly ideatedConcepts: readonly ConceptSpec[];
  readonly scoredConcepts: readonly ScoredConcept[];
  readonly selectedConcepts: readonly EvaluatedConcept[];
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => isNonEmptyString(item));
}

function isFiniteScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 5;
}

function isIsoDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isConceptSeeds(value: unknown): value is ConceptSeeds {
  if (!isObjectRecord(value)) {
    return false;
  }

  const fields: readonly (keyof ConceptSeeds)[] = [
    'genreVibes',
    'moodKeywords',
    'contentPreferences',
    'thematicInterests',
    'sparkLine',
  ];

  return fields.every((field) => value[field] === undefined || typeof value[field] === 'string');
}

function isConceptDimensionScores(value: unknown): boolean {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isFiniteScore(value['hookStrength']) &&
    isFiniteScore(value['conflictEngine']) &&
    isFiniteScore(value['agencyBreadth']) &&
    isFiniteScore(value['noveltyLeverage']) &&
    isFiniteScore(value['branchingFitness']) &&
    isFiniteScore(value['llmFeasibility'])
  );
}

function isScoreEvidence(value: unknown): boolean {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isStringArray(value['hookStrength']) &&
    isStringArray(value['conflictEngine']) &&
    isStringArray(value['agencyBreadth']) &&
    isStringArray(value['noveltyLeverage']) &&
    isStringArray(value['branchingFitness']) &&
    isStringArray(value['llmFeasibility'])
  );
}

function isScoredConcept(value: unknown): value is ScoredConcept {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isConceptSpec(value['concept']) &&
    isConceptDimensionScores(value['scores']) &&
    isScoreEvidence(value['scoreEvidence']) &&
    typeof value['overallScore'] === 'number' &&
    Number.isFinite(value['overallScore'])
  );
}

function isEvaluatedConcept(value: unknown): value is EvaluatedConcept {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isConceptSpec(value['concept']) &&
    isConceptDimensionScores(value['scores']) &&
    typeof value['overallScore'] === 'number' &&
    Number.isFinite(value['overallScore']) &&
    isStringArray(value['strengths']) &&
    isStringArray(value['weaknesses']) &&
    isNonEmptyString(value['tradeoffSummary'])
  );
}

function isStressTestResult(
  value: unknown
): value is { readonly driftRisks: readonly DriftRisk[]; readonly playerBreaks: readonly PlayerBreak[] } {
  if (!isObjectRecord(value)) {
    return false;
  }

  const driftRisks = value['driftRisks'];
  const playerBreaks = value['playerBreaks'];

  return (
    Array.isArray(driftRisks) &&
    driftRisks.every(
      (risk) =>
        isObjectRecord(risk) &&
        isNonEmptyString(risk['risk']) &&
        isNonEmptyString(risk['mitigation']) &&
        isDriftRiskMitigationType(risk['mitigationType'])
    ) &&
    Array.isArray(playerBreaks) &&
    playerBreaks.every(
      (entry) =>
        isObjectRecord(entry) &&
        isNonEmptyString(entry['scenario']) &&
        isNonEmptyString(entry['handling']) &&
        isNonEmptyString(entry['constraintUsed'])
    )
  );
}

export function isSavedConcept(value: unknown): value is SavedConcept {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value['id']) &&
    isNonEmptyString(value['name']) &&
    isIsoDateString(value['createdAt']) &&
    isIsoDateString(value['updatedAt']) &&
    isConceptSeeds(value['seeds']) &&
    isEvaluatedConcept(value['evaluatedConcept']) &&
    (value['hardenedAt'] === undefined || isIsoDateString(value['hardenedAt'])) &&
    (value['stressTestResult'] === undefined || isStressTestResult(value['stressTestResult']))
  );
}

export function isGeneratedConceptBatch(value: unknown): value is GeneratedConceptBatch {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value['id']) &&
    isIsoDateString(value['generatedAt']) &&
    isConceptSeeds(value['seeds']) &&
    Array.isArray(value['ideatedConcepts']) &&
    value['ideatedConcepts'].every((concept) => isConceptSpec(concept)) &&
    Array.isArray(value['scoredConcepts']) &&
    value['scoredConcepts'].every((entry) => isScoredConcept(entry)) &&
    Array.isArray(value['selectedConcepts']) &&
    value['selectedConcepts'].every((entry) => isEvaluatedConcept(entry))
  );
}
