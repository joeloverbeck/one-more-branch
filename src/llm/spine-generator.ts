import { getStageModel } from '../config/stage-model.js';
import { getConfig } from '../config/index.js';
import { logger, logPrompt } from '../logging/index.js';
import {
  OPENROUTER_API_URL,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from './http-client.js';
import { buildSpinePrompt, type SpinePromptContext } from './prompts/spine-prompt.js';
import { withRetry } from './retry.js';
import { SPINE_GENERATION_SCHEMA } from './schemas/spine-schema.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import type {
  StorySpineType,
  ConflictAxis,
  ConflictType,
  CharacterArcType,
  NeedWantDynamic,
} from '../models/story-spine.js';
import {
  isStorySpineType,
  isConflictAxis,
  isConflictType,
  isCharacterArcType,
  isNeedWantDynamic,
} from '../models/story-spine.js';

export interface SpineOption {
  readonly centralDramaticQuestion: string;
  readonly protagonistNeedVsWant: {
    readonly need: string;
    readonly want: string;
    readonly dynamic: NeedWantDynamic;
  };
  readonly primaryAntagonisticForce: {
    readonly description: string;
    readonly pressureMechanism: string;
  };
  readonly storySpineType: StorySpineType;
  readonly conflictAxis: ConflictAxis;
  readonly conflictType: ConflictType;
  readonly characterArcType: CharacterArcType;
  readonly toneFeel: readonly string[];
  readonly toneAvoid: readonly string[];
}

export interface SpineGenerationResult {
  readonly options: readonly SpineOption[];
  readonly rawResponse: string;
}

function parseSpineOption(raw: unknown, index: number): SpineOption {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new LLMError(
      `Spine option ${index + 1} must be an object`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const data = raw as Record<string, unknown>;

  if (typeof data['centralDramaticQuestion'] !== 'string') {
    throw new LLMError(
      `Spine option ${index + 1} missing centralDramaticQuestion`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const needVsWant = data['protagonistNeedVsWant'];
  if (typeof needVsWant !== 'object' || needVsWant === null || Array.isArray(needVsWant)) {
    throw new LLMError(
      `Spine option ${index + 1} missing protagonistNeedVsWant`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }
  const nw = needVsWant as Record<string, unknown>;
  if (typeof nw['need'] !== 'string' || typeof nw['want'] !== 'string') {
    throw new LLMError(
      `Spine option ${index + 1} protagonistNeedVsWant missing need/want`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }
  if (!isNeedWantDynamic(nw['dynamic'])) {
    throw new LLMError(
      `Spine option ${index + 1} invalid need-want dynamic: ${String(nw['dynamic'])}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const antag = data['primaryAntagonisticForce'];
  if (typeof antag !== 'object' || antag === null || Array.isArray(antag)) {
    throw new LLMError(
      `Spine option ${index + 1} missing primaryAntagonisticForce`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }
  const af = antag as Record<string, unknown>;
  if (typeof af['description'] !== 'string' || typeof af['pressureMechanism'] !== 'string') {
    throw new LLMError(
      `Spine option ${index + 1} primaryAntagonisticForce missing fields`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!isStorySpineType(data['storySpineType'])) {
    throw new LLMError(
      `Spine option ${index + 1} invalid storySpineType: ${String(data['storySpineType'])}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!isConflictAxis(data['conflictAxis'])) {
    throw new LLMError(
      `Spine option ${index + 1} invalid conflictAxis: ${String(data['conflictAxis'])}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!isConflictType(data['conflictType'])) {
    throw new LLMError(
      `Spine option ${index + 1} invalid conflictType: ${String(data['conflictType'])}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!isCharacterArcType(data['characterArcType'])) {
    throw new LLMError(
      `Spine option ${index + 1} invalid characterArcType: ${String(data['characterArcType'])}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const toneFeel = Array.isArray(data['toneFeel'])
    ? (data['toneFeel'] as unknown[])
        .filter((item): item is string => typeof item === 'string')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];

  const toneAvoid = Array.isArray(data['toneAvoid'])
    ? (data['toneAvoid'] as unknown[])
        .filter((item): item is string => typeof item === 'string')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];

  return {
    centralDramaticQuestion: data['centralDramaticQuestion'],
    protagonistNeedVsWant: {
      need: nw['need'],
      want: nw['want'],
      dynamic: nw['dynamic'],
    },
    primaryAntagonisticForce: {
      description: af['description'],
      pressureMechanism: af['pressureMechanism'],
    },
    storySpineType: data['storySpineType'],
    conflictAxis: data['conflictAxis'],
    conflictType: data['conflictType'],
    characterArcType: data['characterArcType'],
    toneFeel,
    toneAvoid,
  };
}

function parseSpineResponse(parsed: unknown): readonly SpineOption[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Spine response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data['options'])) {
    throw new LLMError('Spine response missing options array', 'STRUCTURE_PARSE_ERROR', true);
  }

  if (data['options'].length !== 3) {
    throw new LLMError(
      `Spine response must have exactly 3 options (received: ${data['options'].length})`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  return data['options'].map((option, index) => parseSpineOption(option, index));
}

export async function generateStorySpines(
  context: SpinePromptContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<SpineGenerationResult> {
  const config = getConfig().llm;
  const model = options?.model ?? getStageModel('spine');
  const temperature = options?.temperature ?? config.temperature;
  const maxTokens = options?.maxTokens ?? config.maxTokens;

  const messages = buildSpinePrompt(context);
  logPrompt(logger, 'spine', messages);

  return withRetry(async () => {
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
        response_format: SPINE_GENERATION_SCHEMA,
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
      const spineOptions = parseSpineResponse(parsedMessage.parsed);
      return { options: spineOptions, rawResponse: responseText };
    } catch (error) {
      if (error instanceof LLMError) {
        throw new LLMError(error.message, error.code, error.retryable, {
          rawContent: responseText,
        });
      }
      throw error;
    }
  });
}
