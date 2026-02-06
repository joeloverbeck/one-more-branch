import { getConfig } from '../config/index.js';
import { logger } from '../logging/index.js';
import { extractOutputFromCoT } from './cot-parser.js';
import { buildFallbackSystemPromptAddition, parseTextResponse } from './fallback-parser.js';
import { OPENROUTER_API_URL, readErrorDetails, readJsonResponse } from './http-client.js';
import {
  isStructuredOutputNotSupported,
  STORY_GENERATION_SCHEMA,
  validateGenerationResponse,
} from './schemas.js';
import {
  LLMError,
  type ChatMessage,
  type GenerationOptions,
  type GenerationResult,
} from './types.js';

async function callOpenRouterStructured(
  messages: ChatMessage[],
  options: GenerationOptions,
): Promise<GenerationResult> {
  const config = getConfig().llm;
  const model = options.model ?? config.defaultModel;
  const temperature = options.temperature ?? config.temperature;
  const maxTokens = options.maxTokens ?? config.maxTokens;
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
      response_format: STORY_GENERATION_SCHEMA,
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
    return validateGenerationResponse(parsed, content);
  } catch (error) {
    logger.error('LLM structured response validation failed', { rawResponse: content });

    if (error instanceof LLMError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Failed to validate structured response';
    throw new LLMError(message, 'VALIDATION_ERROR', true);
  }
}

function withFallbackInstructions(messages: ChatMessage[]): ChatMessage[] {
  const addition = buildFallbackSystemPromptAddition();
  const firstSystemIndex = messages.findIndex(message => message.role === 'system');

  if (firstSystemIndex === -1) {
    return [{ role: 'system', content: addition.trim() }, ...messages];
  }

  return messages.map((message, index) => {
    if (index !== firstSystemIndex) {
      return message;
    }

    return {
      ...message,
      content: `${message.content}${addition}`,
    };
  });
}

async function callOpenRouterText(
  messages: ChatMessage[],
  options: GenerationOptions,
): Promise<GenerationResult> {
  const config = getConfig().llm;
  const model = options.model ?? config.defaultModel;
  const temperature = options.temperature ?? config.temperature;
  const maxTokens = options.maxTokens ?? config.maxTokens;
  const enableCoT = options.promptOptions?.enableChainOfThought ?? config.promptOptions.enableChainOfThought;

  const fallbackMessages = withFallbackInstructions(messages);

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
      messages: fallbackMessages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorDetails = await readErrorDetails(response);
    logger.error(`OpenRouter API error (text fallback) [${response.status}]: ${errorDetails.message}`);
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

  try {
    return parseTextResponse(content);
  } catch (error) {
    if (error instanceof LLMError) {
      logger.error('LLM response parsing failed', {
        code: error.code,
        rawResponse: content,
      });
    }
    throw error;
  }
}

export async function generateWithFallback(
  messages: ChatMessage[],
  options: GenerationOptions,
): Promise<GenerationResult> {
  if (options.forceTextParsing) {
    return callOpenRouterText(messages, options);
  }

  try {
    return await callOpenRouterStructured(messages, options);
  } catch (error) {
    if (isStructuredOutputNotSupported(error)) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn('Model lacks structured output support, using text parsing fallback', {
        errorMessage,
        model: options.model ?? getConfig().llm.defaultModel,
      });
      return callOpenRouterText(messages, options);
    }

    throw error;
  }
}
