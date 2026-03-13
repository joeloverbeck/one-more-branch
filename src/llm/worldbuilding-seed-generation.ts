import { getStageModel, getStageMaxTokens } from '../config/stage-model.js';
import { getConfig } from '../config/index.js';
import type { WorldSeed } from '../models/world-seed.js';
import { logger, logPrompt, logResponse } from '../logging/index.js';
import type { ChatMessage, JsonSchema } from './llm-client-types.js';
import { LLMError } from './llm-client-types.js';
import {
  OPENROUTER_API_URL,
  extractResponseContent,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from './http-client.js';
import { withModelFallback } from './model-fallback.js';
import {
  buildWorldSeedPrompt,
  type WorldSeedPromptContext,
} from './prompts/worldbuilding-seed-prompt.js';
import { withRetry } from './retry.js';
import { WORLDBUILDING_SEED_SCHEMA } from './schemas/worldbuilding-seed-schema.js';

export interface WorldSeedGenerationResult {
  readonly worldSeed: WorldSeed;
  readonly rawResponse: string;
}

interface GenerationRequest<TParsed> {
  readonly model: string;
  readonly temperature: number;
  readonly maxTokens: number;
  readonly responseLabel: string;
  readonly messages: ChatMessage[];
  readonly schema: JsonSchema;
  readonly parseResponse: (parsed: unknown) => TParsed;
}

async function fetchGeneration<TParsed>(
  apiKey: string,
  request: GenerationRequest<TParsed>,
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
    request.maxTokens,
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

function parseSeedResponse(parsed: unknown): Omit<WorldSeedGenerationResult, 'rawResponse'> {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'World seed response must be an object',
      'WORLD_SEED_PARSE_ERROR',
      true,
    );
  }

  return { worldSeed: parsed as WorldSeed };
}

export async function generateWorldSeed(
  context: WorldSeedPromptContext,
  apiKey: string,
): Promise<WorldSeedGenerationResult> {
  const config = getConfig().llm;
  const primaryModel = getStageModel('worldbuildingSeed');
  const temperature = config.temperature;
  const maxTokens = getStageMaxTokens('worldbuildingSeed');

  const messages = buildWorldSeedPrompt(context);
  logPrompt(logger, 'worldbuildingSeed', messages);

  const result = await withRetry(() =>
    withModelFallback(
      (model) =>
        fetchGeneration(apiKey, {
          model,
          temperature,
          maxTokens,
          responseLabel: 'worldbuilding-seed',
          messages,
          schema: WORLDBUILDING_SEED_SCHEMA,
          parseResponse: parseSeedResponse,
        }),
      primaryModel,
      'worldbuildingSeed',
    ),
  );

  logResponse(logger, 'worldbuildingSeed', result.rawResponse);
  return result;
}
