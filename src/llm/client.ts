import { logger, logPrompt } from '../logging/index.js';
import { extractOutputFromCoT } from './cot-parser.js';
import { buildFallbackSystemPromptAddition, parseTextResponse } from './fallback-parser.js';
import { buildContinuationPrompt, buildOpeningPrompt } from './prompts.js';
import {
  isStructuredOutputNotSupported,
  STORY_GENERATION_SCHEMA,
  validateGenerationResponse,
} from './schemas.js';
import {
  LLMError,
  type ChatMessage,
  type ContinuationContext,
  type GenerationOptions,
  type GenerationResult,
  type OpenRouterResponse,
  type OpeningContext,
  type PromptOptions,
} from './types.js';

/**
 * Default prompt options - all enhancements enabled for maximum story quality.
 * Users pay for their own API keys, so these defaults prioritize quality over token savings.
 */
const DEFAULT_PROMPT_OPTIONS: PromptOptions = {
  fewShotMode: 'minimal',
  enableChainOfThought: true,
  choiceGuidance: 'strict',
};

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.5';

async function callOpenRouterStructured(
  messages: ChatMessage[],
  options: GenerationOptions,
): Promise<GenerationResult> {
  const model = options.model ?? DEFAULT_MODEL;
  const temperature = options.temperature ?? 0.8;
  const maxTokens = options.maxTokens ?? 8192;
  const enableCoT = options.promptOptions?.enableChainOfThought ?? true;

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
    const errorMessage = await readErrorMessage(response);
    const retryable = response.status === 429 || response.status >= 500;
    throw new LLMError(errorMessage, `HTTP_${response.status}`, retryable);
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
  const model = options.model ?? DEFAULT_MODEL;
  const temperature = options.temperature ?? 0.8;
  const maxTokens = options.maxTokens ?? 8192;
  const enableCoT = options.promptOptions?.enableChainOfThought ?? true;

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
    const errorMessage = await readErrorMessage(response);
    const retryable = response.status === 429 || response.status >= 500;
    throw new LLMError(errorMessage, `HTTP_${response.status}`, retryable);
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

  return parseTextResponse(content);
}

async function generateWithFallback(
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
      logger.warn('Model lacks structured output support, using text parsing fallback');
      return callOpenRouterText(messages, options);
    }

    throw error;
  }
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (error instanceof LLMError && !error.retryable) {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * 2 ** attempt;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new LLMError('Generation failed after retries', 'UNKNOWN_ERROR', true);
}

async function readJsonResponse(response: Response): Promise<OpenRouterResponse> {
  try {
    return (await response.json()) as OpenRouterResponse;
  } catch {
    throw new LLMError('Invalid JSON response from OpenRouter', 'INVALID_JSON', true);
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  let errorText = '';

  try {
    errorText = await response.text();
  } catch {
    return `OpenRouter request failed with status ${response.status}`;
  }

  if (!errorText) {
    return `OpenRouter request failed with status ${response.status}`;
  }

  try {
    const parsed = JSON.parse(errorText) as { error?: { message?: string } };
    return parsed.error?.message ?? errorText;
  } catch {
    return errorText;
  }
}

/**
 * Merges user-provided prompt options with defaults.
 * All enhancements are enabled by default for maximum story quality.
 */
function resolvePromptOptions(options: GenerationOptions): PromptOptions {
  return {
    ...DEFAULT_PROMPT_OPTIONS,
    ...options.promptOptions,
  };
}

export async function generateOpeningPage(
  context: OpeningContext,
  options: GenerationOptions,
): Promise<GenerationResult> {
  const promptOptions = resolvePromptOptions(options);
  const messages = buildOpeningPrompt(context, promptOptions);

  logPrompt(logger, 'opening', messages);

  const resolvedOptions = { ...options, promptOptions };
  return withRetry(() => generateWithFallback(messages, resolvedOptions));
}

export async function generateContinuationPage(
  context: ContinuationContext,
  options: GenerationOptions,
): Promise<GenerationResult> {
  const promptOptions = resolvePromptOptions(options);
  const messages = buildContinuationPrompt(context, promptOptions);

  logPrompt(logger, 'continuation', messages);

  const resolvedOptions = { ...options, promptOptions };
  return withRetry(() => generateWithFallback(messages, resolvedOptions));
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      }),
    });

    return response.status !== 401;
  } catch {
    return true;
  }
}
