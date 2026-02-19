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

import { parseConceptSpec } from './concept-spec-parser.js';
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

function parseScoredConcept(value: unknown, index: number): ScoredConcept {
  const label = `Scored concept ${index + 1}`;

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(`${label} must be an object`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = value as Record<string, unknown>;
  const concept = parseConceptSpec(data['concept'], index, 'Scored concept');
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

function conceptIdentityKey(concept: ConceptSpec): string {
  return [
    concept.oneLineHook,
    concept.elevatorParagraph,
    concept.genreFrame,
    concept.genreSubversion,
    concept.protagonistRole,
    concept.coreCompetence,
    concept.coreFlaw,
    concept.coreConflictLoop,
    concept.conflictAxis,
    concept.conflictType,
    concept.pressureSource,
    concept.stakesPersonal,
    concept.stakesSystemic,
    concept.deadlineMechanism,
    concept.settingScale,
    concept.branchingPosture,
    concept.stateComplexity,
    concept.actionVerbs.join('|'),
    concept.settingAxioms.join('|'),
    concept.constraintSet.join('|'),
    concept.keyInstitutions.join('|'),
  ].join('::');
}

function ensureExactConceptCoverage(
  parsedConcepts: readonly { concept: ConceptSpec }[],
  expectedConcepts: readonly ConceptSpec[],
  label: string,
): void {
  if (parsedConcepts.length !== expectedConcepts.length) {
    throw new LLMError(
      `${label} must include exactly ${expectedConcepts.length} concepts (received: ${parsedConcepts.length})`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const expected = new Set(expectedConcepts.map((concept) => conceptIdentityKey(concept)));
  const received = new Set(parsedConcepts.map((item) => conceptIdentityKey(item.concept)));

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

  const parsedConcepts = data['scoredConcepts'].map((concept, index) => parseScoredConcept(concept, index));
  ensureExactConceptCoverage(parsedConcepts, expectedConcepts, 'Concept scoring response');
  return parsedConcepts.sort((a, b) => b.overallScore - a.overallScore);
}

function parseDeepEvaluatedConcept(value: unknown, index: number): Omit<EvaluatedConcept, 'scores' | 'overallScore' | 'passes'> {
  const label = `Evaluated concept ${index + 1}`;

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(`${label} must be an object`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = value as Record<string, unknown>;
  const concept = parseConceptSpec(data['concept'], index, 'Evaluated concept');
  const strengths = requireNonEmptyStringArray(data['strengths'], 'strengths', label);
  const weaknesses = requireNonEmptyStringArray(data['weaknesses'], 'weaknesses', label);
  const tradeoffSummary = requireNonEmptyString(data['tradeoffSummary'], 'tradeoffSummary', label);

  return {
    concept,
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

  ensureExactConceptCoverage(parsedConcepts, selectedConcepts.map((item) => item.concept), 'Concept deep-evaluation response');

  const scoredByIdentity = new Map<string, ScoredConcept>(
    selectedConcepts.map((item) => [conceptIdentityKey(item.concept), item]),
  );

  const merged = parsedConcepts.map((item) => {
    const identity = conceptIdentityKey(item.concept);
    const scored = scoredByIdentity.get(identity);
    if (!scored) {
      throw new LLMError(
        'Concept deep-evaluation response included an unknown concept',
        'STRUCTURE_PARSE_ERROR',
        true,
      );
    }

    return {
      concept: item.concept,
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
  return runTwoPhaseLlmStage({
    firstStage: {
      stageModel: 'conceptEvaluator',
      promptType: 'conceptEvaluator',
      apiKey,
      options,
      schema: CONCEPT_EVALUATION_SCORING_SCHEMA,
      messages: buildConceptEvaluatorScoringPrompt(context),
      parseResponse: (parsed) => parseConceptScoringResponse(parsed, context.concepts),
    },
    secondStage: (scoredConcepts) => ({
      stageModel: 'conceptEvaluator',
      promptType: 'conceptEvaluator',
      apiKey,
      options,
      schema: CONCEPT_EVALUATION_DEEP_SCHEMA,
      messages: buildConceptEvaluatorDeepEvalPrompt(context, scoredConcepts),
      parseResponse: (parsed) => parseConceptDeepEvaluationResponse(parsed, scoredConcepts),
    }),
    combineResult: ({ firstStageParsed, secondStageParsed, secondStageRawResponse }) => ({
      scoredConcepts: firstStageParsed,
      evaluatedConcepts: secondStageParsed,
      rawResponse: secondStageRawResponse,
    }),
  });
}
