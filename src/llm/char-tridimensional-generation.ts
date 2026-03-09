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
import {
  buildCharTridimensionalPrompt,
  type CharTridimensionalPromptContext,
} from './prompts/char-tridimensional-prompt.js';
import { withModelFallback } from './model-fallback.js';
import { withRetry } from './retry.js';
import { CHAR_TRIDIMENSIONAL_GENERATION_SCHEMA } from './schemas/char-tridimensional-schema.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import type { TridimensionalProfile } from '../models/character-pipeline-types.js';

export interface CharTridimensionalGenerationResult {
  readonly tridimensionalProfile: TridimensionalProfile;
  readonly rawResponse: string;
}

function parseCharTridimensionalResponse(parsed: unknown): TridimensionalProfile {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'Tridimensional profile response must be an object',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const data = parsed as Record<string, unknown>;

  if (typeof data['characterName'] !== 'string' || data['characterName'].trim().length === 0) {
    throw new LLMError(
      'Tridimensional profile response missing characterName',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['physiology'] !== 'string' || data['physiology'].trim().length === 0) {
    throw new LLMError(
      'Tridimensional profile response missing physiology',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['sociology'] !== 'string' || data['sociology'].trim().length === 0) {
    throw new LLMError(
      'Tridimensional profile response missing sociology',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['psychology'] !== 'string' || data['psychology'].trim().length === 0) {
    throw new LLMError(
      'Tridimensional profile response missing psychology',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['derivationChain'] !== 'string' || data['derivationChain'].trim().length === 0) {
    throw new LLMError(
      'Tridimensional profile response missing derivationChain',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!Array.isArray(data['coreTraits']) || data['coreTraits'].length === 0) {
    throw new LLMError(
      'Tridimensional profile response missing or empty coreTraits',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const coreTraits = (data['coreTraits'] as unknown[])
    .filter((item): item is string => typeof item === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return {
    characterName: (data['characterName']).trim(),
    physiology: (data['physiology']).trim(),
    sociology: (data['sociology']).trim(),
    psychology: (data['psychology']).trim(),
    derivationChain: (data['derivationChain']).trim(),
    coreTraits,
  };
}

async function fetchCharTridimensional(
  apiKey: string,
  model: string,
  messages: ReturnType<typeof buildCharTridimensionalPrompt>,
  temperature: number,
  maxTokens: number
): Promise<CharTridimensionalGenerationResult> {
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
      response_format: CHAR_TRIDIMENSIONAL_GENERATION_SCHEMA,
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
  const content = extractResponseContent(data, 'char-tridimensional', model, maxTokens);

  const parsedMessage = parseMessageJsonContent(content);
  const responseText = parsedMessage.rawText;
  try {
    const tridimensionalProfile = parseCharTridimensionalResponse(parsedMessage.parsed);
    return { tridimensionalProfile, rawResponse: responseText };
  } catch (error) {
    if (error instanceof LLMError) {
      throw new LLMError(error.message, error.code, error.retryable, {
        rawContent: responseText,
      });
    }
    throw error;
  }
}

export async function generateCharTridimensional(
  context: CharTridimensionalPromptContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<CharTridimensionalGenerationResult> {
  const config = getConfig().llm;
  const primaryModel = options?.model ?? getStageModel('charTridimensional');
  const temperature = options?.temperature ?? config.temperature;
  const maxTokens = options?.maxTokens ?? config.maxTokens;

  const messages = buildCharTridimensionalPrompt(context);
  logPrompt(logger, 'charTridimensional', messages);

  return withRetry(() =>
    withModelFallback(
      (m) => fetchCharTridimensional(apiKey, m, messages, temperature, maxTokens),
      primaryModel,
      'charTridimensional'
    )
  );
}
