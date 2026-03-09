import { getStageModel } from '../config/stage-model.js';
import { getConfig } from '../config/index.js';
import { logger, logPrompt } from '../logging/index.js';
import {
  OPENROUTER_API_URL,
  extractResponseContent,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from './http-client.js';
import { buildCharAgencyPrompt, type CharAgencyPromptContext } from './prompts/char-agency-prompt.js';
import { withModelFallback } from './model-fallback.js';
import { withRetry } from './retry.js';
import { CHAR_AGENCY_GENERATION_SCHEMA } from './schemas/char-agency-schema.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import type { AgencyModel } from '../models/character-pipeline-types.js';
import { isEmotionSalience, isReplanningPolicy } from '../models/character-enums.js';

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

async function fetchCharAgency(
  apiKey: string,
  model: string,
  messages: ReturnType<typeof buildCharAgencyPrompt>,
  temperature: number,
  maxTokens: number
): Promise<CharAgencyGenerationResult> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'One More Branch',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: CHAR_AGENCY_GENERATION_SCHEMA,
    }),
  });

  if (!response.ok) {
    const errorDetails = await readErrorDetails(response);
    const retryable = response.status === 429 || response.status >= 500;
    throw new LLMError(errorDetails.message, `HTTP_${response.status}`, retryable, {
      httpStatus: response.status,
      model,
      rawErrorBody: errorDetails.rawBody,
      parsedError: errorDetails.parsedError,
    });
  }

  const data = await readJsonResponse(response);
  const content = extractResponseContent(data, 'char-agency', model, maxTokens);

  const parsedMessage = parseMessageJsonContent(content);
  const responseText = parsedMessage.rawText;
  try {
    const agencyModel = parseCharAgencyResponse(parsedMessage.parsed);
    return { agencyModel, rawResponse: responseText };
  } catch (error) {
    if (error instanceof LLMError) {
      throw new LLMError(error.message, error.code, error.retryable, {
        rawContent: responseText,
      });
    }
    throw error;
  }
}

export async function generateCharAgency(
  context: CharAgencyPromptContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<CharAgencyGenerationResult> {
  const config = getConfig().llm;
  const primaryModel = options?.model ?? getStageModel('charAgency');
  const temperature = options?.temperature ?? config.temperature;
  const maxTokens = options?.maxTokens ?? config.maxTokens;

  const messages = buildCharAgencyPrompt(context);
  logPrompt(logger, 'charAgency', messages);

  return withRetry(() =>
    withModelFallback(
      (m) => fetchCharAgency(apiKey, m, messages, temperature, maxTokens),
      primaryModel,
      'charAgency'
    )
  );
}
