import { getConfig } from '../config/index.js';
import { logger } from '../logging/index.js';
import { OPENROUTER_API_URL, readErrorDetails, readJsonResponse } from './http-client.js';
import { isStructuredOutputNotSupported } from './schemas/error-detection.js';
import { WRITER_GENERATION_SCHEMA } from './schemas/writer-schema.js';
import { validateWriterResponse } from './schemas/writer-response-transformer.js';
import {
  LLMError,
  type ChatMessage,
  type GenerationOptions,
  type WriterResult,
} from './types.js';

async function callWriterStructured(
  messages: ChatMessage[],
  options: GenerationOptions,
): Promise<WriterResult> {
  const config = getConfig().llm;
  const model = options.model ?? config.defaultModel;
  const temperature = options.temperature ?? config.temperature;
  const maxTokens = options.maxTokens ?? config.maxTokens;
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
      response_format: WRITER_GENERATION_SCHEMA,
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
    throw new LLMError('Empty response from OpenRouter', 'EMPTY_RESPONSE', true);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch {
    throw new LLMError('Invalid JSON response from OpenRouter', 'INVALID_JSON', true);
  }

  try {
    return validateWriterResponse(parsed, content);
  } catch (error) {
    logger.error('Writer structured response validation failed', { rawResponse: content });

    if (error instanceof LLMError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Failed to validate structured response';
    throw new LLMError(message, 'VALIDATION_ERROR', true);
  }
}

export async function generateWriterWithFallback(
  messages: ChatMessage[],
  options: GenerationOptions,
): Promise<WriterResult> {
  try {
    return await callWriterStructured(messages, options);
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
