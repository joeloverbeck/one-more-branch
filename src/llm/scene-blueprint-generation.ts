import { getStageModel, getStageMaxTokens } from '../config/stage-model.js';
import { logger } from '../logging/index.js';
import {
  OPENROUTER_API_URL,
  extractResponseContent,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from './http-client.js';
import { isStructuredOutputNotSupported } from './schemas/error-detection.js';
import { SCENE_BLUEPRINT_SCHEMA } from './schemas/scene-blueprint-schema.js';
import { validateSceneBlueprintResponse } from './schemas/scene-blueprint-response-transformer.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError, type ChatMessage } from './llm-client-types.js';
import type { SceneBlueprintResult } from './scene-blueprint-types.js';

const DEFAULT_BLUEPRINT_TEMPERATURE = 0.4;

async function callBlueprintStructured(
  messages: ChatMessage[],
  options: GenerationOptions
): Promise<SceneBlueprintResult> {
  const model = options.model ?? getStageModel('sceneBlueprint');
  const temperature = options.temperature ?? DEFAULT_BLUEPRINT_TEMPERATURE;
  const maxTokens = options.maxTokens ?? getStageMaxTokens('sceneBlueprint');
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'One More Branch',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: SCENE_BLUEPRINT_SCHEMA,
    }),
  });

  if (!response.ok) {
    const errorDetails = await readErrorDetails(response);
    logger.error(`OpenRouter API error [${response.status}]: ${errorDetails.message}`);
    const retryable = response.status === 429 || response.status >= 500;
    throw new LLMError(errorDetails.message, `HTTP_${response.status}`, retryable, {
      httpStatus: response.status,
      model,
      rawErrorBody: errorDetails.rawBody,
      parsedError: errorDetails.parsedError,
    });
  }

  const data = await readJsonResponse(response);
  const content = extractResponseContent(data, 'sceneBlueprint', model, maxTokens);

  const parsedMessage = parseMessageJsonContent(content);
  const parsed = parsedMessage.parsed;
  const rawContent = parsedMessage.rawText;

  try {
    return validateSceneBlueprintResponse(parsed, rawContent);
  } catch (error) {
    logger.error('Scene blueprint structured response validation failed', {
      rawResponse: rawContent,
    });

    if (error instanceof LLMError) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : 'Failed to validate structured response';
    throw new LLMError(message, 'VALIDATION_ERROR', true);
  }
}

export async function generateSceneBlueprintWithFallback(
  messages: ChatMessage[],
  options: GenerationOptions
): Promise<SceneBlueprintResult> {
  try {
    return await callBlueprintStructured(messages, options);
  } catch (error) {
    if (isStructuredOutputNotSupported(error)) {
      const model = options.model ?? getStageModel('sceneBlueprint');
      throw new LLMError(
        `Model "${model}" does not support structured outputs. Please use a compatible model.`,
        'STRUCTURED_OUTPUT_NOT_SUPPORTED',
        false,
        { model }
      );
    }

    throw error;
  }
}
