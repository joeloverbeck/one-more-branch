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
import { WRITER_GENERATION_SCHEMA } from './schemas/writer-schema.js';
import { validateWriterResponse } from './schemas/writer-response-transformer.js';
import {
  extractWriterValidationIssues,
  validateWriterOutput,
  WriterOutputValidationError,
  type WriterOutputValidationIssue,
} from './validation/writer-output-validator.js';
import { repairWriterRemovalIdFieldMismatches } from './validation/writer-id-repair.js';
import { repairCorruptedChoices } from './validation/writer-choice-repair.js';
import type {
  GenerationObservabilityContext,
  GenerationOptions,
} from './generation-pipeline-types.js';
import { LLMError, type ChatMessage } from './llm-client-types.js';
import type { PageWriterResult } from './writer-types.js';

function buildObservabilityContext(
  context: GenerationObservabilityContext | undefined
): Record<string, unknown> {
  return {
    storyId: context?.storyId ?? null,
    pageId: context?.pageId ?? null,
    requestId: context?.requestId ?? null,
  };
}

function emitValidatorFailureCounters(
  issues: readonly WriterOutputValidationIssue[],
  observability: GenerationObservabilityContext | undefined
): void {
  const countsByRule = new Map<string, number>();
  for (const issue of issues) {
    countsByRule.set(issue.ruleKey, (countsByRule.get(issue.ruleKey) ?? 0) + 1);
  }

  for (const [ruleKey, count] of countsByRule.entries()) {
    logger.error('Writer validator failure counter', {
      ruleKey,
      count,
      ...buildObservabilityContext(observability),
    });
  }
}

async function callWriterStructured(
  messages: ChatMessage[],
  options: GenerationOptions
): Promise<PageWriterResult> {
  const config = getConfig().llm;
  const model = options.model ?? getStageModel('writer');
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

  const parsedMessage = parseMessageJsonContent(content);
  const parsed = parsedMessage.parsed;
  const rawContent = parsedMessage.rawText;
  const repairResult = repairWriterRemovalIdFieldMismatches(
    parsed,
    options.writerValidationContext
  );
  if (repairResult.repairs.length > 0) {
    logger.info('Writer removal ID field mismatch repaired', {
      repairs: repairResult.repairs,
      ...buildObservabilityContext(options.observability),
    });
  }

  const choiceRepairResult = repairCorruptedChoices(repairResult.repairedJson);
  if (choiceRepairResult.repaired) {
    logger.warn('Writer corrupted choices repaired', {
      repairDetails: choiceRepairResult.repairDetails,
      ...buildObservabilityContext(options.observability),
    });
  }

  try {
    const validated = validateWriterResponse(choiceRepairResult.repairedJson, rawContent);
    const validationIssues = validateWriterOutput(validated);
    if (validationIssues.length > 0) {
      throw new WriterOutputValidationError(validationIssues);
    }

    return validated;
  } catch (error) {
    const issues = extractWriterValidationIssues(error);
    emitValidatorFailureCounters(issues, options.observability);
    logger.error('Writer structured response validation failed', {
      rawResponse: rawContent,
      validationIssues: issues,
      ...buildObservabilityContext(options.observability),
    });

    if (error instanceof LLMError) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : 'Failed to validate structured response';
    throw new LLMError(message, 'VALIDATION_ERROR', true, {
      rawResponse: rawContent,
      validationIssues: issues,
      ruleKeys: [...new Set(issues.map((issue) => issue.ruleKey))],
      ...buildObservabilityContext(options.observability),
    });
  }
}

export async function generateWriterWithFallback(
  messages: ChatMessage[],
  options: GenerationOptions
): Promise<PageWriterResult> {
  try {
    return await callWriterStructured(messages, options);
  } catch (error) {
    if (isStructuredOutputNotSupported(error)) {
      const model = options.model ?? getStageModel('writer');
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
