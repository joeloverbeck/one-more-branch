import { logger } from '../logging/index.js';
import {
  computeOverallScore,
  type ConceptDimensionScores,
  type ConceptEvaluationResult,
  type ConceptEvaluatorContext,
  type EvaluatedConcept,
} from '../models/index.js';
import { parseConceptSpec } from './concept-spec-parser.js';
import { runConceptStage } from './concept-stage-runner.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import { buildConceptEvaluatorPrompt } from './prompts/concept-evaluator-prompt.js';
import { CONCEPT_EVALUATION_SCHEMA } from './schemas/concept-evaluator-schema.js';

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
  const label = `Evaluated concept ${index + 1}`;
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

function parseEvaluatedConcept(value: unknown, index: number): EvaluatedConcept {
  const label = `Evaluated concept ${index + 1}`;

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(`${label} must be an object`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = value as Record<string, unknown>;
  const concept = parseConceptSpec(data['concept'], index, 'Evaluated concept');
  const scores = parseScores(data['scores'], index);

  const strengths = requireNonEmptyStringArray(data['strengths'], 'strengths', label);
  const weaknesses = requireNonEmptyStringArray(data['weaknesses'], 'weaknesses', label);
  const tradeoffSummary = requireNonEmptyString(data['tradeoffSummary'], 'tradeoffSummary', label);

  return {
    concept,
    scores,
    overallScore: computeOverallScore(scores),
    strengths,
    weaknesses,
    tradeoffSummary,
  };
}

export function parseConceptEvaluationResponse(parsed: unknown): readonly EvaluatedConcept[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Concept evaluation response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data['evaluatedConcepts'])) {
    throw new LLMError(
      'Concept evaluation response missing evaluatedConcepts array',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const evaluatedConcepts = data['evaluatedConcepts'];
  if (evaluatedConcepts.length < 1 || evaluatedConcepts.length > 3) {
    throw new LLMError(
      `Concept evaluation response must include 1-3 concepts (received: ${evaluatedConcepts.length})`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const parsedConcepts = evaluatedConcepts.map((concept, index) => parseEvaluatedConcept(concept, index));

  return parsedConcepts.sort((a, b) => b.overallScore - a.overallScore);
}

export async function evaluateConcepts(
  context: ConceptEvaluatorContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<ConceptEvaluationResult> {
  const messages = buildConceptEvaluatorPrompt(context);
  const result = await runConceptStage({
    stageModel: 'conceptEvaluator',
    promptType: 'conceptEvaluator',
    apiKey,
    options,
    schema: CONCEPT_EVALUATION_SCHEMA,
    messages,
    parseResponse: parseConceptEvaluationResponse,
  });

  return {
    evaluatedConcepts: result.parsed,
    rawResponse: result.rawResponse,
  };
}
