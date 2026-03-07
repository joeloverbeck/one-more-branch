import {
  isContentPacketRole,
  type ContentEvaluation,
  type ContentEvaluationScores,
  type ContentEvaluatorContext,
  type ContentEvaluatorResult,
} from '../models/content-packet.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import { runLlmStage } from './llm-stage-runner.js';
import { buildContentEvaluatorPrompt } from './prompts/content-evaluator-prompt.js';
import { buildContentEvaluatorSchema } from './schemas/content-evaluator-schema.js';

const SCORE_KEYS: readonly (keyof ContentEvaluationScores)[] = [
  'imageCharge',
  'humanAche',
  'socialLoadBearing',
  'branchingPressure',
  'antiGenericity',
  'sceneBurst',
  'structuralIrony',
  'conceptUtility',
] as const;

function validateScores(
  data: Record<string, unknown>,
  index: number,
): ContentEvaluationScores {
  const raw = data['scores'];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new LLMError(
      `evaluations[${index}].scores must be an object`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const scores = raw as Record<string, unknown>;
  const result: Record<string, number> = {};

  for (const key of SCORE_KEYS) {
    const value = scores[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 5) {
      throw new LLMError(
        `evaluations[${index}].scores.${key} must be a number between 0 and 5`,
        'STRUCTURE_PARSE_ERROR',
        true,
      );
    }
    result[key] = value;
  }

  return result as unknown as ContentEvaluationScores;
}

function validateStringArray(
  data: Record<string, unknown>,
  field: string,
  index: number,
): readonly string[] {
  const value = data[field];
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((item: unknown) => typeof item === 'string' && item.trim().length > 0)
  ) {
    throw new LLMError(
      `evaluations[${index}].${field} must be a non-empty array of non-empty strings`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }
  return value as readonly string[];
}

function validateEvaluation(value: unknown, index: number): ContentEvaluation {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(
      `evaluations[${index}] must be an object`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const data = value as Record<string, unknown>;

  const contentId = data['contentId'];
  if (typeof contentId !== 'string' || contentId.trim().length === 0) {
    throw new LLMError(
      `evaluations[${index}].contentId must be a non-empty string`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const scores = validateScores(data, index);
  const strengths = validateStringArray(data, 'strengths', index);
  const weaknesses = validateStringArray(data, 'weaknesses', index);

  if (!isContentPacketRole(data['recommendedRole'])) {
    throw new LLMError(
      `evaluations[${index}].recommendedRole must be one of PRIMARY_SEED, SECONDARY_MUTAGEN, IMAGE_ONLY, REJECT`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return {
    contentId,
    scores,
    strengths,
    weaknesses,
    recommendedRole: data['recommendedRole'],
  };
}

export function parseContentEvaluatorResponse(
  parsed: unknown,
): readonly ContentEvaluation[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'Content evaluator response must be an object',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const data = parsed as Record<string, unknown>;
  const evaluations = data['evaluations'];

  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    throw new LLMError(
      'evaluations must be a non-empty array',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return evaluations.map((evaluation, index) => validateEvaluation(evaluation, index));
}

export async function evaluateContentPackets(
  context: ContentEvaluatorContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<ContentEvaluatorResult> {
  const messages = buildContentEvaluatorPrompt(context);
  const result = await runLlmStage({
    stageModel: 'contentEvaluator',
    promptType: 'contentEvaluator',
    apiKey,
    options,
    schema: buildContentEvaluatorSchema(),
    messages,
    parseResponse: parseContentEvaluatorResponse,
  });

  return {
    evaluations: result.parsed,
    rawResponse: result.rawResponse,
  };
}
