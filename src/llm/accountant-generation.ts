import { getStageModel } from '../config/stage-model.js';
import { getConfig } from '../config/index.js';
import { logger } from '../logging/index.js';
import {
  OPENROUTER_API_URL,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from './http-client.js';
import { isStructuredOutputNotSupported } from './schemas/error-detection.js';
import { STATE_ACCOUNTANT_SCHEMA } from './schemas/state-accountant-schema.js';
import { validateStateAccountantResponse } from './schemas/state-accountant-response-transformer.js';
import type {
  GenerationObservabilityContext,
  GenerationOptions,
} from './generation-pipeline-types.js';
import { LLMError, type ChatMessage, type JsonSchema } from './llm-client-types.js';
import type { StateAccountantGenerationResult } from './accountant-types.js';

function buildObservabilityContext(
  context: GenerationObservabilityContext | undefined
): Record<string, unknown> {
  return {
    storyId: context?.storyId ?? null,
    pageId: context?.pageId ?? null,
    requestId: context?.requestId ?? null,
  };
}

function withObservabilityContext(
  error: LLMError,
  observability: GenerationObservabilityContext | undefined
): LLMError {
  return new LLMError(error.message, error.code, error.retryable, {
    ...(error.context ?? {}),
    ...buildObservabilityContext(observability),
  });
}

function emitAccountantValidatorFailureCounters(
  error: LLMError,
  observability: GenerationObservabilityContext | undefined
): void {
  const validationIssuesRaw = error.context?.['validationIssues'];
  if (!Array.isArray(validationIssuesRaw)) {
    return;
  }

  const validationIssues: unknown[] = validationIssuesRaw;
  const countsByRule = new Map<string, number>();
  for (const issue of validationIssues) {
    if (typeof issue !== 'object' || issue === null) {
      continue;
    }

    const ruleKey = (issue as Record<string, unknown>)['ruleKey'];
    if (typeof ruleKey !== 'string') {
      continue;
    }

    countsByRule.set(ruleKey, (countsByRule.get(ruleKey) ?? 0) + 1);
  }

  for (const [ruleKey, count] of countsByRule.entries()) {
    logger.error('Accountant validator failure counter', {
      ruleKey,
      count,
      ...buildObservabilityContext(observability),
    });
  }
}

async function callAccountantStructured(
  messages: ChatMessage[],
  options: GenerationOptions,
  responseFormat: JsonSchema = STATE_ACCOUNTANT_SCHEMA
): Promise<StateAccountantGenerationResult> {
  const config = getConfig().llm;
  const model = options.model ?? getStageModel('accountant');
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
      response_format: responseFormat,
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

  const parsedMessage = parseMessageJsonContent(content);
  const parsed = parsedMessage.parsed;
  const rawContent = parsedMessage.rawText;

  try {
    return validateStateAccountantResponse(parsed, rawContent);
  } catch (error) {
    logger.error('State accountant structured response validation failed', {
      rawResponse: rawContent,
      ...buildObservabilityContext(options.observability),
    });

    if (error instanceof LLMError) {
      emitAccountantValidatorFailureCounters(error, options.observability);
      throw withObservabilityContext(error, options.observability);
    }

    const message =
      error instanceof Error ? error.message : 'Failed to validate structured response';
    throw new LLMError(message, 'VALIDATION_ERROR', false, {
      rawResponse: rawContent,
      ...buildObservabilityContext(options.observability),
    });
  }
}

function buildLenientAccountantSchema(): JsonSchema {
  return {
    ...STATE_ACCOUNTANT_SCHEMA,
    json_schema: {
      ...STATE_ACCOUNTANT_SCHEMA.json_schema,
      strict: false,
    },
  };
}

function isAccountantGrammarTooLargeError(error: unknown): boolean {
  const signalPhrases = ['compiled grammar is too large', 'reduce the number of strict tools'];

  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const rawErrorBody =
    error instanceof LLMError && typeof error.context?.['rawErrorBody'] === 'string'
      ? error.context['rawErrorBody']
      : '';

  const combined = `${message}\n${rawErrorBody}`.toLowerCase();
  return signalPhrases.some((phrase) => combined.includes(phrase));
}

export async function generateAccountantWithFallback(
  messages: ChatMessage[],
  options: GenerationOptions
): Promise<StateAccountantGenerationResult> {
  try {
    return await callAccountantStructured(messages, options);
  } catch (error) {
    if (isAccountantGrammarTooLargeError(error)) {
      return callAccountantStructured(messages, options, buildLenientAccountantSchema());
    }

    if (isStructuredOutputNotSupported(error)) {
      const model = options.model ?? getStageModel('accountant');
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
