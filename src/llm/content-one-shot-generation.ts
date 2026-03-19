import {
  isContentKind,
  type ContentOneShotContext,
  type ContentPacket,
  type ContentOneShotResult,
} from '../models/content-packet.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import { runLlmStage } from './llm-stage-runner.js';
import { buildContentOneShotPrompt } from './prompts/content-one-shot-prompt.js';
import { buildContentOneShotSchema } from './schemas/content-one-shot-schema.js';

const REQUIRED_PACKET_FIELDS = [
  'contentId',
  'contentKind',
  'coreAnomaly',
  'humanAnchor',
  'socialEngine',
  'choicePressure',
  'signatureImage',
  'escalationPath',
  'wildnessInvariant',
  'dullCollapse',
] as const;

function parsePacket(raw: unknown, index: number): ContentPacket {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new LLMError(`Packet at index ${index} must be an object`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = raw as Record<string, unknown>;

  for (const field of REQUIRED_PACKET_FIELDS) {
    if (typeof data[field] !== 'string' || data[field].trim().length === 0) {
      throw new LLMError(
        `Packet at index ${index} missing or empty required field: ${field}`,
        'STRUCTURE_PARSE_ERROR',
        true
      );
    }
  }

  if (!isContentKind(data['contentKind'])) {
    throw new LLMError(
      `Packet at index ${index} has invalid contentKind: ${String(data['contentKind'])}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (
    !Array.isArray(data['interactionVerbs']) ||
    data['interactionVerbs'].length < 4 ||
    data['interactionVerbs'].length > 6 ||
    !data['interactionVerbs'].every((verb: unknown) => typeof verb === 'string' && verb.trim().length > 0)
  ) {
    throw new LLMError(
      `Packet at index ${index} missing or invalid required field: interactionVerbs`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  return {
    contentId: data['contentId'] as string,
    contentKind: data['contentKind'],
    coreAnomaly: data['coreAnomaly'] as string,
    humanAnchor: data['humanAnchor'] as string,
    socialEngine: data['socialEngine'] as string,
    choicePressure: data['choicePressure'] as string,
    signatureImage: data['signatureImage'] as string,
    escalationPath: data['escalationPath'] as string,
    wildnessInvariant: data['wildnessInvariant'] as string,
    dullCollapse: data['dullCollapse'] as string,
    interactionVerbs: data['interactionVerbs'] as readonly string[],
  };
}

export function parseContentOneShotResponse(parsed: unknown): readonly ContentPacket[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'Content one-shot response must be an object',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data['packets'])) {
    throw new LLMError(
      'Content one-shot response missing packets array',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (data['packets'].length < 1) {
    throw new LLMError(
      'Content one-shot response must include at least 1 packet',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  return data['packets'].map((packet, index) => parsePacket(packet, index));
}

export async function generateContentOneShot(
  context: ContentOneShotContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<ContentOneShotResult> {
  const messages = buildContentOneShotPrompt(context);
  const result = await runLlmStage({
    stageModel: 'contentOneShot',
    promptType: 'contentOneShot',
    apiKey,
    options,
    schema: buildContentOneShotSchema(),
    messages,
    parseResponse: parseContentOneShotResponse,
  });

  return {
    packets: result.parsed,
    rawResponse: result.rawResponse,
  };
}
