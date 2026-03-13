import { getStageModel } from '../config/stage-model.js';
import { getConfig } from '../config/index.js';
import type { SpeechFingerprint } from '../models/decomposed-character.js';
import { isEmotionSalience } from '../models/character-enums.js';
import type { StandaloneDecomposedCharacter } from '../models/standalone-decomposed-character.js';
import { logger, logPrompt, logResponse } from '../logging/index.js';
import type { JsonSchema, ChatMessage } from './llm-client-types.js';
import {
  OPENROUTER_API_URL,
  extractResponseContent,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from './http-client.js';
import {
  SPEECH_ARRAY_FIELDS,
  SPEECH_STRING_FIELDS,
} from './entity-decomposition-contract.js';
import { LLMError } from './llm-client-types.js';
import { withModelFallback } from './model-fallback.js';
import {
  buildCharacterDecomposerPrompt,
  type CharacterDecomposerPromptContext,
} from './prompts/character-decomposer-prompt.js';
import { withRetry } from './retry.js';
import { CHARACTER_DECOMPOSITION_SCHEMA } from './schemas/character-decomposer-schema.js';

function parseStringField(raw: Record<string, unknown>, key: string): string {
  return typeof raw[key] === 'string' ? raw[key] : '';
}

function parseStringArrayField(raw: Record<string, unknown>, key: string): string[] {
  return Array.isArray(raw[key])
    ? (raw[key] as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];
}

function parseSpeechFingerprint(raw: Record<string, unknown>): SpeechFingerprint {
  const fp = raw['speechFingerprint'];
  if (typeof fp !== 'object' || fp === null || Array.isArray(fp)) {
    throw new LLMError('Character missing speechFingerprint', 'DECOMPOSITION_PARSE_ERROR', true);
  }

  const fpData = fp as Record<string, unknown>;
  const speech = {} as Record<keyof SpeechFingerprint, string | string[]>;

  for (const field of SPEECH_STRING_FIELDS) {
    speech[field] = parseStringField(fpData, field);
  }

  for (const field of SPEECH_ARRAY_FIELDS) {
    speech[field] = parseStringArrayField(fpData, field);
  }

  return speech as SpeechFingerprint;
}

export interface CharacterDecompositionResult {
  readonly character: Omit<StandaloneDecomposedCharacter, 'id' | 'createdAt'>;
  readonly rawResponse: string;
}

function parseCharacterDecompositionResponse(
  parsed: unknown,
  context: CharacterDecomposerPromptContext
): Omit<CharacterDecompositionResult, 'rawResponse'> {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'Character decomposition response must be an object',
      'DECOMPOSITION_PARSE_ERROR',
      true
    );
  }

  const data = parsed as Record<string, unknown>;

  if (typeof data['name'] !== 'string' || data['name'].trim().length === 0) {
    throw new LLMError('Character decomposition missing name', 'DECOMPOSITION_PARSE_ERROR', true);
  }

  const speechFingerprint = parseSpeechFingerprint(data);

  const superObjective = parseStringField(data, 'superObjective');
  const pressurePoint = parseStringField(data, 'pressurePoint');
  const stakes = parseStringArrayField(data, 'stakes');
  const personalDilemmas = parseStringArrayField(data, 'personalDilemmas');
  const rawEmotionSalience = data['emotionSalience'];

  return {
    character: {
      name: data['name'].trim(),
      rawDescription: context.characterDescription,
      speechFingerprint,
      coreTraits: parseStringArrayField(data, 'coreTraits'),
      knowledgeBoundaries: parseStringField(data, 'knowledgeBoundaries'),
      falseBeliefs: parseStringArrayField(data, 'falseBeliefs'),
      secretsKept: parseStringArrayField(data, 'secretsKept'),
      decisionPattern: parseStringField(data, 'decisionPattern'),
      coreBeliefs: parseStringArrayField(data, 'coreBeliefs'),
      conflictPriority: parseStringField(data, 'conflictPriority'),
      appearance: parseStringField(data, 'appearance'),
      ...(superObjective ? { superObjective } : {}),
      ...(stakes.length > 0 ? { stakes } : {}),
      ...(pressurePoint ? { pressurePoint } : {}),
      ...(personalDilemmas.length > 0 ? { personalDilemmas } : {}),
      ...(isEmotionSalience(rawEmotionSalience) ? { emotionSalience: rawEmotionSalience } : {}),
    },
  };
}

interface DecompositionRequest<TParsed> {
  readonly model: string;
  readonly temperature: number;
  readonly maxTokens: number;
  readonly responseLabel: string;
  readonly messages: ChatMessage[];
  readonly schema: JsonSchema;
  readonly parseResponse: (parsed: unknown) => TParsed;
}

async function fetchDecomposition<TParsed>(
  apiKey: string,
  request: DecompositionRequest<TParsed>
): Promise<TParsed & { rawResponse: string }> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'One More Branch',
    },
    body: JSON.stringify({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      response_format: request.schema,
    }),
  });

  if (!response.ok) {
    const errorDetails = await readErrorDetails(response);
    const retryable = response.status === 429 || response.status >= 500;
    throw new LLMError(errorDetails.message, `HTTP_${response.status}`, retryable, {
      httpStatus: response.status,
      model: request.model,
      rawErrorBody: errorDetails.rawBody,
      parsedError: errorDetails.parsedError,
    });
  }

  const responseData = await readJsonResponse(response);
  const content = extractResponseContent(
    responseData,
    request.responseLabel,
    request.model,
    request.maxTokens
  );

  const parsedMessage = parseMessageJsonContent(content);
  const responseText = parsedMessage.rawText;
  try {
    const result = request.parseResponse(parsedMessage.parsed);
    return { ...result, rawResponse: responseText };
  } catch (error) {
    if (error instanceof LLMError) {
      throw new LLMError(error.message, error.code, error.retryable, {
        rawContent: responseText,
      });
    }
    throw error;
  }
}

export async function decomposeCharacter(
  context: CharacterDecomposerPromptContext,
  apiKey: string
): Promise<CharacterDecompositionResult> {
  const config = getConfig().llm;
  const primaryModel = getStageModel('characterDecomposer');
  const temperature = config.temperature;
  const maxTokens = config.maxTokens;

  const messages = buildCharacterDecomposerPrompt(context);
  logPrompt(logger, 'characterDecomposer', messages);

  const result = await withRetry(() =>
    withModelFallback(
      (model) =>
        fetchDecomposition(apiKey, {
          model,
          temperature,
          maxTokens,
          responseLabel: 'character-decomposer',
          messages,
          schema: CHARACTER_DECOMPOSITION_SCHEMA,
          parseResponse: (parsed) => parseCharacterDecompositionResponse(parsed, context),
        }),
      primaryModel,
      'characterDecomposer'
    )
  );
  logResponse(logger, 'characterDecomposer', result.rawResponse);
  return result;
}
