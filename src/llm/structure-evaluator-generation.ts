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
import { STRUCTURE_EVALUATOR_SCHEMA } from './schemas/structure-evaluator-schema.js';
import { validateStructureEvaluatorResponse } from './schemas/structure-evaluator-response-transformer.js';
import type { StructureEvaluatorResult } from './structure-evaluator-types.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError, type ChatMessage } from './llm-client-types.js';

const DEFAULT_STRUCTURE_EVALUATOR_TEMPERATURE = 0.3;

async function callStructureEvaluatorStructured(
  messages: ChatMessage[],
  options: GenerationOptions
): Promise<StructureEvaluatorResult & { rawResponse: string }> {
  const model = options.model ?? getStageModel('structureEvaluator');
  const temperature = options.temperature ?? DEFAULT_STRUCTURE_EVALUATOR_TEMPERATURE;
  const maxTokens = options.maxTokens ?? getStageMaxTokens('structureEvaluator');
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
      response_format: STRUCTURE_EVALUATOR_SCHEMA,
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
  const content = extractResponseContent(data, 'structure-evaluator', model, maxTokens);

  const parsedMessage = parseMessageJsonContent(content);
  const parsed = parsedMessage.parsed;
  const rawContent = parsedMessage.rawText;

  try {
    return validateStructureEvaluatorResponse(parsed, rawContent);
  } catch (error) {
    logger.error('Structure evaluator structured response validation failed', {
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

export async function generateStructureEvaluatorWithFallback(
  messages: ChatMessage[],
  options: GenerationOptions
): Promise<StructureEvaluatorResult & { rawResponse: string }> {
  try {
    return await callStructureEvaluatorStructured(messages, options);
  } catch (error) {
    if (isStructuredOutputNotSupported(error)) {
      const model = options.model ?? getStageModel('structureEvaluator');
      throw new LLMError(
        `Model "${model}" does not support structured outputs. Please use a compatible model like Claude Sonnet 4.5, GPT-4, or Gemini.`,
        'STRUCTURED_OUTPUT_NOT_SUPPORTED',
        false,
        { model }
      );
    }

    throw error;
  }
}
