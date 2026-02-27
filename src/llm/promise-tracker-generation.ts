import { getStageModel } from '../config/stage-model.js';
import { logger } from '../logging/index.js';
import {
  OPENROUTER_API_URL,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from './http-client.js';
import { isStructuredOutputNotSupported } from './schemas/error-detection.js';
import { PROMISE_TRACKER_SCHEMA } from './schemas/promise-tracker-schema.js';
import { validatePromiseTrackerResponse } from './schemas/promise-tracker-response-transformer.js';
import type { PromiseTrackerResult } from './promise-tracker-types.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError, type ChatMessage } from './llm-client-types.js';

const DEFAULT_PROMISE_TRACKER_TEMPERATURE = 0.3;
const DEFAULT_PROMISE_TRACKER_MAX_TOKENS = 8192;

async function callPromiseTrackerStructured(
  messages: ChatMessage[],
  options: GenerationOptions
): Promise<PromiseTrackerResult & { rawResponse: string }> {
  const model = options.model ?? getStageModel('promiseTracker');
  const temperature = options.temperature ?? DEFAULT_PROMISE_TRACKER_TEMPERATURE;
  const maxTokens = options.maxTokens ?? DEFAULT_PROMISE_TRACKER_MAX_TOKENS;
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
      response_format: PROMISE_TRACKER_SCHEMA,
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
  const content = data.choices[0]?.message?.content;

  if (!content) {
    const finishReason = data.choices[0]?.finish_reason ?? 'unknown';
    const usage = data.usage;
    logger.warn('Promise tracker received empty content from OpenRouter', {
      finishReason,
      usage,
      model,
      choicesLength: data.choices?.length ?? 0,
    });
    throw new LLMError('Empty response from OpenRouter', 'EMPTY_RESPONSE', true, {
      finishReason,
      usage,
      model,
    });
  }

  const parsedMessage = parseMessageJsonContent(content);
  const parsed = parsedMessage.parsed;
  const rawContent = parsedMessage.rawText;

  try {
    return validatePromiseTrackerResponse(parsed, rawContent);
  } catch (error) {
    logger.error('Promise tracker structured response validation failed', {
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

export async function generatePromiseTrackerWithFallback(
  messages: ChatMessage[],
  options: GenerationOptions
): Promise<PromiseTrackerResult & { rawResponse: string }> {
  try {
    return await callPromiseTrackerStructured(messages, options);
  } catch (error) {
    if (isStructuredOutputNotSupported(error)) {
      const model = options.model ?? getStageModel('promiseTracker');
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
