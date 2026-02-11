import { getConfig } from '../config/index.js';
import { logger } from '../logging/index.js';
import {
  OPENROUTER_API_URL,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from './http-client.js';
import { isStructuredOutputNotSupported } from './schemas/error-detection.js';
import { PAGE_PLANNER_GENERATION_SCHEMA } from './schemas/page-planner-schema.js';
import { validatePagePlannerResponse } from './schemas/page-planner-response-transformer.js';
import {
  LLMError,
  type ChatMessage,
  type GenerationObservabilityContext,
  type GenerationOptions,
  type PagePlanGenerationResult,
} from './types.js';

function buildObservabilityContext(
  context: GenerationObservabilityContext | undefined,
): Record<string, unknown> {
  return {
    storyId: context?.storyId ?? null,
    pageId: context?.pageId ?? null,
    requestId: context?.requestId ?? null,
  };
}

function withObservabilityContext(
  error: LLMError,
  observability: GenerationObservabilityContext | undefined,
): LLMError {
  return new LLMError(error.message, error.code, error.retryable, {
    ...(error.context ?? {}),
    ...buildObservabilityContext(observability),
  });
}

function emitPlannerValidatorFailureCounters(
  error: LLMError,
  observability: GenerationObservabilityContext | undefined,
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
    logger.error('Planner validator failure counter', {
      ruleKey,
      count,
      ...buildObservabilityContext(observability),
    });
  }
}

async function callPlannerStructured(
  messages: ChatMessage[],
  options: GenerationOptions,
): Promise<PagePlanGenerationResult> {
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
      response_format: PAGE_PLANNER_GENERATION_SCHEMA,
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
    return validatePagePlannerResponse(parsed, rawContent);
  } catch (error) {
    logger.error('Page planner structured response validation failed', {
      rawResponse: rawContent,
      ...buildObservabilityContext(options.observability),
    });

    if (error instanceof LLMError) {
      emitPlannerValidatorFailureCounters(error, options.observability);
      throw withObservabilityContext(error, options.observability);
    }

    const message = error instanceof Error ? error.message : 'Failed to validate structured response';
    throw new LLMError(message, 'VALIDATION_ERROR', false, {
      rawResponse: rawContent,
      ...buildObservabilityContext(options.observability),
    });
  }
}

export async function generatePlannerWithFallback(
  messages: ChatMessage[],
  options: GenerationOptions,
): Promise<PagePlanGenerationResult> {
  try {
    return await callPlannerStructured(messages, options);
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
