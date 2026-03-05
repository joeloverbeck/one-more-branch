import { logger } from '../logging/index.js';
import {
  computeOverallScore,
  passesConceptThresholds,
  type ConceptDimensionScores,
  type ConceptScoreEvidence,
  type ConceptSeedInput,
  type ConceptSpec,
  type EvaluatedConcept,
  type ScoredConcept,
} from '../models/index.js';
import { runTwoPhaseLlmStage } from './llm-stage-runner.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import {
  buildSingleConceptScoringPrompt,
  buildSingleConceptDeepEvalPrompt,
} from './prompts/concept-single-evaluator-prompt.js';
import {
  CONCEPT_SINGLE_SCORING_SCHEMA,
  CONCEPT_SINGLE_DEEP_EVAL_SCHEMA,
} from './schemas/concept-single-evaluator-schema.js';

function requireNonEmptyString(value: unknown, fieldName: string, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new LLMError(`${label} has invalid ${fieldName}`, 'STRUCTURE_PARSE_ERROR', true);
  }
  return value.trim();
}

function requireNonEmptyStringArray(
  value: unknown,
  fieldName: string,
  label: string,
): readonly string[] {
  if (!Array.isArray(value)) {
    throw new LLMError(`${label} has invalid ${fieldName}`, 'STRUCTURE_PARSE_ERROR', true);
  }
  const items = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (items.length === 0) {
    throw new LLMError(
      `${label} ${fieldName} must contain at least 1 item`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }
  return items;
}

function parseClampedScore(
  value: unknown,
  fieldName: keyof ConceptDimensionScores,
  label: string,
): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new LLMError(`${label} has invalid ${fieldName} score`, 'STRUCTURE_PARSE_ERROR', true);
  }
  const clamped = Math.max(0, Math.min(5, value));
  if (clamped !== value) {
    logger.warn('Single concept evaluator score clamped to 0-5 range', {
      fieldName,
      original: value,
      clamped,
    });
  }
  return clamped;
}

function parseScores(value: unknown): ConceptDimensionScores {
  const label = 'Scored concept';
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(`${label} has invalid scores`, 'STRUCTURE_PARSE_ERROR', true);
  }
  const data = value as Record<string, unknown>;
  return {
    hookStrength: parseClampedScore(data['hookStrength'], 'hookStrength', label),
    conflictEngine: parseClampedScore(data['conflictEngine'], 'conflictEngine', label),
    agencyBreadth: parseClampedScore(data['agencyBreadth'], 'agencyBreadth', label),
    noveltyLeverage: parseClampedScore(data['noveltyLeverage'], 'noveltyLeverage', label),
    llmFeasibility: parseClampedScore(data['llmFeasibility'], 'llmFeasibility', label),
    ironicPremise: parseClampedScore(data['ironicPremise'], 'ironicPremise', label),
    sceneGenerativePower: parseClampedScore(
      data['sceneGenerativePower'],
      'sceneGenerativePower',
      label,
    ),
  };
}

function parseScoreEvidence(value: unknown): ConceptScoreEvidence {
  const label = 'Scored concept';
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(`${label} has invalid scoreEvidence`, 'STRUCTURE_PARSE_ERROR', true);
  }
  const data = value as Record<string, unknown>;
  const ev = `${label} scoreEvidence`;
  return {
    hookStrength: requireNonEmptyStringArray(data['hookStrength'], 'hookStrength', ev),
    conflictEngine: requireNonEmptyStringArray(data['conflictEngine'], 'conflictEngine', ev),
    agencyBreadth: requireNonEmptyStringArray(data['agencyBreadth'], 'agencyBreadth', ev),
    noveltyLeverage: requireNonEmptyStringArray(data['noveltyLeverage'], 'noveltyLeverage', ev),
    llmFeasibility: requireNonEmptyStringArray(data['llmFeasibility'], 'llmFeasibility', ev),
    ironicPremise: requireNonEmptyStringArray(data['ironicPremise'], 'ironicPremise', ev),
    sceneGenerativePower: requireNonEmptyStringArray(
      data['sceneGenerativePower'],
      'sceneGenerativePower',
      ev,
    ),
  };
}

export function parseSingleScoringResponse(
  parsed: unknown,
  concept: ConceptSpec,
): ScoredConcept {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'Single concept scoring response must be an object',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }
  const data = parsed as Record<string, unknown>;
  if (!data['scoredConcept'] || typeof data['scoredConcept'] !== 'object') {
    throw new LLMError(
      'Single concept scoring response missing scoredConcept',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }
  const sc = data['scoredConcept'] as Record<string, unknown>;
  const scores = parseScores(sc['scores']);
  const scoreEvidence = parseScoreEvidence(sc['scoreEvidence']);
  return {
    concept,
    scores,
    scoreEvidence,
    overallScore: computeOverallScore(scores),
    passes: passesConceptThresholds(scores),
  };
}

export function parseSingleDeepEvalResponse(
  parsed: unknown,
  scored: ScoredConcept,
): EvaluatedConcept {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'Single concept deep-eval response must be an object',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }
  const data = parsed as Record<string, unknown>;
  if (!data['evaluatedConcept'] || typeof data['evaluatedConcept'] !== 'object') {
    throw new LLMError(
      'Single concept deep-eval response missing evaluatedConcept',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }
  const ec = data['evaluatedConcept'] as Record<string, unknown>;
  const label = 'Single concept deep-eval';
  return {
    concept: scored.concept,
    scores: scored.scores,
    overallScore: scored.overallScore,
    passes: scored.passes,
    strengths: requireNonEmptyStringArray(ec['strengths'], 'strengths', label),
    weaknesses: requireNonEmptyStringArray(ec['weaknesses'], 'weaknesses', label),
    tradeoffSummary: requireNonEmptyString(ec['tradeoffSummary'], 'tradeoffSummary', label),
  };
}

export async function evaluateSingleConcept(
  concept: ConceptSpec,
  userSeeds: ConceptSeedInput,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<{ scoredConcept: ScoredConcept; evaluatedConcept: EvaluatedConcept }> {
  return runTwoPhaseLlmStage({
    firstStage: {
      stageModel: 'conceptEvaluator',
      promptType: 'conceptEvaluator',
      apiKey,
      options,
      schema: CONCEPT_SINGLE_SCORING_SCHEMA,
      messages: buildSingleConceptScoringPrompt(concept, userSeeds),
      parseResponse: (parsed) => parseSingleScoringResponse(parsed, concept),
      allowJsonRepair: false,
    },
    secondStage: (scored) => ({
      stageModel: 'conceptEvaluator',
      promptType: 'conceptEvaluator',
      apiKey,
      options,
      schema: CONCEPT_SINGLE_DEEP_EVAL_SCHEMA,
      messages: buildSingleConceptDeepEvalPrompt(concept, scored, userSeeds),
      parseResponse: (parsed) => parseSingleDeepEvalResponse(parsed, scored),
      allowJsonRepair: false,
    }),
    combineResult: ({ firstStageParsed, secondStageParsed }) => ({
      scoredConcept: firstStageParsed,
      evaluatedConcept: secondStageParsed,
    }),
  });
}
