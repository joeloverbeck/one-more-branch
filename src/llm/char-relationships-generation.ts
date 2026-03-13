import type { DeepRelationshipResult } from '../models/character-pipeline-types.js';
import {
  isPipelineRelationshipType,
  isRelationshipValence,
} from '../models/character-enums.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import {
  buildCharRelationshipsPrompt,
  type CharRelationshipsPromptContext,
} from './prompts/char-relationships-prompt.js';
import { CHAR_RELATIONSHIPS_GENERATION_SCHEMA } from './schemas/char-relationships-schema.js';
import { runLlmStage } from './llm-stage-runner.js';

export interface CharRelationshipsGenerationResult {
  readonly deepRelationships: DeepRelationshipResult;
  readonly rawResponse: string;
}

function parseRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new LLMError(
      `Deep relationships response missing ${fieldName}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  return value.trim();
}

function parseRequiredStringArray(data: Record<string, unknown>, key: string): string[] {
  const rawValue = data[key];
  if (!Array.isArray(rawValue) || rawValue.length === 0) {
    throw new LLMError(
      `Deep relationships response missing or empty ${key}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  return rawValue.map((item) => parseRequiredString(item, `${key} item`));
}

function parseRelationships(data: Record<string, unknown>): DeepRelationshipResult['relationships'] {
  const rawRelationships = data['relationships'];
  if (!Array.isArray(rawRelationships)) {
    throw new LLMError(
      'Deep relationships response missing relationships',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  return rawRelationships.map((item, index) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new LLMError(
        `Deep relationships response relationship ${index} must be an object`,
        'STRUCTURE_PARSE_ERROR',
        true
      );
    }

    const relationship = item as Record<string, unknown>;
    const relationshipType = relationship['relationshipType'];
    if (!isPipelineRelationshipType(relationshipType)) {
      throw new LLMError(
        `Deep relationships response invalid relationshipType: ${String(relationshipType)}`,
        'STRUCTURE_PARSE_ERROR',
        true
      );
    }

    const valence = relationship['valence'];
    if (!isRelationshipValence(valence)) {
      throw new LLMError(
        `Deep relationships response invalid valence: ${String(valence)}`,
        'STRUCTURE_PARSE_ERROR',
        true
      );
    }

    const numericValence = relationship['numericValence'];
    if (
      typeof numericValence !== 'number' ||
      !Number.isFinite(numericValence) ||
      numericValence < -5 ||
      numericValence > 5
    ) {
      throw new LLMError(
        `Deep relationships response invalid numericValence: ${String(numericValence)}`,
        'STRUCTURE_PARSE_ERROR',
        true
      );
    }

    const rawRupture = relationship['ruptureTriggers'];
    const ruptureTriggers = Array.isArray(rawRupture)
      ? rawRupture.filter((r): r is string => typeof r === 'string').map((s) => s.trim()).filter((s) => s.length > 0)
      : [];

    const rawRepair = relationship['repairMoves'];
    const repairMoves = Array.isArray(rawRepair)
      ? rawRepair.filter((r): r is string => typeof r === 'string').map((s) => s.trim()).filter((s) => s.length > 0)
      : [];

    return {
      fromCharacter: parseRequiredString(relationship['fromCharacter'], 'fromCharacter'),
      toCharacter: parseRequiredString(relationship['toCharacter'], 'toCharacter'),
      relationshipType,
      valence,
      numericValence,
      history: parseRequiredString(relationship['history'], 'history'),
      currentTension: parseRequiredString(relationship['currentTension'], 'currentTension'),
      leverage: parseRequiredString(relationship['leverage'], 'leverage'),
      ruptureTriggers,
      repairMoves,
    };
  });
}

function parseCharRelationshipsResponse(parsed: unknown): DeepRelationshipResult {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'Deep relationships response must be an object',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const data = parsed as Record<string, unknown>;
  return {
    relationships: parseRelationships(data),
    secrets: parseRequiredStringArray(data, 'secrets'),
    personalDilemmas: parseRequiredStringArray(data, 'personalDilemmas'),
  };
}

export async function generateCharRelationships(
  context: CharRelationshipsPromptContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<CharRelationshipsGenerationResult> {
  const messages = buildCharRelationshipsPrompt(context);
  const result = await runLlmStage({
    stageModel: 'charRelationships',
    promptType: 'charRelationships',
    apiKey,
    options,
    schema: CHAR_RELATIONSHIPS_GENERATION_SCHEMA,
    messages,
    parseResponse: parseCharRelationshipsResponse,
  });

  return {
    deepRelationships: result.parsed,
    rawResponse: result.rawResponse,
  };
}
