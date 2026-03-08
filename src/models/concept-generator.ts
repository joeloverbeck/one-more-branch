import type { ContentPacket } from './content-packet.js';
import type { ConflictAxis, ConflictType } from './conflict-taxonomy.js';
import { CONFLICT_AXES, isConflictAxis, isConflictType } from './conflict-taxonomy.js';
import type { StoryKernel } from './story-kernel.js';

export type { ConflictAxis };
export { CONFLICT_AXES, isConflictAxis };

export const GENRE_FRAMES = [
  'ABSURDIST',
  'ADVENTURE',
  'ALTERNATE_HISTORY',
  'COMING_OF_AGE',
  'COSMIC_HORROR',
  'CULTIVATION',
  'CYBERPUNK',
  'DARK_COMEDY',
  'DRAMA',
  'DYSTOPIAN',
  'EROTICA',
  'ESPIONAGE',
  'FABLE',
  'FANTASY',
  'GOTHIC',
  'GRIMDARK',
  'HEIST',
  'HISTORICAL',
  'HORROR',
  'ISEKAI',
  'KAIJU',
  'LITRPG',
  'LITERARY',
  'MAGICAL_REALISM',
  'MILITARY',
  'MYSTERY',
  'MYTHIC',
  'NOIR',
  'PARANORMAL',
  'PICARESQUE',
  'POST_APOCALYPTIC',
  'ROMANCE',
  'SATIRE',
  'SCI_FI',
  'SLICE_OF_LIFE',
  'SPACE_OPERA',
  'STEAMPUNK',
  'SURREAL',
  'SURVIVAL',
  'THRILLER',
  'TRAGEDY',
  'TRANSGRESSIVE',
  'UTOPIAN',
  'WESTERN',
  'WUXIA',
] as const;

export type GenreFrame = (typeof GENRE_FRAMES)[number];

export const SETTING_SCALES = ['INTIMATE', 'LOCAL', 'REGIONAL', 'GLOBAL'] as const;

export type SettingScale = (typeof SETTING_SCALES)[number];

export const DRIFT_RISK_MITIGATION_TYPES = [
  'STATE_CONSTRAINT',
  'WORLD_AXIOM',
  'SCENE_RULE',
  'RETRIEVAL_SCOPE',
  'WILDNESS_INVARIANT',
] as const;

export type DriftRiskMitigationType = (typeof DRIFT_RISK_MITIGATION_TYPES)[number];

export const MIN_UNBANNED_GENRES = 6;

export function isGenreFrame(value: unknown): value is GenreFrame {
  return typeof value === 'string' && (GENRE_FRAMES as readonly string[]).includes(value);
}

export function filterGenreFrames(
  excludedGenres?: readonly GenreFrame[],
): readonly GenreFrame[] {
  if (!excludedGenres || excludedGenres.length === 0) {
    return GENRE_FRAMES;
  }
  return GENRE_FRAMES.filter((genre) => !excludedGenres.includes(genre));
}

export function isSettingScale(value: unknown): value is SettingScale {
  return typeof value === 'string' && (SETTING_SCALES as readonly string[]).includes(value);
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
  readonly conflictType: ConflictType;
  readonly pressureSource: string;
  readonly stakesPersonal: string;
  readonly stakesSystemic: string;
  readonly deadlineMechanism: string;
  readonly settingAxioms: readonly string[];
  readonly constraintSet: readonly string[];
  readonly keyInstitutions: readonly string[];
  readonly settingScale: SettingScale;
  readonly whatIfQuestion: string;
  readonly ironicTwist: string;
  readonly playerFantasy: string;
  readonly incitingDisruption: string;
  readonly escapeValve: string;
  readonly protagonistLie: string;
  readonly protagonistTruth: string;
  readonly protagonistGhost: string;
  readonly wantNeedCollisionSketch: string;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArrayWithinBounds(
  value: unknown,
  minItems: number,
  maxItems?: number
): value is readonly string[] {
  if (!Array.isArray(value)) {
    return false;
  }

  if (value.length < minItems) {
    return false;
  }

  if (typeof maxItems === 'number' && value.length > maxItems) {
    return false;
  }

  return value.every((item) => typeof item === 'string' && item.trim().length > 0);
}

export function isConceptSpec(value: unknown): value is ConceptSpec {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const concept = value as Record<string, unknown>;

  return (
    isNonEmptyString(concept['oneLineHook']) &&
    isNonEmptyString(concept['elevatorParagraph']) &&
    isGenreFrame(concept['genreFrame']) &&
    isNonEmptyString(concept['genreSubversion']) &&
    isNonEmptyString(concept['protagonistRole']) &&
    isNonEmptyString(concept['coreCompetence']) &&
    isNonEmptyString(concept['coreFlaw']) &&
    isStringArrayWithinBounds(concept['actionVerbs'], 6) &&
    isNonEmptyString(concept['coreConflictLoop']) &&
    isConflictAxis(concept['conflictAxis']) &&
    isConflictType(concept['conflictType']) &&
    isNonEmptyString(concept['pressureSource']) &&
    isNonEmptyString(concept['stakesPersonal']) &&
    isNonEmptyString(concept['stakesSystemic']) &&
    isNonEmptyString(concept['deadlineMechanism']) &&
    isStringArrayWithinBounds(concept['settingAxioms'], 2, 5) &&
    isStringArrayWithinBounds(concept['constraintSet'], 2, 5) &&
    isStringArrayWithinBounds(concept['keyInstitutions'], 2, 4) &&
    isSettingScale(concept['settingScale']) &&
    isNonEmptyString(concept['whatIfQuestion']) &&
    isNonEmptyString(concept['ironicTwist']) &&
    isNonEmptyString(concept['playerFantasy']) &&
    isNonEmptyString(concept['incitingDisruption']) &&
    isNonEmptyString(concept['escapeValve']) &&
    isNonEmptyString(concept['protagonistLie']) &&
    isNonEmptyString(concept['protagonistTruth']) &&
    isNonEmptyString(concept['protagonistGhost']) &&
    isNonEmptyString(concept['wantNeedCollisionSketch'])
  );
}

export interface ConceptDimensionScores {
  readonly hookStrength: number;
  readonly conflictEngine: number;
  readonly agencyBreadth: number;
  readonly noveltyLeverage: number;
  readonly llmFeasibility: number;
  readonly ironicPremise: number;
  readonly sceneGenerativePower: number;
  readonly contentCharge: number;
}

export interface ConceptScoreEvidence {
  readonly hookStrength: readonly string[];
  readonly conflictEngine: readonly string[];
  readonly agencyBreadth: readonly string[];
  readonly noveltyLeverage: readonly string[];
  readonly llmFeasibility: readonly string[];
  readonly ironicPremise: readonly string[];
  readonly sceneGenerativePower: readonly string[];
  readonly contentCharge: readonly string[];
}

export interface ScoredConcept {
  readonly concept: ConceptSpec;
  readonly scores: ConceptDimensionScores;
  readonly scoreEvidence: ConceptScoreEvidence;
  readonly overallScore: number;
  readonly passes: boolean;
}

export interface EvaluatedConcept {
  readonly concept: ConceptSpec;
  readonly scores: ConceptDimensionScores;
  readonly overallScore: number;
  readonly passes: boolean;
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly tradeoffSummary: string;
}

export interface ConceptContext {
  readonly oneLineHook: string;
  readonly coreConflictLoop: string;
  readonly conflictAxis: ConflictAxis;
  readonly conflictType: ConflictType;
  readonly pressureSource: string;
  readonly stakesPersonal: string;
  readonly stakesSystemic: string;
  readonly deadlineMechanism: string;
  readonly actionVerbs: readonly string[];
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

export type ConceptSeedFields = Pick<
  ConceptSpec,
  | 'oneLineHook'
  | 'genreFrame'
  | 'genreSubversion'
  | 'conflictAxis'
  | 'conflictType'
  | 'whatIfQuestion'
  | 'playerFantasy'
>;

export type ConceptCharacterWorldFields = Pick<
  ConceptSpec,
  | 'protagonistRole'
  | 'coreCompetence'
  | 'coreFlaw'
  | 'actionVerbs'
  | 'coreConflictLoop'
  | 'settingAxioms'
  | 'constraintSet'
  | 'keyInstitutions'
  | 'settingScale'
>;

export type ConceptEngineFields = Pick<
  ConceptSpec,
  | 'pressureSource'
  | 'stakesPersonal'
  | 'stakesSystemic'
  | 'deadlineMechanism'
  | 'ironicTwist'
  | 'incitingDisruption'
  | 'escapeValve'
  | 'elevatorParagraph'
  | 'protagonistLie'
  | 'protagonistTruth'
  | 'protagonistGhost'
  | 'wantNeedCollisionSketch'
>;

export interface ConceptSeederContext {
  readonly protagonistDetails?: string;
  readonly genreVibes?: string;
  readonly moodKeywords?: string;
  readonly contentPreferences?: string;
  readonly kernel?: StoryKernel;
  readonly excludedGenres?: readonly GenreFrame[];
  readonly contentPackets?: readonly ContentPacket[];
}

export interface ConceptSeederResult {
  readonly seeds: readonly ConceptSeedFields[];
  readonly rawResponse: string;
}

export interface ConceptEvolverSeederContext {
  readonly parentConcepts: readonly EvaluatedConcept[];
  readonly kernel: StoryKernel;
  readonly excludedGenres?: readonly GenreFrame[];
  readonly protagonistDetails?: string;
  readonly genreVibes?: string;
  readonly moodKeywords?: string;
  readonly contentPreferences?: string;
  readonly contentPackets?: readonly ContentPacket[];
}

export interface ConceptEvolverSeederResult {
  readonly seeds: readonly ConceptSeedFields[];
  readonly rawResponse: string;
}

export interface ConceptArchitectContext {
  readonly seeds: readonly ConceptSeedFields[];
  readonly kernel?: StoryKernel;
  readonly protagonistDetails?: string;
  readonly genreVibes?: string;
  readonly moodKeywords?: string;
  readonly contentPreferences?: string;
  readonly contentPackets?: readonly ContentPacket[];
}

export interface ConceptArchitectResult {
  readonly characterWorlds: readonly ConceptCharacterWorldFields[];
  readonly rawResponse: string;
}

export interface ConceptEngineerContext {
  readonly seeds: readonly ConceptSeedFields[];
  readonly characterWorlds: readonly ConceptCharacterWorldFields[];
  readonly kernel?: StoryKernel;
  readonly protagonistDetails?: string;
  readonly genreVibes?: string;
  readonly moodKeywords?: string;
  readonly contentPreferences?: string;
  readonly contentPackets?: readonly ContentPacket[];
}

export interface ConceptEngineerResult {
  readonly engines: readonly ConceptEngineFields[];
  readonly rawResponse: string;
}

export interface ConceptIdeatorContext {
  readonly protagonistDetails?: string;
  readonly genreVibes?: string;
  readonly moodKeywords?: string;
  readonly contentPreferences?: string;
  readonly kernel?: StoryKernel;
  readonly excludedGenres?: readonly GenreFrame[];
}

export interface ConceptIdeationResult {
  readonly concepts: readonly ConceptSpec[];
  readonly rawResponse: string;
}

export interface ConceptEvolverContext {
  readonly parentConcepts: readonly EvaluatedConcept[];
  readonly kernel: StoryKernel;
  readonly excludedGenres?: readonly GenreFrame[];
  readonly protagonistDetails?: string;
  readonly genreVibes?: string;
  readonly moodKeywords?: string;
  readonly contentPreferences?: string;
  readonly contentPackets?: readonly ContentPacket[];
}

export interface ConceptEvolutionResult {
  readonly concepts: readonly ConceptSpec[];
  readonly rawResponse: string;
}

export interface ConceptEvaluatorContext {
  readonly concepts: readonly ConceptSpec[];
  readonly userSeeds: ConceptSeedInput;
}

export interface ConceptEvaluationResult {
  readonly scoredConcepts: readonly ScoredConcept[];
  readonly evaluatedConcepts: readonly EvaluatedConcept[];
  readonly rawResponse: string;
}

export interface ConceptStressTesterContext {
  readonly concept: ConceptSpec;
  readonly scores: ConceptDimensionScores;
  readonly weaknesses: readonly string[];
  readonly verification?: ConceptVerification;
}

export interface ConceptStressTestResult {
  readonly hardenedConcept: ConceptSpec;
  readonly driftRisks: readonly DriftRisk[];
  readonly playerBreaks: readonly PlayerBreak[];
  readonly rawResponse: string;
}

export interface LoadBearingCheck {
  readonly passes: boolean;
  readonly reasoning: string;
  readonly genericCollapse: string;
}

export interface KernelFidelityCheck {
  readonly passes: boolean;
  readonly reasoning: string;
  readonly kernelDrift: string;
}

export const CONCEPT_VERIFICATION_CONSTRAINTS = {
  premisePromisesMin: 2,
  premisePromisesMax: 7,
  escalatingSetpiecesMin: 3,
  escalatingSetpiecesMax: 8,
  setpieceCausalLinksMin: 2,
  setpieceCausalLinksMax: 7,
  loglineMaxWords: 35,
  /** Ideal target still requested in prompts */
  escalatingSetpiecesCount: 6,
  /** Ideal target still requested in prompts */
  setpieceCausalLinksCount: 5,
} as const;

export interface ConceptVerification {
  readonly conceptId: string;
  readonly signatureScenario: string;
  readonly loglineCompressible: boolean;
  readonly logline: string;
  readonly premisePromises: readonly string[];
  readonly escalatingSetpieces: readonly string[];
  readonly setpieceCausalChainBroken: boolean;
  readonly setpieceCausalLinks: readonly string[];
  readonly inevitabilityStatement: string;
  readonly loadBearingCheck: LoadBearingCheck;
  readonly kernelFidelityCheck: KernelFidelityCheck;
  readonly conceptIntegrityScore: number;
}

export interface ConceptVerifierContext {
  readonly evaluatedConcepts: readonly EvaluatedConcept[];
  readonly kernel: StoryKernel;
  readonly contentPackets?: readonly ContentPacket[];
}

export interface ConceptVerificationResult {
  readonly verifications: readonly ConceptVerification[];
  readonly rawResponse: string;
}

export const CONCEPT_SCORING_WEIGHTS = {
  hookStrength: 10,
  conflictEngine: 18,
  agencyBreadth: 15,
  noveltyLeverage: 10,
  llmFeasibility: 18,
  ironicPremise: 14,
  sceneGenerativePower: 5,
  contentCharge: 10,
} as const;

export const CONCEPT_PASS_THRESHOLDS = {
  hookStrength: 3,
  conflictEngine: 3,
  agencyBreadth: 3,
  noveltyLeverage: 2,
  llmFeasibility: 3,
  ironicPremise: 3,
  sceneGenerativePower: 3,
  contentCharge: 2,
} as const;

export function computeOverallScore(scores: ConceptDimensionScores): number {
  return (
    (scores.hookStrength * CONCEPT_SCORING_WEIGHTS.hookStrength) / 5 +
    (scores.conflictEngine * CONCEPT_SCORING_WEIGHTS.conflictEngine) / 5 +
    (scores.agencyBreadth * CONCEPT_SCORING_WEIGHTS.agencyBreadth) / 5 +
    (scores.noveltyLeverage * CONCEPT_SCORING_WEIGHTS.noveltyLeverage) / 5 +
    (scores.llmFeasibility * CONCEPT_SCORING_WEIGHTS.llmFeasibility) / 5 +
    (scores.ironicPremise * CONCEPT_SCORING_WEIGHTS.ironicPremise) / 5 +
    (scores.sceneGenerativePower * CONCEPT_SCORING_WEIGHTS.sceneGenerativePower) / 5 +
    (scores.contentCharge * CONCEPT_SCORING_WEIGHTS.contentCharge) / 5
  );
}

export function passesConceptThresholds(scores: ConceptDimensionScores): boolean {
  return (
    scores.hookStrength >= CONCEPT_PASS_THRESHOLDS.hookStrength &&
    scores.conflictEngine >= CONCEPT_PASS_THRESHOLDS.conflictEngine &&
    scores.agencyBreadth >= CONCEPT_PASS_THRESHOLDS.agencyBreadth &&
    scores.noveltyLeverage >= CONCEPT_PASS_THRESHOLDS.noveltyLeverage &&
    scores.llmFeasibility >= CONCEPT_PASS_THRESHOLDS.llmFeasibility &&
    scores.ironicPremise >= CONCEPT_PASS_THRESHOLDS.ironicPremise &&
    scores.sceneGenerativePower >= CONCEPT_PASS_THRESHOLDS.sceneGenerativePower &&
    scores.contentCharge >= CONCEPT_PASS_THRESHOLDS.contentCharge
  );
}
