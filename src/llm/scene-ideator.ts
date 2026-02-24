import { getStageModel } from '../config/stage-model.js';
import { getConfig } from '../config/index.js';
import { logger, logPrompt } from '../logging/index.js';
import {
  OPENROUTER_API_URL,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from './http-client.js';
import { buildSceneIdeatorPrompt } from './prompts/scene-ideator-prompt.js';
import { withModelFallback } from './model-fallback.js';
import { withRetry } from './retry.js';
import { SCENE_IDEATOR_SCHEMA } from './schemas/scene-ideator-schema.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import type { SceneDirectionOption } from '../models/scene-direction.js';
import {
  isScenePurpose,
  isValuePolarityShift,
  isPacingMode,
} from '../models/scene-direction-taxonomy.js';
import type {
  SceneIdeatorContext,
  SceneIdeationResult,
} from './scene-ideator-types.js';

function parseSceneDirectionOption(
  raw: unknown,
  index: number
): SceneDirectionOption {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new LLMError(
      `Scene direction option ${index + 1} must be an object`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const data = raw as Record<string, unknown>;

  if (!isScenePurpose(data['scenePurpose'])) {
    throw new LLMError(
      `Scene direction option ${index + 1} invalid scenePurpose: ${String(data['scenePurpose'])}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!isValuePolarityShift(data['valuePolarityShift'])) {
    throw new LLMError(
      `Scene direction option ${index + 1} invalid valuePolarityShift: ${String(data['valuePolarityShift'])}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!isPacingMode(data['pacingMode'])) {
    throw new LLMError(
      `Scene direction option ${index + 1} invalid pacingMode: ${String(data['pacingMode'])}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['sceneDirection'] !== 'string' || data['sceneDirection'].trim().length === 0) {
    throw new LLMError(
      `Scene direction option ${index + 1} missing sceneDirection`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (
    typeof data['dramaticJustification'] !== 'string' ||
    data['dramaticJustification'].trim().length === 0
  ) {
    throw new LLMError(
      `Scene direction option ${index + 1} missing dramaticJustification`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  return {
    scenePurpose: data['scenePurpose'],
    valuePolarityShift: data['valuePolarityShift'],
    pacingMode: data['pacingMode'],
    sceneDirection: data['sceneDirection'].trim(),
    dramaticJustification: data['dramaticJustification'].trim(),
  };
}

function validateDiversity(options: readonly SceneDirectionOption[]): void {
  const seen = new Set<string>();
  for (const option of options) {
    const key = `${option.scenePurpose}:${option.valuePolarityShift}`;
    if (seen.has(key)) {
      throw new LLMError(
        `Diversity violation: duplicate (scenePurpose, valuePolarityShift) combination: ${key}`,
        'STRUCTURE_PARSE_ERROR',
        true
      );
    }
    seen.add(key);
  }
}

function parseSceneIdeatorResponse(
  parsed: unknown
): readonly SceneDirectionOption[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'Scene ideator response must be an object',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data['options'])) {
    throw new LLMError(
      'Scene ideator response missing options array',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (data['options'].length !== 3) {
    throw new LLMError(
      `Scene ideator response must have exactly 3 options (received: ${data['options'].length})`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const options = data['options'].map((option, index) =>
    parseSceneDirectionOption(option, index)
  );

  validateDiversity(options);

  return options;
}

async function fetchSceneDirections(
  apiKey: string,
  model: string,
  messages: ReturnType<typeof buildSceneIdeatorPrompt>,
  temperature: number,
  maxTokens: number,
): Promise<SceneIdeationResult> {
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
      response_format: SCENE_IDEATOR_SCHEMA,
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
  const content = data.choices[0]?.message?.content;
  if (!content) {
    throw new LLMError('Empty response from OpenRouter', 'EMPTY_RESPONSE', true);
  }

  const parsedMessage = parseMessageJsonContent(content);
  const responseText = parsedMessage.rawText;
  try {
    const sceneOptions = parseSceneIdeatorResponse(parsedMessage.parsed);
    return { options: sceneOptions, rawResponse: responseText };
  } catch (error) {
    if (error instanceof LLMError) {
      throw new LLMError(error.message, error.code, error.retryable, {
        rawContent: responseText,
      });
    }
    throw error;
  }
}

export async function generateSceneDirections(
  context: SceneIdeatorContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<SceneIdeationResult> {
  const config = getConfig().llm;
  const primaryModel = options?.model ?? getStageModel('sceneIdeator');
  const temperature = options?.temperature ?? config.temperature;
  const maxTokens = options?.maxTokens ?? config.maxTokens;

  const messages = buildSceneIdeatorPrompt(context);
  logPrompt(logger, 'sceneIdeator', messages);

  return withRetry(() =>
    withModelFallback(
      (m) => fetchSceneDirections(apiKey, m, messages, temperature, maxTokens),
      primaryModel,
      'sceneIdeator',
    )
  );
}

export { parseSceneIdeatorResponse, parseSceneDirectionOption, validateDiversity };
