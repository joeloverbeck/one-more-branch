import { getStageModel } from '../config/stage-model.js';
import { getConfig } from '../config/index.js';
import { logger, logPrompt } from '../logging/index.js';
import {
  OPENROUTER_API_URL,
  extractResponseContent,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from './http-client.js';
import {
  buildCharKernelPrompt,
  type CharacterDevPromptContext,
} from './prompts/char-kernel-prompt.js';
import { withModelFallback } from './model-fallback.js';
import { withRetry } from './retry.js';
import { CHAR_KERNEL_GENERATION_SCHEMA } from './schemas/char-kernel-schema.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import type { CharacterKernel } from '../models/character-pipeline-types.js';

export interface CharKernelGenerationResult {
  readonly characterKernel: CharacterKernel;
  readonly rawResponse: string;
}

function parseCharKernelResponse(parsed: unknown): CharacterKernel {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Character kernel response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;

  if (typeof data['characterName'] !== 'string' || data['characterName'].trim().length === 0) {
    throw new LLMError(
      'Character kernel response missing characterName',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['superObjective'] !== 'string' || data['superObjective'].trim().length === 0) {
    throw new LLMError(
      'Character kernel response missing superObjective',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (
    !Array.isArray(data['immediateObjectives']) ||
    data['immediateObjectives'].length === 0
  ) {
    throw new LLMError(
      'Character kernel response missing or empty immediateObjectives',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (
    typeof data['primaryOpposition'] !== 'string' ||
    data['primaryOpposition'].trim().length === 0
  ) {
    throw new LLMError(
      'Character kernel response missing primaryOpposition',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!Array.isArray(data['stakes']) || data['stakes'].length === 0) {
    throw new LLMError(
      'Character kernel response missing or empty stakes',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!Array.isArray(data['constraints']) || data['constraints'].length === 0) {
    throw new LLMError(
      'Character kernel response missing or empty constraints',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['pressurePoint'] !== 'string' || data['pressurePoint'].trim().length === 0) {
    throw new LLMError(
      'Character kernel response missing pressurePoint',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const immediateObjectives = (data['immediateObjectives'] as unknown[])
    .filter((item): item is string => typeof item === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const stakes = (data['stakes'] as unknown[])
    .filter((item): item is string => typeof item === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const constraints = (data['constraints'] as unknown[])
    .filter((item): item is string => typeof item === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return {
    characterName: data['characterName'].trim(),
    superObjective: data['superObjective'].trim(),
    immediateObjectives,
    primaryOpposition: data['primaryOpposition'].trim(),
    stakes,
    constraints,
    pressurePoint: data['pressurePoint'].trim(),
  };
}

async function fetchCharKernel(
  apiKey: string,
  model: string,
  messages: ReturnType<typeof buildCharKernelPrompt>,
  temperature: number,
  maxTokens: number
): Promise<CharKernelGenerationResult> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'One More Branch',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: CHAR_KERNEL_GENERATION_SCHEMA,
    }),
  });

  if (!response.ok) {
    const errorDetails = await readErrorDetails(response);
    const retryable = response.status === 429 || response.status >= 500;
    throw new LLMError(errorDetails.message, `HTTP_${response.status}`, retryable, {
      httpStatus: response.status,
      model,
      rawErrorBody: errorDetails.rawBody,
      parsedError: errorDetails.parsedError,
    });
  }

  const data = await readJsonResponse(response);
  const content = extractResponseContent(data, 'char-kernel', model, maxTokens);

  const parsedMessage = parseMessageJsonContent(content);
  const responseText = parsedMessage.rawText;
  try {
    const characterKernel = parseCharKernelResponse(parsedMessage.parsed);
    return { characterKernel, rawResponse: responseText };
  } catch (error) {
    if (error instanceof LLMError) {
      throw new LLMError(error.message, error.code, error.retryable, {
        rawContent: responseText,
      });
    }
    throw error;
  }
}

export async function generateCharKernel(
  context: CharacterDevPromptContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<CharKernelGenerationResult> {
  const config = getConfig().llm;
  const primaryModel = options?.model ?? getStageModel('charKernel');
  const temperature = options?.temperature ?? config.temperature;
  const maxTokens = options?.maxTokens ?? config.maxTokens;

  const messages = buildCharKernelPrompt(context);
  logPrompt(logger, 'charKernel', messages);

  return withRetry(() =>
    withModelFallback(
      (m) => fetchCharKernel(apiKey, m, messages, temperature, maxTokens),
      primaryModel,
      'charKernel'
    )
  );
}
