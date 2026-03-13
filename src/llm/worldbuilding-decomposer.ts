import { getStageModel } from '../config/stage-model.js';
import { getConfig } from '../config/index.js';
import type { DecomposedWorld, WorldFact, WorldFactDomain, WorldFactType } from '../models/decomposed-world.js';
import { logger, logPrompt, logResponse } from '../logging/index.js';
import type { JsonSchema, ChatMessage } from './llm-client-types.js';
import {
  OPENROUTER_API_URL,
  extractResponseContent,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from './http-client.js';
import { LLMError } from './llm-client-types.js';
import { withModelFallback } from './model-fallback.js';
import {
  buildWorldbuildingDecomposerPrompt,
  type WorldbuildingDecomposerContext,
} from './prompts/worldbuilding-decomposer-prompt.js';
import { withRetry } from './retry.js';
import { WORLDBUILDING_DECOMPOSITION_SCHEMA } from './schemas/worldbuilding-decomposer-schema.js';

const VALID_DOMAINS: readonly WorldFactDomain[] = [
  'geography', 'ecology', 'history', 'society', 'culture', 'religion',
  'governance', 'economy', 'faction', 'technology', 'magic', 'language',
];

const VALID_FACT_TYPES: readonly WorldFactType[] = [
  'LAW', 'NORM', 'BELIEF', 'DISPUTED', 'RUMOR', 'MYSTERY',
];

function isValidDomain(value: unknown): value is WorldFactDomain {
  return typeof value === 'string' && VALID_DOMAINS.includes(value as WorldFactDomain);
}

function isValidFactType(value: unknown): value is WorldFactType {
  return typeof value === 'string' && VALID_FACT_TYPES.includes(value as WorldFactType);
}

function parseWorldFact(raw: unknown): WorldFact | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return null;
  }

  const data = raw as Record<string, unknown>;

  if (typeof data['fact'] !== 'string' || data['fact'].trim().length === 0) {
    return null;
  }

  const domain = isValidDomain(data['domain']) ? data['domain'] : 'culture';
  const scope = typeof data['scope'] === 'string' ? data['scope'] : 'General';
  const factType = isValidFactType(data['factType']) ? data['factType'] : undefined;

  return { domain, fact: data['fact'].trim(), scope, ...(factType ? { factType } : {}) };
}

export interface WorldbuildingDecompositionResult {
  readonly decomposedWorld: DecomposedWorld;
  readonly rawResponse: string;
}

function parseWorldbuildingDecompositionResponse(
  parsed: unknown,
  rawWorldbuilding: string
): Omit<WorldbuildingDecompositionResult, 'rawResponse'> {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'Worldbuilding decomposition response must be an object',
      'DECOMPOSITION_PARSE_ERROR',
      true
    );
  }

  const data = parsed as Record<string, unknown>;
  const rawFacts = Array.isArray(data['worldFacts']) ? (data['worldFacts'] as unknown[]) : [];
  const worldFacts: WorldFact[] = rawFacts
    .map((raw) => parseWorldFact(raw))
    .filter((fact): fact is WorldFact => fact !== null);

  return {
    decomposedWorld: {
      facts: worldFacts,
      rawWorldbuilding,
    },
  };
}

interface DecompositionRequest<TParsed> {
  readonly model: string;
  readonly temperature: number;
  readonly maxTokens: number;
  readonly responseLabel: string;
  readonly messages: ChatMessage[];
  readonly schema: JsonSchema;
  readonly parseResponse: (parsed: unknown) => TParsed;
}

async function fetchDecomposition<TParsed>(
  apiKey: string,
  request: DecompositionRequest<TParsed>
): Promise<TParsed & { rawResponse: string }> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'One More Branch',
    },
    body: JSON.stringify({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      response_format: request.schema,
    }),
  });

  if (!response.ok) {
    const errorDetails = await readErrorDetails(response);
    const retryable = response.status === 429 || response.status >= 500;
    throw new LLMError(errorDetails.message, `HTTP_${response.status}`, retryable, {
      httpStatus: response.status,
      model: request.model,
      rawErrorBody: errorDetails.rawBody,
      parsedError: errorDetails.parsedError,
    });
  }

  const responseData = await readJsonResponse(response);
  const content = extractResponseContent(
    responseData,
    request.responseLabel,
    request.model,
    request.maxTokens
  );

  const parsedMessage = parseMessageJsonContent(content);
  const responseText = parsedMessage.rawText;
  try {
    const result = request.parseResponse(parsedMessage.parsed);
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

export async function decomposeWorldbuilding(
  context: WorldbuildingDecomposerContext,
  apiKey: string
): Promise<WorldbuildingDecompositionResult> {
  const config = getConfig().llm;
  const primaryModel = getStageModel('worldbuildingDecomposer');
  const temperature = config.temperature;
  const maxTokens = config.maxTokens;

  const messages = buildWorldbuildingDecomposerPrompt(context);
  logPrompt(logger, 'worldbuildingDecomposer', messages);

  const result = await withRetry(() =>
    withModelFallback(
      (model) =>
        fetchDecomposition(apiKey, {
          model,
          temperature,
          maxTokens,
          responseLabel: 'worldbuilding-decomposer',
          messages,
          schema: WORLDBUILDING_DECOMPOSITION_SCHEMA,
          parseResponse: (parsed) =>
            parseWorldbuildingDecompositionResponse(parsed, context.worldbuilding),
        }),
      primaryModel,
      'worldbuildingDecomposer'
    )
  );
  logResponse(logger, 'worldbuildingDecomposer', result.rawResponse);
  return result;
}
