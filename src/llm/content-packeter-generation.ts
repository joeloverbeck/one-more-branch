import {
  isContentKind,
  type ContentPacket,
  type ContentPacketerContext,
  type ContentPacketerResult,
} from '../models/content-packet.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import { runLlmStage } from './llm-stage-runner.js';
import { buildContentPacketerPrompt } from './prompts/content-packeter-prompt.js';
import { buildContentPacketerSchema } from './schemas/content-packeter-schema.js';

function validateStringField(
  data: Record<string, unknown>,
  field: string,
  index: number,
): string {
  const value = data[field];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new LLMError(
      `packets[${index}].${field} must be a non-empty string`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }
  return value;
}

function validatePacket(value: unknown, index: number): ContentPacket {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(
      `packets[${index}] must be an object`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const data = value as Record<string, unknown>;

  const contentId = validateStringField(data, 'contentId', index);

  if (
    !Array.isArray(data['sourceSparkIds']) ||
    data['sourceSparkIds'].length === 0 ||
    !data['sourceSparkIds'].every(
      (id: unknown) => typeof id === 'string' && id.trim().length > 0,
    )
  ) {
    throw new LLMError(
      `packets[${index}].sourceSparkIds must be a non-empty array of non-empty strings`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  if (!isContentKind(data['contentKind'])) {
    throw new LLMError(
      `packets[${index}].contentKind must be a valid ContentKind`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const coreAnomaly = validateStringField(data, 'coreAnomaly', index);
  const humanAnchor = validateStringField(data, 'humanAnchor', index);
  const socialEngine = validateStringField(data, 'socialEngine', index);
  const choicePressure = validateStringField(data, 'choicePressure', index);
  const signatureImage = validateStringField(data, 'signatureImage', index);
  const escalationPath = validateStringField(data, 'escalationPath', index);
  const wildnessInvariant = validateStringField(data, 'wildnessInvariant', index);
  const dullCollapse = validateStringField(data, 'dullCollapse', index);

  if (
    !Array.isArray(data['interactionVerbs']) ||
    data['interactionVerbs'].length < 4 ||
    data['interactionVerbs'].length > 6 ||
    !data['interactionVerbs'].every(
      (v: unknown) => typeof v === 'string' && v.trim().length > 0,
    )
  ) {
    throw new LLMError(
      `packets[${index}].interactionVerbs must be an array of 4-6 non-empty strings`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return {
    contentId,
    sourceSparkIds: data['sourceSparkIds'] as readonly string[],
    contentKind: data['contentKind'],
    coreAnomaly,
    humanAnchor,
    socialEngine,
    choicePressure,
    signatureImage,
    escalationPath,
    wildnessInvariant,
    dullCollapse,
    interactionVerbs: data['interactionVerbs'] as readonly string[],
  };
}

export function parseContentPacketerResponse(parsed: unknown): readonly ContentPacket[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'Content packeter response must be an object',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const data = parsed as Record<string, unknown>;
  const packets = data['packets'];

  if (!Array.isArray(packets) || packets.length === 0) {
    throw new LLMError(
      'packets must be a non-empty array',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return packets.map((packet, index) => validatePacket(packet, index));
}

export async function generateContentPackets(
  context: ContentPacketerContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<ContentPacketerResult> {
  const messages = buildContentPacketerPrompt(context);
  const result = await runLlmStage({
    stageModel: 'contentPacketer',
    promptType: 'contentPacketer',
    apiKey,
    options,
    schema: buildContentPacketerSchema(),
    messages,
    parseResponse: parseContentPacketerResponse,
  });

  return {
    packets: result.parsed,
    rawResponse: result.rawResponse,
  };
}
