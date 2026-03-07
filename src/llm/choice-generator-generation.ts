import { getStageModel } from '../config/stage-model.js';
import { getConfig } from '../config/index.js';
import { logger } from '../logging/index.js';
import {
  OPENROUTER_API_URL,
  extractResponseContent,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from './http-client.js';
import { isStructuredOutputNotSupported } from './schemas/error-detection.js';
import { CHOICE_GENERATOR_SCHEMA } from './schemas/choice-generator-schema.js';
import { validateChoiceGeneratorResponse } from './schemas/choice-generator-response-transformer.js';
import { repairCorruptedChoices } from './validation/writer-choice-repair.js';
import { repairInsufficientChoices } from './validation/writer-choice-insufficiency-repair.js';
import type { GenerationObservabilityContext, GenerationOptions } from './generation-pipeline-types.js';
import { LLMError, type ChatMessage } from './llm-client-types.js';
import type { ChoiceGeneratorResult } from './choice-generator-types.js';

function buildObservabilityContext(
  context: GenerationObservabilityContext | undefined
): Record<string, unknown> {
  return {
    storyId: context?.storyId ?? null,
    pageId: context?.pageId ?? null,
    requestId: context?.requestId ?? null,
  };
}

async function callChoiceGeneratorStructured(
  messages: ChatMessage[],
  options: GenerationOptions
): Promise<ChoiceGeneratorResult> {
  const config = getConfig().llm;
  const model = options.model ?? getStageModel('choiceGenerator');
  const temperature = options.temperature ?? config.temperature;
  const maxTokens = options.maxTokens ?? 1000;
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
      response_format: CHOICE_GENERATOR_SCHEMA,
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
  const content = extractResponseContent(data, 'choiceGenerator', model, maxTokens);

  const parsedMessage = parseMessageJsonContent(content);
  const parsed = parsedMessage.parsed;
  const rawContent = parsedMessage.rawText;

  const choiceRepairResult = repairCorruptedChoices(parsed);
  if (choiceRepairResult.repaired) {
    logger.warn('Choice generator corrupted choices repaired', {
      repairDetails: choiceRepairResult.repairDetails,
      ...buildObservabilityContext(options.observability),
    });
  }

  const insufficiencyRepairResult = await repairInsufficientChoices(
    choiceRepairResult.repairedJson,
    options.apiKey,
    options.model,
    options.observability
  );
  if (insufficiencyRepairResult.repaired) {
    logger.warn('Choice generator insufficient choices repaired via supplementary LLM call', {
      repairDetails: insufficiencyRepairResult.repairDetails,
      ...buildObservabilityContext(options.observability),
    });
  }

  try {
    return validateChoiceGeneratorResponse(insufficiencyRepairResult.repairedJson, rawContent);
  } catch (error) {
    logger.error('Choice generator structured response validation failed', {
      rawResponse: rawContent,
      ...buildObservabilityContext(options.observability),
    });

    if (error instanceof LLMError) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : 'Failed to validate choice generator response';
    throw new LLMError(message, 'VALIDATION_ERROR', true, {
      rawResponse: rawContent,
      ...buildObservabilityContext(options.observability),
    });
  }
}

export async function generateChoiceGeneratorWithFallback(
  messages: ChatMessage[],
  options: GenerationOptions
): Promise<ChoiceGeneratorResult> {
  try {
    return await callChoiceGeneratorStructured(messages, options);
  } catch (error) {
    if (isStructuredOutputNotSupported(error)) {
      const model = options.model ?? getStageModel('choiceGenerator');
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
