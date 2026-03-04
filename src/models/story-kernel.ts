import { type ConflictAxis, isConflictAxis } from './conflict-taxonomy.js';

export const DIRECTION_OF_CHANGE_VALUES = ['POSITIVE', 'NEGATIVE', 'IRONIC', 'AMBIGUOUS'] as const;

export type DirectionOfChange = (typeof DIRECTION_OF_CHANGE_VALUES)[number];

export function isDirectionOfChange(value: unknown): value is DirectionOfChange {
  return typeof value === 'string' && (DIRECTION_OF_CHANGE_VALUES as readonly string[]).includes(value);
}

export const DRAMATIC_STANCE_VALUES = ['COMIC', 'ROMANTIC', 'TRAGIC', 'IRONIC'] as const;

export type DramaticStance = (typeof DRAMATIC_STANCE_VALUES)[number];

export function isDramaticStance(value: unknown): value is DramaticStance {
  return typeof value === 'string' && (DRAMATIC_STANCE_VALUES as readonly string[]).includes(value);
}

export interface ValueSpectrum {
  readonly positive: string;
  readonly contrary: string;
  readonly contradictory: string;
  readonly negationOfNegation: string;
}

export interface StoryKernel {
  readonly dramaticThesis: string;
  readonly antithesis: string;
  readonly valueAtStake: string;
  readonly opposingForce: string;
  readonly directionOfChange: DirectionOfChange;
  readonly conflictAxis: ConflictAxis;
  readonly dramaticStance: DramaticStance;
  readonly thematicQuestion: string;
  readonly valueSpectrum: ValueSpectrum;
  readonly moralArgument: string;
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
  readonly ironicPotential: number;
  readonly viscerality: number;
}

export interface KernelScoreEvidence {
  readonly dramaticClarity: readonly string[];
  readonly thematicUniversality: readonly string[];
  readonly generativePotential: readonly string[];
  readonly conflictTension: readonly string[];
  readonly emotionalDepth: readonly string[];
  readonly ironicPotential: readonly string[];
  readonly viscerality: readonly string[];
}

export interface ScoredKernel {
  readonly kernel: StoryKernel;
  readonly scores: KernelDimensionScores;
  readonly scoreEvidence: KernelScoreEvidence;
  readonly overallScore: number;
  readonly passes: boolean;
}

export interface EvaluatedKernel {
  readonly kernel: StoryKernel;
  readonly scores: KernelDimensionScores;
  readonly overallScore: number;
  readonly passes: boolean;
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
  dramaticClarity: 15,
  thematicUniversality: 10,
  generativePotential: 20,
  conflictTension: 20,
  emotionalDepth: 10,
  ironicPotential: 15,
  viscerality: 10,
} as const;

export const KERNEL_PASS_THRESHOLDS = {
  dramaticClarity: 3,
  thematicUniversality: 2,
  generativePotential: 3,
  conflictTension: 3,
  emotionalDepth: 2,
  ironicPotential: 3,
  viscerality: 3,
} as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValueSpectrum(value: unknown): value is ValueSpectrum {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const vs = value as Record<string, unknown>;

  return (
    isNonEmptyString(vs['positive']) &&
    isNonEmptyString(vs['contrary']) &&
    isNonEmptyString(vs['contradictory']) &&
    isNonEmptyString(vs['negationOfNegation'])
  );
}

export function isStoryKernel(value: unknown): value is StoryKernel {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const kernel = value as Record<string, unknown>;

  return (
    isNonEmptyString(kernel['dramaticThesis']) &&
    isNonEmptyString(kernel['antithesis']) &&
    isNonEmptyString(kernel['valueAtStake']) &&
    isNonEmptyString(kernel['opposingForce']) &&
    isDirectionOfChange(kernel['directionOfChange']) &&
    isConflictAxis(kernel['conflictAxis']) &&
    isDramaticStance(kernel['dramaticStance']) &&
    isNonEmptyString(kernel['thematicQuestion']) &&
    isValueSpectrum(kernel['valueSpectrum']) &&
    isNonEmptyString(kernel['moralArgument'])
  );
}

export function computeKernelOverallScore(scores: KernelDimensionScores): number {
  return (
    (scores.dramaticClarity * KERNEL_SCORING_WEIGHTS.dramaticClarity) / 5 +
    (scores.thematicUniversality * KERNEL_SCORING_WEIGHTS.thematicUniversality) / 5 +
    (scores.generativePotential * KERNEL_SCORING_WEIGHTS.generativePotential) / 5 +
    (scores.conflictTension * KERNEL_SCORING_WEIGHTS.conflictTension) / 5 +
    (scores.emotionalDepth * KERNEL_SCORING_WEIGHTS.emotionalDepth) / 5 +
    (scores.ironicPotential * KERNEL_SCORING_WEIGHTS.ironicPotential) / 5 +
    (scores.viscerality * KERNEL_SCORING_WEIGHTS.viscerality) / 5
  );
}

export interface KernelEvolverContext {
  readonly parentKernels: readonly EvaluatedKernel[];
}

export interface KernelEvolutionResult {
  readonly kernels: readonly StoryKernel[];
  readonly rawResponse: string;
}

export function passesKernelThresholds(scores: KernelDimensionScores): boolean {
  return (
    scores.dramaticClarity >= KERNEL_PASS_THRESHOLDS.dramaticClarity &&
    scores.thematicUniversality >= KERNEL_PASS_THRESHOLDS.thematicUniversality &&
    scores.generativePotential >= KERNEL_PASS_THRESHOLDS.generativePotential &&
    scores.conflictTension >= KERNEL_PASS_THRESHOLDS.conflictTension &&
    scores.emotionalDepth >= KERNEL_PASS_THRESHOLDS.emotionalDepth &&
    scores.ironicPotential >= KERNEL_PASS_THRESHOLDS.ironicPotential &&
    scores.viscerality >= KERNEL_PASS_THRESHOLDS.viscerality
  );
}
