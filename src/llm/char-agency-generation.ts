import { buildCharAgencyPrompt, type CharAgencyPromptContext } from './prompts/char-agency-prompt.js';
import { CHAR_AGENCY_GENERATION_SCHEMA } from './schemas/char-agency-schema.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import type { AgencyModel } from '../models/character-pipeline-types.js';
import { isEmotionSalience, isReplanningPolicy } from '../models/character-enums.js';
import { runLlmStage } from './llm-stage-runner.js';

export interface CharAgencyGenerationResult {
  readonly agencyModel: AgencyModel;
  readonly rawResponse: string;
}

function parseRequiredStringArray(data: Record<string, unknown>, key: string): string[] {
  const rawValue = data[key];
  if (!Array.isArray(rawValue) || rawValue.length === 0) {
    throw new LLMError(
      `Agency model response missing or empty ${key}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const parsedValues = rawValue.map((item) => {
    if (typeof item !== 'string') {
      throw new LLMError(
        `Agency model response ${key} must contain only strings`,
        'STRUCTURE_PARSE_ERROR',
        true
      );
    }

    const trimmed = item.trim();
    if (trimmed.length === 0) {
      throw new LLMError(
        `Agency model response ${key} must not contain blank strings`,
        'STRUCTURE_PARSE_ERROR',
        true
      );
    }

    return trimmed;
  });

  return parsedValues;
}

function parseCharAgencyResponse(parsed: unknown): AgencyModel {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Agency model response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;

  if (typeof data['characterName'] !== 'string' || data['characterName'].trim().length === 0) {
    throw new LLMError(
      'Agency model response missing characterName',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!isReplanningPolicy(data['replanningPolicy'])) {
    throw new LLMError(
      `Agency model response invalid replanningPolicy: ${String(data['replanningPolicy'])}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!isEmotionSalience(data['emotionSalience'])) {
    throw new LLMError(
      `Agency model response invalid emotionSalience: ${String(data['emotionSalience'])}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['decisionPattern'] !== 'string' || data['decisionPattern'].trim().length === 0) {
    throw new LLMError(
      'Agency model response missing decisionPattern',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  return {
    characterName: data['characterName'].trim(),
    replanningPolicy: data['replanningPolicy'],
    emotionSalience: data['emotionSalience'],
    coreBeliefs: parseRequiredStringArray(data, 'coreBeliefs'),
    desires: parseRequiredStringArray(data, 'desires'),
    currentIntentions: parseRequiredStringArray(data, 'currentIntentions'),
    falseBeliefs: parseRequiredStringArray(data, 'falseBeliefs'),
    decisionPattern: data['decisionPattern'].trim(),
  };
}

export async function generateCharAgency(
  context: CharAgencyPromptContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<CharAgencyGenerationResult> {
  const messages = buildCharAgencyPrompt(context);
  const result = await runLlmStage({
    stageModel: 'charAgency',
    promptType: 'charAgency',
    apiKey,
    options,
    schema: CHAR_AGENCY_GENERATION_SCHEMA,
    messages,
    parseResponse: parseCharAgencyResponse,
  });

  return {
    agencyModel: result.parsed,
    rawResponse: result.rawResponse,
  };
}
