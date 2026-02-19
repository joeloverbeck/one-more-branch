import { getConfig } from '../config/index.js';
import { logger, logPrompt } from '../logging/index.js';
import {
  OPENROUTER_API_URL,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from '../llm/http-client.js';
import {
  buildSpineRewritePrompt,
  type SpineRewriteContext,
} from '../llm/prompts/spine-rewrite-prompt.js';
import { withRetry } from '../llm/retry.js';
import { SPINE_REWRITE_SCHEMA } from '../llm/schemas/spine-rewrite-schema.js';
import { LLMError } from '../llm/llm-client-types.js';
import type { StorySpine } from '../models/story-spine.js';
import {
  isStorySpineType,
  isConflictAxis,
  isConflictType,
  isCharacterArcType,
  isNeedWantDynamic,
} from '../models/story-spine.js';

export interface SpineRewriteResult {
  readonly spine: StorySpine;
  readonly rawResponse: string;
}

function parseSpineRewriteResponse(parsed: unknown): StorySpine {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Spine rewrite response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;

  if (typeof data['centralDramaticQuestion'] !== 'string') {
    throw new LLMError(
      'Spine rewrite missing centralDramaticQuestion',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const needVsWant = data['protagonistNeedVsWant'];
  if (typeof needVsWant !== 'object' || needVsWant === null || Array.isArray(needVsWant)) {
    throw new LLMError(
      'Spine rewrite missing protagonistNeedVsWant',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }
  const nw = needVsWant as Record<string, unknown>;
  if (typeof nw['need'] !== 'string' || typeof nw['want'] !== 'string') {
    throw new LLMError(
      'Spine rewrite protagonistNeedVsWant missing need/want',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }
  if (!isNeedWantDynamic(nw['dynamic'])) {
    throw new LLMError(
      `Spine rewrite invalid need-want dynamic: ${String(nw['dynamic'])}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const antag = data['primaryAntagonisticForce'];
  if (typeof antag !== 'object' || antag === null || Array.isArray(antag)) {
    throw new LLMError(
      'Spine rewrite missing primaryAntagonisticForce',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }
  const af = antag as Record<string, unknown>;
  if (typeof af['description'] !== 'string' || typeof af['pressureMechanism'] !== 'string') {
    throw new LLMError(
      'Spine rewrite primaryAntagonisticForce missing fields',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!isStorySpineType(data['storySpineType'])) {
    throw new LLMError(
      `Spine rewrite invalid storySpineType: ${String(data['storySpineType'])}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!isConflictAxis(data['conflictAxis'])) {
    throw new LLMError(
      `Spine rewrite invalid conflictAxis: ${String(data['conflictAxis'])}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!isConflictType(data['conflictType'])) {
    throw new LLMError(
      `Spine rewrite invalid conflictType: ${String(data['conflictType'])}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!isCharacterArcType(data['characterArcType'])) {
    throw new LLMError(
      `Spine rewrite invalid characterArcType: ${String(data['characterArcType'])}`,
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

export async function rewriteSpine(
  context: SpineRewriteContext,
  apiKey: string
): Promise<SpineRewriteResult> {
  const config = getConfig().llm;
  const model = config.defaultModel;
  const temperature = config.temperature;
  const maxTokens = config.maxTokens;

  const messages = buildSpineRewritePrompt(context);
  logPrompt(logger, 'spine-rewrite', messages);

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
        response_format: SPINE_REWRITE_SCHEMA,
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
      const spine = parseSpineRewriteResponse(parsedMessage.parsed);
      return { spine, rawResponse: responseText };
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
