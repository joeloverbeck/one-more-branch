import { getConfig } from '../config/index.js';
import { logger } from '../logging/index.js';
import { extractOutputFromCoT } from './cot-parser.js';
import { OPENROUTER_API_URL, readErrorDetails, readJsonResponse } from './http-client.js';
import { isStructuredOutputNotSupported } from './schemas/error-detection.js';
import { ANALYST_SCHEMA } from './schemas/analyst-schema.js';
import { validateAnalystResponse } from './schemas/analyst-response-transformer.js';
import {
  LLMError,
  type ChatMessage,
  type GenerationOptions,
  type AnalystResult,
} from './types.js';

const DEFAULT_ANALYST_TEMPERATURE = 0.3;
const DEFAULT_ANALYST_MAX_TOKENS = 1024;

async function callAnalystStructured(
  messages: ChatMessage[],
  options: GenerationOptions,
): Promise<AnalystResult> {
  const config = getConfig().llm;
  const model = options.model ?? config.defaultModel;
  const temperature = options.temperature ?? DEFAULT_ANALYST_TEMPERATURE;
  const maxTokens = options.maxTokens ?? DEFAULT_ANALYST_MAX_TOKENS;
  const enableCoT = options.promptOptions?.enableChainOfThought ?? config.promptOptions.enableChainOfThought;

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
      response_format: ANALYST_SCHEMA,
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
  let content = data.choices[0]?.message?.content;

  if (!content) {
    throw new LLMError('Empty response from OpenRouter', 'EMPTY_RESPONSE', true);
  }

  // Extract output from CoT format if CoT was enabled
  if (enableCoT) {
    content = extractOutputFromCoT(content);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch {
    throw new LLMError('Invalid JSON response from OpenRouter', 'INVALID_JSON', true);
  }

  try {
    return validateAnalystResponse(parsed, content);
  } catch (error) {
    logger.error('Analyst structured response validation failed', { rawResponse: content });

    if (error instanceof LLMError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Failed to validate structured response';
    throw new LLMError(message, 'VALIDATION_ERROR', true);
  }
}

export async function generateAnalystWithFallback(
  messages: ChatMessage[],
  options: GenerationOptions,
): Promise<AnalystResult> {
  try {
    return await callAnalystStructured(messages, options);
  } catch (error) {
    if (isStructuredOutputNotSupported(error)) {
      const model = options.model ?? getConfig().llm.defaultModel;
      throw new LLMError(
        `Model "${model}" does not support structured outputs. Please use a compatible model like Claude Sonnet 4.5, GPT-4, or Gemini.`,
        'STRUCTURED_OUTPUT_NOT_SUPPORTED',
        false,
        { model },
      );
    }

    throw error;
  }
}
