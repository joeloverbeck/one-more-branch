export const DIRECTION_OF_CHANGE_VALUES = ['POSITIVE', 'NEGATIVE', 'IRONIC', 'AMBIGUOUS'] as const;

export type DirectionOfChange = (typeof DIRECTION_OF_CHANGE_VALUES)[number];

export function isDirectionOfChange(value: unknown): value is DirectionOfChange {
  return typeof value === 'string' && (DIRECTION_OF_CHANGE_VALUES as readonly string[]).includes(value);
}

export interface StoryKernel {
  readonly dramaticThesis: string;
  readonly valueAtStake: string;
  readonly opposingForce: string;
  readonly directionOfChange: DirectionOfChange;
  readonly thematicQuestion: string;
}

export interface KernelSeedInput {
  readonly thematicInterests?: string;
  readonly emotionalCore?: string;
  readonly sparkLine?: string;
  readonly apiKey: string;
}

export interface KernelIdeatorContext {
  readonly thematicInterests?: string;
  readonly emotionalCore?: string;
  readonly sparkLine?: string;
}

export interface KernelIdeationResult {
  readonly kernels: readonly StoryKernel[];
  readonly rawResponse: string;
}

export interface KernelEvaluatorContext {
  readonly kernels: readonly StoryKernel[];
  readonly userSeeds: KernelSeedInput;
}

export interface KernelDimensionScores {
  readonly dramaticClarity: number;
  readonly thematicUniversality: number;
  readonly generativePotential: number;
  readonly conflictTension: number;
  readonly emotionalDepth: number;
}

export interface KernelScoreEvidence {
  readonly dramaticClarity: readonly string[];
  readonly thematicUniversality: readonly string[];
  readonly generativePotential: readonly string[];
  readonly conflictTension: readonly string[];
  readonly emotionalDepth: readonly string[];
}

export interface ScoredKernel {
  readonly kernel: StoryKernel;
  readonly scores: KernelDimensionScores;
  readonly scoreEvidence: KernelScoreEvidence;
  readonly overallScore: number;
}

export interface EvaluatedKernel {
  readonly kernel: StoryKernel;
  readonly scores: KernelDimensionScores;
  readonly overallScore: number;
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly tradeoffSummary: string;
}

export interface KernelEvaluationResult {
  readonly scoredKernels: readonly ScoredKernel[];
  readonly evaluatedKernels: readonly EvaluatedKernel[];
  readonly rawResponse: string;
}

export const KERNEL_SCORING_WEIGHTS = {
  dramaticClarity: 20,
  thematicUniversality: 15,
  generativePotential: 25,
  conflictTension: 25,
  emotionalDepth: 15,
} as const;

export const KERNEL_PASS_THRESHOLDS = {
  dramaticClarity: 3,
  thematicUniversality: 2,
  generativePotential: 3,
  conflictTension: 3,
  emotionalDepth: 2,
} as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isStoryKernel(value: unknown): value is StoryKernel {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const kernel = value as Record<string, unknown>;

  return (
    isNonEmptyString(kernel['dramaticThesis']) &&
    isNonEmptyString(kernel['valueAtStake']) &&
    isNonEmptyString(kernel['opposingForce']) &&
    isDirectionOfChange(kernel['directionOfChange']) &&
    isNonEmptyString(kernel['thematicQuestion'])
  );
}

export function computeKernelOverallScore(scores: KernelDimensionScores): number {
  return (
    (scores.dramaticClarity * KERNEL_SCORING_WEIGHTS.dramaticClarity) / 5 +
    (scores.thematicUniversality * KERNEL_SCORING_WEIGHTS.thematicUniversality) / 5 +
    (scores.generativePotential * KERNEL_SCORING_WEIGHTS.generativePotential) / 5 +
    (scores.conflictTension * KERNEL_SCORING_WEIGHTS.conflictTension) / 5 +
    (scores.emotionalDepth * KERNEL_SCORING_WEIGHTS.emotionalDepth) / 5
  );
}

export function passesKernelThresholds(scores: KernelDimensionScores): boolean {
  return (
    scores.dramaticClarity >= KERNEL_PASS_THRESHOLDS.dramaticClarity &&
    scores.thematicUniversality >= KERNEL_PASS_THRESHOLDS.thematicUniversality &&
    scores.generativePotential >= KERNEL_PASS_THRESHOLDS.generativePotential &&
    scores.conflictTension >= KERNEL_PASS_THRESHOLDS.conflictTension &&
    scores.emotionalDepth >= KERNEL_PASS_THRESHOLDS.emotionalDepth
  );
}
