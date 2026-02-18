export const GENRE_FRAMES = [
  'HORROR',
  'THRILLER',
  'MYSTERY',
  'FANTASY',
  'SCI_FI',
  'LITERARY',
  'ROMANCE',
  'DRAMA',
  'WESTERN',
  'NOIR',
  'SATIRE',
  'FABLE',
  'GOTHIC',
  'SURREAL',
  'DYSTOPIAN',
  'MYTHIC',
] as const;

export type GenreFrame = (typeof GENRE_FRAMES)[number];

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

export const BRANCHING_POSTURES = ['TREE', 'RECONVERGE', 'STORYLETS', 'HUB_AND_SPOKE'] as const;

export type BranchingPosture = (typeof BRANCHING_POSTURES)[number];

export const SETTING_SCALES = ['INTIMATE', 'LOCAL', 'REGIONAL', 'GLOBAL'] as const;

export type SettingScale = (typeof SETTING_SCALES)[number];

export const STATE_COMPLEXITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;

export type StateComplexity = (typeof STATE_COMPLEXITIES)[number];

export const DRIFT_RISK_MITIGATION_TYPES = [
  'STATE_CONSTRAINT',
  'WORLD_AXIOM',
  'SCENE_RULE',
  'RETRIEVAL_SCOPE',
] as const;

export type DriftRiskMitigationType = (typeof DRIFT_RISK_MITIGATION_TYPES)[number];

export function isGenreFrame(value: unknown): value is GenreFrame {
  return typeof value === 'string' && (GENRE_FRAMES as readonly string[]).includes(value);
}

export function isConflictAxis(value: unknown): value is ConflictAxis {
  return typeof value === 'string' && (CONFLICT_AXES as readonly string[]).includes(value);
}

export function isBranchingPosture(value: unknown): value is BranchingPosture {
  return typeof value === 'string' && (BRANCHING_POSTURES as readonly string[]).includes(value);
}

export function isSettingScale(value: unknown): value is SettingScale {
  return typeof value === 'string' && (SETTING_SCALES as readonly string[]).includes(value);
}

export function isStateComplexity(value: unknown): value is StateComplexity {
  return typeof value === 'string' && (STATE_COMPLEXITIES as readonly string[]).includes(value);
}

export function isDriftRiskMitigationType(value: unknown): value is DriftRiskMitigationType {
  return (
    typeof value === 'string' && (DRIFT_RISK_MITIGATION_TYPES as readonly string[]).includes(value)
  );
}

export interface ConceptSeedInput {
  readonly genreVibes?: string;
  readonly moodKeywords?: string;
  readonly contentPreferences?: string;
  readonly thematicInterests?: string;
  readonly sparkLine?: string;
  readonly apiKey: string;
}

export interface ConceptSpec {
  readonly oneLineHook: string;
  readonly elevatorParagraph: string;
  readonly genreFrame: GenreFrame;
  readonly genreSubversion: string;
  readonly protagonistRole: string;
  readonly coreCompetence: string;
  readonly coreFlaw: string;
  readonly actionVerbs: readonly string[];
  readonly coreConflictLoop: string;
  readonly conflictAxis: ConflictAxis;
  readonly pressureSource: string;
  readonly stakesPersonal: string;
  readonly stakesSystemic: string;
  readonly deadlineMechanism: string;
  readonly settingAxioms: readonly string[];
  readonly constraintSet: readonly string[];
  readonly keyInstitutions: readonly string[];
  readonly settingScale: SettingScale;
  readonly branchingPosture: BranchingPosture;
  readonly stateComplexity: StateComplexity;
}

export interface ConceptDimensionScores {
  readonly hookStrength: number;
  readonly conflictEngine: number;
  readonly agencyBreadth: number;
  readonly noveltyLeverage: number;
  readonly branchingFitness: number;
  readonly llmFeasibility: number;
}

export interface EvaluatedConcept {
  readonly concept: ConceptSpec;
  readonly scores: ConceptDimensionScores;
  readonly overallScore: number;
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly tradeoffSummary: string;
}

export interface ConceptContext {
  readonly oneLineHook: string;
  readonly coreConflictLoop: string;
  readonly conflictAxis: ConflictAxis;
  readonly pressureSource: string;
  readonly stakesPersonal: string;
  readonly stakesSystemic: string;
  readonly deadlineMechanism: string;
  readonly actionVerbs: readonly string[];
  readonly branchingPosture: BranchingPosture;
  readonly stateComplexity: StateComplexity;
  readonly settingScale: SettingScale;
}

export interface DriftRisk {
  readonly risk: string;
  readonly mitigation: string;
  readonly mitigationType: DriftRiskMitigationType;
}

export interface PlayerBreak {
  readonly scenario: string;
  readonly handling: string;
  readonly constraintUsed: string;
}

export interface ConceptIdeatorContext {
  readonly genreVibes?: string;
  readonly moodKeywords?: string;
  readonly contentPreferences?: string;
  readonly thematicInterests?: string;
  readonly sparkLine?: string;
}

export interface ConceptIdeationResult {
  readonly concepts: readonly ConceptSpec[];
  readonly rawResponse: string;
}

export interface ConceptEvaluatorContext {
  readonly concepts: readonly ConceptSpec[];
  readonly userSeeds: ConceptSeedInput;
}

export interface ConceptEvaluationResult {
  readonly evaluatedConcepts: readonly EvaluatedConcept[];
  readonly rawResponse: string;
}

export interface ConceptStressTesterContext {
  readonly concept: ConceptSpec;
  readonly scores: ConceptDimensionScores;
  readonly weaknesses: readonly string[];
}

export interface ConceptStressTestResult {
  readonly hardenedConcept: ConceptSpec;
  readonly driftRisks: readonly DriftRisk[];
  readonly playerBreaks: readonly PlayerBreak[];
  readonly rawResponse: string;
}

export const CONCEPT_SCORING_WEIGHTS = {
  hookStrength: 12,
  conflictEngine: 20,
  agencyBreadth: 15,
  noveltyLeverage: 10,
  branchingFitness: 20,
  llmFeasibility: 23,
} as const;

export const CONCEPT_PASS_THRESHOLDS = {
  hookStrength: 3,
  conflictEngine: 3,
  agencyBreadth: 3,
  noveltyLeverage: 2,
  branchingFitness: 3,
  llmFeasibility: 3,
} as const;

export function computeOverallScore(scores: ConceptDimensionScores): number {
  return (
    (scores.hookStrength * CONCEPT_SCORING_WEIGHTS.hookStrength) / 5 +
    (scores.conflictEngine * CONCEPT_SCORING_WEIGHTS.conflictEngine) / 5 +
    (scores.agencyBreadth * CONCEPT_SCORING_WEIGHTS.agencyBreadth) / 5 +
    (scores.noveltyLeverage * CONCEPT_SCORING_WEIGHTS.noveltyLeverage) / 5 +
    (scores.branchingFitness * CONCEPT_SCORING_WEIGHTS.branchingFitness) / 5 +
    (scores.llmFeasibility * CONCEPT_SCORING_WEIGHTS.llmFeasibility) / 5
  );
}
