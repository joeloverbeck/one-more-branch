import { logger } from '../logging/index.js';
import {
  computeKernelOverallScore,
  isStoryKernel,
  type EvaluatedKernel,
  type KernelDimensionScores,
  type KernelEvaluationResult,
  type KernelEvaluatorContext,
  type KernelScoreEvidence,
  type ScoredKernel,
  type StoryKernel,
} from '../models/index.js';
import { runTwoPhaseLlmStage } from './llm-stage-runner.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import {
  buildKernelEvaluatorDeepEvalPrompt,
  buildKernelEvaluatorScoringPrompt,
} from './prompts/kernel-evaluator-prompt.js';
import {
  KERNEL_EVALUATION_DEEP_SCHEMA,
  KERNEL_EVALUATION_SCORING_SCHEMA,
} from './schemas/kernel-evaluator-schema.js';

function requireNonEmptyString(value: unknown, fieldName: string, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new LLMError(`${label} has invalid ${fieldName}`, 'STRUCTURE_PARSE_ERROR', true);
  }

  return value.trim();
}

function requireNonEmptyStringArray(value: unknown, fieldName: string, label: string): readonly string[] {
  if (!Array.isArray(value)) {
    throw new LLMError(`${label} has invalid ${fieldName}`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const items = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (items.length === 0) {
    throw new LLMError(`${label} ${fieldName} must contain at least 1 item`, 'STRUCTURE_PARSE_ERROR', true);
  }

  return items;
}

function parseClampedScore(value: unknown, fieldName: keyof KernelDimensionScores, label: string): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new LLMError(`${label} has invalid ${fieldName} score`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const clamped = Math.max(0, Math.min(5, value));
  if (clamped !== value) {
    logger.warn('Kernel evaluator score clamped to 0-5 range', {
      fieldName,
      original: value,
      clamped,
    });
  }

  return clamped;
}

function parseScores(value: unknown, index: number): KernelDimensionScores {
  const label = `Scored kernel ${index + 1}`;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(`${label} has invalid scores`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = value as Record<string, unknown>;
  return {
    dramaticClarity: parseClampedScore(data['dramaticClarity'], 'dramaticClarity', label),
    thematicUniversality: parseClampedScore(data['thematicUniversality'], 'thematicUniversality', label),
    generativePotential: parseClampedScore(data['generativePotential'], 'generativePotential', label),
    conflictTension: parseClampedScore(data['conflictTension'], 'conflictTension', label),
    emotionalDepth: parseClampedScore(data['emotionalDepth'], 'emotionalDepth', label),
  };
}

function parseScoreEvidence(value: unknown, index: number): KernelScoreEvidence {
  const label = `Scored kernel ${index + 1}`;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(`${label} has invalid scoreEvidence`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = value as Record<string, unknown>;
  return {
    dramaticClarity: requireNonEmptyStringArray(
      data['dramaticClarity'],
      'dramaticClarity',
      `${label} scoreEvidence`,
    ),
    thematicUniversality: requireNonEmptyStringArray(
      data['thematicUniversality'],
      'thematicUniversality',
      `${label} scoreEvidence`,
    ),
    generativePotential: requireNonEmptyStringArray(
      data['generativePotential'],
      'generativePotential',
      `${label} scoreEvidence`,
    ),
    conflictTension: requireNonEmptyStringArray(
      data['conflictTension'],
      'conflictTension',
      `${label} scoreEvidence`,
    ),
    emotionalDepth: requireNonEmptyStringArray(
      data['emotionalDepth'],
      'emotionalDepth',
      `${label} scoreEvidence`,
    ),
  };
}

function parseScoredKernel(value: unknown, index: number): ScoredKernel {
  const label = `Scored kernel ${index + 1}`;

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(`${label} must be an object`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = value as Record<string, unknown>;
  const kernel = data['kernel'];
  if (!isStoryKernel(kernel)) {
    throw new LLMError(`${label} has invalid kernel`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const scores = parseScores(data['scores'], index);
  const scoreEvidence = parseScoreEvidence(data['scoreEvidence'], index);

  return {
    kernel,
    scores,
    scoreEvidence,
    overallScore: computeKernelOverallScore(scores),
  };
}

function kernelIdentityKey(kernel: StoryKernel): string {
  return [
    kernel.dramaticThesis,
    kernel.valueAtStake,
    kernel.opposingForce,
    kernel.directionOfChange,
    kernel.thematicQuestion,
  ].join('::');
}

function ensureExactKernelCoverage(
  parsedKernels: readonly { kernel: StoryKernel }[],
  expectedKernels: readonly StoryKernel[],
  label: string,
): void {
  if (parsedKernels.length !== expectedKernels.length) {
    throw new LLMError(
      `${label} must include exactly ${expectedKernels.length} kernels (received: ${parsedKernels.length})`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const expected = new Set(expectedKernels.map((kernel) => kernelIdentityKey(kernel)));
  const received = new Set(parsedKernels.map((item) => kernelIdentityKey(item.kernel)));

  if (expected.size !== received.size || [...expected].some((key) => !received.has(key))) {
    throw new LLMError(`${label} kernel set does not match requested candidates`, 'STRUCTURE_PARSE_ERROR', true);
  }
}

export function parseKernelScoringResponse(
  parsed: unknown,
  expectedKernels: readonly StoryKernel[],
): readonly ScoredKernel[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Kernel scoring response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data['scoredKernels'])) {
    throw new LLMError('Kernel scoring response missing scoredKernels array', 'STRUCTURE_PARSE_ERROR', true);
  }

  const parsedKernels = data['scoredKernels'].map((kernel, index) => parseScoredKernel(kernel, index));
  ensureExactKernelCoverage(parsedKernels, expectedKernels, 'Kernel scoring response');

  return parsedKernels.sort((a, b) => b.overallScore - a.overallScore);
}

function parseDeepEvaluatedKernel(
  value: unknown,
  index: number,
): Omit<EvaluatedKernel, 'scores' | 'overallScore'> {
  const label = `Evaluated kernel ${index + 1}`;

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(`${label} must be an object`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = value as Record<string, unknown>;
  const kernel = data['kernel'];
  if (!isStoryKernel(kernel)) {
    throw new LLMError(`${label} has invalid kernel`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const strengths = requireNonEmptyStringArray(data['strengths'], 'strengths', label);
  const weaknesses = requireNonEmptyStringArray(data['weaknesses'], 'weaknesses', label);
  const tradeoffSummary = requireNonEmptyString(data['tradeoffSummary'], 'tradeoffSummary', label);

  return {
    kernel,
    strengths,
    weaknesses,
    tradeoffSummary,
  };
}

function parseKernelDeepEvaluationResponse(
  parsed: unknown,
  scoredKernels: readonly ScoredKernel[],
): readonly EvaluatedKernel[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Kernel deep-evaluation response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data['evaluatedKernels'])) {
    throw new LLMError(
      'Kernel deep-evaluation response missing evaluatedKernels array',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const parsedKernels = data['evaluatedKernels'].map((kernel, index) =>
    parseDeepEvaluatedKernel(kernel, index),
  );

  ensureExactKernelCoverage(
    parsedKernels,
    scoredKernels.map((item) => item.kernel),
    'Kernel deep-evaluation response',
  );

  const scoredByIdentity = new Map<string, ScoredKernel>(
    scoredKernels.map((item) => [kernelIdentityKey(item.kernel), item]),
  );

  const merged = parsedKernels.map((item) => {
    const identity = kernelIdentityKey(item.kernel);
    const scored = scoredByIdentity.get(identity);
    if (!scored) {
      throw new LLMError(
        'Kernel deep-evaluation response included an unknown kernel',
        'STRUCTURE_PARSE_ERROR',
        true,
      );
    }

    return {
      kernel: item.kernel,
      scores: scored.scores,
      overallScore: scored.overallScore,
      strengths: item.strengths,
      weaknesses: item.weaknesses,
      tradeoffSummary: item.tradeoffSummary,
    };
  });

  return merged.sort((a, b) => b.overallScore - a.overallScore);
}

export async function evaluateKernels(
  context: KernelEvaluatorContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<KernelEvaluationResult> {
  return runTwoPhaseLlmStage({
    firstStage: {
      stageModel: 'kernelEvaluator',
      promptType: 'kernelEvaluator',
      apiKey,
      options,
      schema: KERNEL_EVALUATION_SCORING_SCHEMA,
      messages: buildKernelEvaluatorScoringPrompt(context),
      parseResponse: (parsed) => parseKernelScoringResponse(parsed, context.kernels),
    },
    secondStage: (scoredKernels) => ({
      stageModel: 'kernelEvaluator',
      promptType: 'kernelEvaluator',
      apiKey,
      options,
      schema: KERNEL_EVALUATION_DEEP_SCHEMA,
      messages: buildKernelEvaluatorDeepEvalPrompt(context, scoredKernels),
      parseResponse: (parsed) => parseKernelDeepEvaluationResponse(parsed, scoredKernels),
    }),
    combineResult: ({ firstStageParsed, secondStageParsed, secondStageRawResponse }) => ({
      scoredKernels: firstStageParsed,
      evaluatedKernels: secondStageParsed,
      rawResponse: secondStageRawResponse,
    }),
  });
}
