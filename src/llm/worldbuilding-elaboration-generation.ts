import { getStageModel, getStageMaxTokens } from '../config/stage-model.js';
import { getConfig } from '../config/index.js';
import type {
  DecomposedWorld,
  WorldFact,
  WorldFactDomain,
  WorldFactType,
  NarrativeWeight,
  WorldStoryFunction,
} from '../models/decomposed-world.js';
import { logger, logPrompt, logResponse } from '../logging/index.js';
import type { ChatMessage, JsonSchema } from './llm-client-types.js';
import { LLMError } from './llm-client-types.js';
import {
  OPENROUTER_API_URL,
  extractResponseContent,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from './http-client.js';
import { withModelFallback } from './model-fallback.js';
import {
  buildWorldElaborationPrompt,
  type WorldElaborationPromptContext,
} from './prompts/worldbuilding-elaboration-prompt.js';
import { withRetry } from './retry.js';
import { WORLDBUILDING_ELABORATION_SCHEMA } from './schemas/worldbuilding-elaboration-schema.js';

export interface WorldElaborationResult {
  readonly worldLogline: string;
  readonly rawWorldMarkdown: string;
  readonly decomposedWorld: DecomposedWorld;
  readonly rawResponse: string;
}

const VALID_DOMAINS: readonly WorldFactDomain[] = [
  'geography', 'ecology', 'history', 'society', 'culture', 'religion',
  'governance', 'economy', 'faction', 'technology', 'magic', 'language',
];

const VALID_FACT_TYPES: readonly WorldFactType[] = [
  'LAW', 'NORM', 'BELIEF', 'DISPUTED', 'RUMOR', 'MYSTERY', 'PRACTICE', 'TABOO',
];

const VALID_NARRATIVE_WEIGHTS: readonly NarrativeWeight[] = ['LOW', 'MEDIUM', 'HIGH'];

const VALID_STORY_FUNCTIONS: readonly WorldStoryFunction[] = [
  'EPIC', 'EPISTEMIC', 'DRAMATIC', 'ATMOSPHERIC', 'THEMATIC',
];

function parseElaboratedFact(raw: unknown, index: number): WorldFact | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;

  const data = raw as Record<string, unknown>;
  if (typeof data['fact'] !== 'string' || data['fact'].trim().length === 0) return null;

  const id = typeof data['id'] === 'string' && data['id'].length > 0
    ? data['id']
    : `wf-${index + 1}`;

  const domain = typeof data['domain'] === 'string' && VALID_DOMAINS.includes(data['domain'] as WorldFactDomain)
    ? (data['domain'] as WorldFactDomain)
    : 'culture';

  const scope = typeof data['scope'] === 'string' ? data['scope'] : 'General';

  const factType = typeof data['factType'] === 'string' && VALID_FACT_TYPES.includes(data['factType'] as WorldFactType)
    ? (data['factType'] as WorldFactType)
    : undefined;

  const narrativeWeight = typeof data['narrativeWeight'] === 'string' && VALID_NARRATIVE_WEIGHTS.includes(data['narrativeWeight'] as NarrativeWeight)
    ? (data['narrativeWeight'] as NarrativeWeight)
    : undefined;

  const storyFunctions = Array.isArray(data['storyFunctions'])
    ? (data['storyFunctions'] as unknown[]).filter(
        (s): s is WorldStoryFunction =>
          typeof s === 'string' && VALID_STORY_FUNCTIONS.includes(s as WorldStoryFunction),
      )
    : undefined;

  const tensionWithIds = Array.isArray(data['tensionWithIds'])
    ? (data['tensionWithIds'] as unknown[]).filter((s): s is string => typeof s === 'string')
    : undefined;

  const implicationOfIds = Array.isArray(data['implicationOfIds'])
    ? (data['implicationOfIds'] as unknown[]).filter((s): s is string => typeof s === 'string')
    : undefined;

  const sceneAffordances = Array.isArray(data['sceneAffordances'])
    ? (data['sceneAffordances'] as unknown[]).filter((s): s is string => typeof s === 'string')
    : undefined;

  const thematicTag = typeof data['thematicTag'] === 'string' ? data['thematicTag'] : undefined;
  const sensoryHook = typeof data['sensoryHook'] === 'string' ? data['sensoryHook'] : undefined;
  const exampleEvidence = typeof data['exampleEvidence'] === 'string' ? data['exampleEvidence'] : undefined;

  return {
    id,
    domain,
    fact: data['fact'].trim(),
    scope,
    ...(factType ? { factType } : {}),
    ...(narrativeWeight ? { narrativeWeight } : {}),
    ...(thematicTag ? { thematicTag } : {}),
    ...(sensoryHook ? { sensoryHook } : {}),
    ...(exampleEvidence ? { exampleEvidence } : {}),
    ...(tensionWithIds && tensionWithIds.length > 0 ? { tensionWithIds } : {}),
    ...(implicationOfIds && implicationOfIds.length > 0 ? { implicationOfIds } : {}),
    ...(storyFunctions && storyFunctions.length > 0 ? { storyFunctions } : {}),
    ...(sceneAffordances && sceneAffordances.length > 0 ? { sceneAffordances } : {}),
  };
}

function parseElaborationResponse(
  parsed: unknown,
): Omit<WorldElaborationResult, 'rawResponse'> {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'World elaboration response must be an object',
      'WORLD_ELABORATION_PARSE_ERROR',
      true,
    );
  }

  const data = parsed as Record<string, unknown>;

  const worldLogline = typeof data['worldLogline'] === 'string' ? data['worldLogline'] : '';
  const rawWorldMarkdown = typeof data['rawWorldMarkdown'] === 'string' ? data['rawWorldMarkdown'] : '';

  const rawFacts = Array.isArray(data['worldFacts']) ? (data['worldFacts'] as unknown[]) : [];
  const worldFacts: WorldFact[] = rawFacts
    .map((raw, idx) => parseElaboratedFact(raw, idx))
    .filter((f): f is WorldFact => f !== null);

  const openQuestions = Array.isArray(data['openQuestions'])
    ? (data['openQuestions'] as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];

  return {
    worldLogline,
    rawWorldMarkdown,
    decomposedWorld: {
      worldLogline,
      facts: worldFacts,
      openQuestions,
    },
  };
}

interface GenerationRequest<TParsed> {
  readonly model: string;
  readonly temperature: number;
  readonly maxTokens: number;
  readonly responseLabel: string;
  readonly messages: ChatMessage[];
  readonly schema: JsonSchema;
  readonly parseResponse: (parsed: unknown) => TParsed;
}

async function fetchGeneration<TParsed>(
  apiKey: string,
  request: GenerationRequest<TParsed>,
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
    request.maxTokens,
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

export async function generateWorldElaboration(
  context: WorldElaborationPromptContext,
  apiKey: string,
): Promise<WorldElaborationResult> {
  const config = getConfig().llm;
  const primaryModel = getStageModel('worldbuildingElaboration');
  const temperature = config.temperature;
  const maxTokens = getStageMaxTokens('worldbuildingElaboration');

  const messages = buildWorldElaborationPrompt(context);
  logPrompt(logger, 'worldbuildingElaboration', messages);

  const result = await withRetry(() =>
    withModelFallback(
      (model) =>
        fetchGeneration(apiKey, {
          model,
          temperature,
          maxTokens,
          responseLabel: 'worldbuilding-elaboration',
          messages,
          schema: WORLDBUILDING_ELABORATION_SCHEMA,
          parseResponse: parseElaborationResponse,
        }),
      primaryModel,
      'worldbuildingElaboration',
    ),
  );

  logResponse(logger, 'worldbuildingElaboration', result.rawResponse);
  return result;
}
