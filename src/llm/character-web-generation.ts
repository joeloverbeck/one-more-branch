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
  buildCharacterWebPrompt,
  type CharacterWebPromptContext,
} from './prompts/character-web-prompt.js';
import { withModelFallback } from './model-fallback.js';
import { withRetry } from './retry.js';
import { CHARACTER_WEB_GENERATION_SCHEMA } from './schemas/character-web-schema.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import type { CastRoleAssignment, RelationshipArchetype } from '../models/character-pipeline-types.js';
import {
  isStoryFunction,
  isCharacterDepth,
} from '../models/character-enums.js';
import { isRelationshipArchetype } from '../models/character-pipeline-types.js';

export interface CharacterWebGenerationResult {
  readonly assignments: readonly CastRoleAssignment[];
  readonly relationshipArchetypes: readonly RelationshipArchetype[];
  readonly castDynamicsSummary: string;
  readonly rawResponse: string;
}

function parseAssignment(raw: unknown, index: number): CastRoleAssignment {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new LLMError(
      `Assignment ${index + 1} must be an object`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const data = raw as Record<string, unknown>;

  if (typeof data['characterName'] !== 'string' || data['characterName'].trim().length === 0) {
    throw new LLMError(
      `Assignment ${index + 1} missing characterName`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['isProtagonist'] !== 'boolean') {
    throw new LLMError(
      `Assignment ${index + 1} missing isProtagonist`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!isStoryFunction(data['storyFunction'])) {
    throw new LLMError(
      `Assignment ${index + 1} invalid storyFunction: ${String(data['storyFunction'])}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!isCharacterDepth(data['characterDepth'])) {
    throw new LLMError(
      `Assignment ${index + 1} invalid characterDepth: ${String(data['characterDepth'])}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['narrativeRole'] !== 'string') {
    throw new LLMError(
      `Assignment ${index + 1} missing narrativeRole`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['conflictRelationship'] !== 'string') {
    throw new LLMError(
      `Assignment ${index + 1} missing conflictRelationship`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  return {
    characterName: data['characterName'].trim(),
    isProtagonist: data['isProtagonist'],
    storyFunction: data['storyFunction'],
    characterDepth: data['characterDepth'],
    narrativeRole: data['narrativeRole'],
    conflictRelationship: data['conflictRelationship'],
  };
}

function parseRelationshipArchetype(raw: unknown, index: number): RelationshipArchetype {
  if (!isRelationshipArchetype(raw)) {
    throw new LLMError(
      `Relationship archetype ${index + 1} is invalid or has invalid enum values`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  return raw;
}

function parseCharacterWebResponse(
  parsed: unknown
): Omit<CharacterWebGenerationResult, 'rawResponse'> {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Character web response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;

  if (!Array.isArray(data['assignments'])) {
    throw new LLMError(
      'Character web response missing assignments array',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (data['assignments'].length === 0) {
    throw new LLMError(
      'Character web must have at least one assignment',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!Array.isArray(data['relationshipArchetypes'])) {
    throw new LLMError(
      'Character web response missing relationshipArchetypes array',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['castDynamicsSummary'] !== 'string' || data['castDynamicsSummary'].trim().length === 0) {
    throw new LLMError(
      'Character web response missing castDynamicsSummary',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const assignments = data['assignments'].map((a, i) => parseAssignment(a, i));
  const relationshipArchetypes = data['relationshipArchetypes'].map((r, i) =>
    parseRelationshipArchetype(r, i)
  );

  return {
    assignments,
    relationshipArchetypes,
    castDynamicsSummary: data['castDynamicsSummary'].trim(),
  };
}

async function fetchCharacterWeb(
  apiKey: string,
  model: string,
  messages: ReturnType<typeof buildCharacterWebPrompt>,
  temperature: number,
  maxTokens: number
): Promise<CharacterWebGenerationResult> {
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
      response_format: CHARACTER_WEB_GENERATION_SCHEMA,
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
  const content = extractResponseContent(data, 'character-web', model, maxTokens);

  const parsedMessage = parseMessageJsonContent(content);
  const responseText = parsedMessage.rawText;
  try {
    const result = parseCharacterWebResponse(parsedMessage.parsed);
    return { ...result, rawResponse: responseText };
  } catch (error) {
    if (error instanceof LLMError) {
      throw new LLMError(error.message, error.code, error.retryable, {
        rawContent: responseText,
      });
    }
    throw error;
  }
}

export async function generateCharacterWeb(
  context: CharacterWebPromptContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<CharacterWebGenerationResult> {
  const config = getConfig().llm;
  const primaryModel = options?.model ?? getStageModel('characterWeb');
  const temperature = options?.temperature ?? config.temperature;
  const maxTokens = options?.maxTokens ?? config.maxTokens;

  const messages = buildCharacterWebPrompt(context);
  logPrompt(logger, 'characterWeb', messages);

  return withRetry(() =>
    withModelFallback(
      (m) => fetchCharacterWeb(apiKey, m, messages, temperature, maxTokens),
      primaryModel,
      'characterWeb'
    )
  );
}
