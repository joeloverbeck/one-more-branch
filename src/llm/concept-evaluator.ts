import { logger } from '../logging/index.js';
import {
  computeOverallScore,
  passesConceptThresholds,
  type ConceptDimensionScores,
  type ConceptEvaluationResult,
  type ConceptEvaluatorContext,
  type ConceptScoreEvidence,
  type ConceptSpec,
  type EvaluatedConcept,
  type ScoredConcept,
} from '../models/index.js';

import { runTwoPhaseLlmStage } from './llm-stage-runner.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import {
  buildConceptEvaluatorDeepEvalPrompt,
  buildConceptEvaluatorScoringPrompt,
} from './prompts/concept-evaluator-prompt.js';
import {
  CONCEPT_EVALUATION_DEEP_SCHEMA,
  CONCEPT_EVALUATION_SCORING_SCHEMA,
} from './schemas/concept-evaluator-schema.js';

function requireNonEmptyString(value: unknown, fieldName: string, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new LLMError(`${label} has invalid ${fieldName}`, 'STRUCTURE_PARSE_ERROR', true);
  }
  return value.trim();
}

function requireConceptId(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new LLMError(`${label} has invalid conceptId`, 'STRUCTURE_PARSE_ERROR', true);
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

function parseClampedScore(value: unknown, fieldName: keyof ConceptDimensionScores, label: string): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new LLMError(`${label} has invalid ${fieldName} score`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const clamped = Math.max(0, Math.min(5, value));
  if (clamped !== value) {
    logger.warn('Concept evaluator score clamped to 0-5 range', {
      fieldName,
      original: value,
      clamped,
    });
  }
  return clamped;
}

function parseScores(value: unknown, index: number): ConceptDimensionScores {
  const label = `Scored concept ${index + 1}`;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(`${label} has invalid scores`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = value as Record<string, unknown>;
  return {
    hookStrength: parseClampedScore(data['hookStrength'], 'hookStrength', label),
    conflictEngine: parseClampedScore(data['conflictEngine'], 'conflictEngine', label),
    agencyBreadth: parseClampedScore(data['agencyBreadth'], 'agencyBreadth', label),
    noveltyLeverage: parseClampedScore(data['noveltyLeverage'], 'noveltyLeverage', label),
    branchingFitness: parseClampedScore(data['branchingFitness'], 'branchingFitness', label),
    llmFeasibility: parseClampedScore(data['llmFeasibility'], 'llmFeasibility', label),
  };
}

function parseScoreEvidence(value: unknown, index: number): ConceptScoreEvidence {
  const label = `Scored concept ${index + 1}`;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(`${label} has invalid scoreEvidence`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = value as Record<string, unknown>;
  return {
    hookStrength: requireNonEmptyStringArray(data['hookStrength'], 'hookStrength', `${label} scoreEvidence`),
    conflictEngine: requireNonEmptyStringArray(
      data['conflictEngine'],
      'conflictEngine',
      `${label} scoreEvidence`,
    ),
    agencyBreadth: requireNonEmptyStringArray(
      data['agencyBreadth'],
      'agencyBreadth',
      `${label} scoreEvidence`,
    ),
    noveltyLeverage: requireNonEmptyStringArray(
      data['noveltyLeverage'],
      'noveltyLeverage',
      `${label} scoreEvidence`,
    ),
    branchingFitness: requireNonEmptyStringArray(
      data['branchingFitness'],
      'branchingFitness',
      `${label} scoreEvidence`,
    ),
    llmFeasibility: requireNonEmptyStringArray(
      data['llmFeasibility'],
      'llmFeasibility',
      `${label} scoreEvidence`,
    ),
  };
}

function parseScoredConcept(
  value: unknown,
  index: number,
  expectedConceptById: ReadonlyMap<string, ConceptSpec>,
): ScoredConcept {
  const label = `Scored concept ${index + 1}`;

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(`${label} must be an object`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = value as Record<string, unknown>;
  const conceptId = requireConceptId(data['conceptId'], label);
  const concept = expectedConceptById.get(conceptId);
  if (!concept) {
    throw new LLMError(`${label} references unknown conceptId`, 'STRUCTURE_PARSE_ERROR', true);
  }
  const scores = parseScores(data['scores'], index);
  const scoreEvidence = parseScoreEvidence(data['scoreEvidence'], index);

  return {
    concept,
    scores,
    scoreEvidence,
    overallScore: computeOverallScore(scores),
    passes: passesConceptThresholds(scores),
  };
}

function getConceptId(index: number): string {
  return `concept_${index + 1}`;
}

function buildExpectedConceptById(concepts: readonly ConceptSpec[]): Map<string, ConceptSpec> {
  return new Map(concepts.map((concept, index) => [getConceptId(index), concept]));
}

function ensureExactIdCoverage(
  parsedConceptIds: readonly string[],
  expectedConceptIds: readonly string[],
  label: string,
): void {
  if (parsedConceptIds.length !== expectedConceptIds.length) {
    throw new LLMError(
      `${label} must include exactly ${expectedConceptIds.length} concepts (received: ${parsedConceptIds.length})`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const expected = new Set(expectedConceptIds);
  const received = new Set(parsedConceptIds);

  if (expected.size !== received.size || [...expected].some((key) => !received.has(key))) {
    throw new LLMError(`${label} concept set does not match requested candidates`, 'STRUCTURE_PARSE_ERROR', true);
  }
}

export function parseConceptScoringResponse(
  parsed: unknown,
  expectedConcepts: readonly ConceptSpec[],
): readonly ScoredConcept[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Concept scoring response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data['scoredConcepts'])) {
    throw new LLMError(
      'Concept scoring response missing scoredConcepts array',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const expectedConceptById = buildExpectedConceptById(expectedConcepts);
  const parsedConcepts = data['scoredConcepts'].map((concept, index) =>
    parseScoredConcept(concept, index, expectedConceptById),
  );
  const parsedConceptIds = data['scoredConcepts'].map((item, index) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new LLMError(`Scored concept ${index + 1} must be an object`, 'STRUCTURE_PARSE_ERROR', true);
    }
    return requireConceptId((item as Record<string, unknown>)['conceptId'], `Scored concept ${index + 1}`);
  });
  ensureExactIdCoverage(parsedConceptIds, [...expectedConceptById.keys()], 'Concept scoring response');
  return parsedConcepts.sort((a, b) => b.overallScore - a.overallScore);
}

function parseDeepEvaluatedConcept(
  value: unknown,
  index: number,
): {
  conceptId: string;
  strengths: readonly string[];
  weaknesses: readonly string[];
  tradeoffSummary: string;
} {
  const label = `Evaluated concept ${index + 1}`;

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(`${label} must be an object`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = value as Record<string, unknown>;
  const conceptId = requireConceptId(data['conceptId'], label);
  const strengths = requireNonEmptyStringArray(data['strengths'], 'strengths', label);
  const weaknesses = requireNonEmptyStringArray(data['weaknesses'], 'weaknesses', label);
  const tradeoffSummary = requireNonEmptyString(data['tradeoffSummary'], 'tradeoffSummary', label);

  return {
    conceptId,
    strengths,
    weaknesses,
    tradeoffSummary,
  };
}

function parseConceptDeepEvaluationResponse(
  parsed: unknown,
  selectedConcepts: readonly ScoredConcept[],
): readonly EvaluatedConcept[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Concept deep-evaluation response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data['evaluatedConcepts'])) {
    throw new LLMError(
      'Concept deep-evaluation response missing evaluatedConcepts array',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const parsedConcepts = data['evaluatedConcepts'].map((concept, index) =>
    parseDeepEvaluatedConcept(concept, index),
  );

  const expectedConceptById = buildExpectedConceptById(selectedConcepts.map((item) => item.concept));
  ensureExactIdCoverage(
    parsedConcepts.map((item) => item.conceptId),
    [...expectedConceptById.keys()],
    'Concept deep-evaluation response',
  );

  const scoredById = new Map<string, ScoredConcept>(
    selectedConcepts.map((item, index) => [getConceptId(index), item]),
  );

  const merged = parsedConcepts.map((item) => {
    const scored = scoredById.get(item.conceptId);
    if (!scored) {
      throw new LLMError(
        'Concept deep-evaluation response included an unknown conceptId',
        'STRUCTURE_PARSE_ERROR',
        true,
      );
    }

    return {
      concept: scored.concept,
      scores: scored.scores,
      overallScore: scored.overallScore,
      passes: scored.passes,
      strengths: item.strengths,
      weaknesses: item.weaknesses,
      tradeoffSummary: item.tradeoffSummary,
    };
  });

  return merged.sort((a, b) => b.overallScore - a.overallScore);
}

export async function evaluateConcepts(
  context: ConceptEvaluatorContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<ConceptEvaluationResult> {
  const conceptIds = context.concepts.map((_, index) => getConceptId(index));

  return runTwoPhaseLlmStage({
    firstStage: {
      stageModel: 'conceptEvaluator',
      promptType: 'conceptEvaluator',
      apiKey,
      options,
      schema: CONCEPT_EVALUATION_SCORING_SCHEMA,
      messages: buildConceptEvaluatorScoringPrompt(context, conceptIds),
      parseResponse: (parsed) => parseConceptScoringResponse(parsed, context.concepts),
      allowJsonRepair: false,
    },
    secondStage: (scoredConcepts) => ({
      stageModel: 'conceptEvaluator',
      promptType: 'conceptEvaluator',
      apiKey,
      options,
      schema: CONCEPT_EVALUATION_DEEP_SCHEMA,
      messages: buildConceptEvaluatorDeepEvalPrompt(context, scoredConcepts, conceptIds),
      parseResponse: (parsed) => parseConceptDeepEvaluationResponse(parsed, scoredConcepts),
      allowJsonRepair: false,
    }),
    combineResult: ({ firstStageParsed, secondStageParsed, secondStageRawResponse }) => ({
      scoredConcepts: firstStageParsed,
      evaluatedConcepts: secondStageParsed,
      rawResponse: secondStageRawResponse,
    }),
  });
}
