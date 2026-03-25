import {
  type ContentSpark,
  type SparkstormerContext,
  type SparkstormerResult,
} from '../models/content-generation-contracts.js';
import { isContentKind } from '../models/content-taxonomy.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import { runLlmStage } from './llm-stage-runner.js';
import { buildSparkstormerPrompt } from './prompts/content-sparkstormer-prompt.js';
import { buildContentSparkstormerSchema } from './schemas/content-sparkstormer-schema.js';

function validateSpark(value: unknown, index: number): ContentSpark {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(`sparks[${index}] must be an object`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = value as Record<string, unknown>;

  if (typeof data['sparkId'] !== 'string' || data['sparkId'].trim().length === 0) {
    throw new LLMError(
      `sparks[${index}].sparkId must be a non-empty string`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!isContentKind(data['contentKind'])) {
    throw new LLMError(
      `sparks[${index}].contentKind must be a valid ContentKind`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['spark'] !== 'string' || data['spark'].trim().length === 0) {
    throw new LLMError(
      `sparks[${index}].spark must be a non-empty string`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['imageSeed'] !== 'string' || data['imageSeed'].trim().length === 0) {
    throw new LLMError(
      `sparks[${index}].imageSeed must be a non-empty string`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (
    !Array.isArray(data['collisionTags']) ||
    data['collisionTags'].length === 0 ||
    !data['collisionTags'].every((t: unknown) => typeof t === 'string' && t.trim().length > 0)
  ) {
    throw new LLMError(
      `sparks[${index}].collisionTags must be a non-empty array of non-empty strings`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['playerRole'] !== 'string' || data['playerRole'].trim().length === 0) {
    throw new LLMError(
      `sparks[${index}].playerRole must be a non-empty string`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['want'] !== 'string' || data['want'].trim().length === 0) {
    throw new LLMError(
      `sparks[${index}].want must be a non-empty string`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['counterforce'] !== 'string' || data['counterforce'].trim().length === 0) {
    throw new LLMError(
      `sparks[${index}].counterforce must be a non-empty string`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['deepPatternRef'] !== 'string' || data['deepPatternRef'].trim().length === 0) {
    throw new LLMError(
      `sparks[${index}].deepPatternRef must be a non-empty string`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const sparkId = data['sparkId'];
  const spark = data['spark'];
  const imageSeed = data['imageSeed'];
  const collisionTags = data['collisionTags'];
  const playerRole = data['playerRole'];
  const want = data['want'];
  const counterforce = data['counterforce'];
  const deepPatternRef = data['deepPatternRef'];

  return {
    sparkId: sparkId,
    contentKind: data['contentKind'],
    spark: spark,
    imageSeed: imageSeed,
    collisionTags: collisionTags as readonly string[],
    playerRole: playerRole,
    want: want,
    counterforce: counterforce,
    deepPatternRef: deepPatternRef,
  };
}

export function parseSparkstormerResponse(parsed: unknown): readonly ContentSpark[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Sparkstormer response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;
  const sparks = data['sparks'];

  if (!Array.isArray(sparks) || sparks.length === 0) {
    throw new LLMError('sparks must be a non-empty array', 'STRUCTURE_PARSE_ERROR', true);
  }

  const validated = sparks.map((spark, index) => validateSpark(spark, index));

  const seenIds = new Set<string>();
  for (const spark of validated) {
    if (seenIds.has(spark.sparkId)) {
      throw new LLMError(`Duplicate sparkId: ${spark.sparkId}`, 'STRUCTURE_PARSE_ERROR', true);
    }
    seenIds.add(spark.sparkId);
  }

  return validated;
}

export async function generateSparks(
  context: SparkstormerContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<SparkstormerResult> {
  const messages = buildSparkstormerPrompt(context);
  const result = await runLlmStage({
    stageModel: 'contentSparkstormer',
    promptType: 'contentSparkstormer',
    apiKey,
    options,
    schema: buildContentSparkstormerSchema(),
    messages,
    parseResponse: parseSparkstormerResponse,
  });

  return {
    sparks: result.parsed,
    rawResponse: result.rawResponse,
  };
}
