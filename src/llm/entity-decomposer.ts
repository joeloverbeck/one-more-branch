import { getConfig } from '../config/index.js';
import type {
  DecomposedCharacter,
  DecomposedRelationship,
  SpeechFingerprint,
} from '../models/decomposed-character.js';
import type { DecomposedWorld, WorldFact, WorldFactDomain, WorldFactType } from '../models/decomposed-world.js';
import { logger, logPrompt } from '../logging/index.js';
import {
  OPENROUTER_API_URL,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from './http-client.js';
import {
  CHARACTER_ARRAY_FIELDS,
  CHARACTER_STRING_FIELDS,
  SPEECH_ARRAY_FIELDS,
  SPEECH_STRING_FIELDS,
} from './entity-decomposition-contract.js';
import type {
  EntityDecomposerContext,
  EntityDecompositionResult,
} from './entity-decomposer-types.js';
import { LLMError } from './llm-client-types.js';
import { buildEntityDecomposerPrompt } from './prompts/entity-decomposer-prompt.js';
import { withRetry } from './retry.js';
import { ENTITY_DECOMPOSITION_SCHEMA } from './schemas/entity-decomposer-schema.js';

const VALID_DOMAINS: readonly WorldFactDomain[] = [
  'geography',
  'ecology',
  'history',
  'society',
  'culture',
  'religion',
  'governance',
  'economy',
  'faction',
  'technology',
  'magic',
  'language',
];

const VALID_FACT_TYPES: readonly WorldFactType[] = [
  'LAW',
  'NORM',
  'BELIEF',
  'DISPUTED',
  'RUMOR',
  'MYSTERY',
];

function isValidDomain(value: unknown): value is WorldFactDomain {
  return typeof value === 'string' && VALID_DOMAINS.includes(value as WorldFactDomain);
}

function isValidFactType(value: unknown): value is WorldFactType {
  return typeof value === 'string' && VALID_FACT_TYPES.includes(value as WorldFactType);
}

function parseStringField(raw: Record<string, unknown>, key: string): string {
  return typeof raw[key] === 'string' ? raw[key] : '';
}

function parseStringArrayField(raw: Record<string, unknown>, key: string): string[] {
  return Array.isArray(raw[key])
    ? (raw[key] as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];
}

function parseSpeechFingerprint(raw: Record<string, unknown>): SpeechFingerprint {
  const fp = raw['speechFingerprint'];
  if (typeof fp !== 'object' || fp === null || Array.isArray(fp)) {
    throw new LLMError('Character missing speechFingerprint', 'DECOMPOSITION_PARSE_ERROR', true);
  }

  const fpData = fp as Record<string, unknown>;
  const speech = {} as Record<keyof SpeechFingerprint, string | string[]>;

  for (const field of SPEECH_STRING_FIELDS) {
    speech[field] = parseStringField(fpData, field);
  }

  for (const field of SPEECH_ARRAY_FIELDS) {
    speech[field] = parseStringArrayField(fpData, field);
  }

  return speech as SpeechFingerprint;
}

function parseProtagonistRelationship(raw: unknown): DecomposedRelationship | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const data = raw as Record<string, unknown>;
  const valence = typeof data['valence'] === 'number' ? data['valence'] : 0;
  const clampedValence = Math.max(-5, Math.min(5, valence));

  return {
    valence: clampedValence,
    dynamic: typeof data['dynamic'] === 'string' ? data['dynamic'] : 'neutral',
    history: typeof data['history'] === 'string' ? data['history'] : '',
    currentTension: typeof data['currentTension'] === 'string' ? data['currentTension'] : '',
    leverage: typeof data['leverage'] === 'string' ? data['leverage'] : '',
  };
}

function parseCharacter(
  raw: unknown,
  index: number,
  rawDescription: string
): DecomposedCharacter {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new LLMError(
      `Character at index ${index} must be an object`,
      'DECOMPOSITION_PARSE_ERROR',
      true
    );
  }

  const data = raw as Record<string, unknown>;

  if (typeof data['name'] !== 'string' || data['name'].trim().length === 0) {
    throw new LLMError(
      `Character at index ${index} missing name`,
      'DECOMPOSITION_PARSE_ERROR',
      true
    );
  }

  const speechFingerprint = parseSpeechFingerprint(data);
  const character = {} as Record<
    keyof Omit<
      DecomposedCharacter,
      'name' | 'speechFingerprint' | 'rawDescription' | 'protagonistRelationship'
    >,
    string | string[]
  >;

  for (const field of CHARACTER_STRING_FIELDS) {
    character[field] = parseStringField(data, field);
  }

  for (const field of CHARACTER_ARRAY_FIELDS) {
    character[field] = parseStringArrayField(data, field);
  }

  return {
    name: data['name'].trim(),
    speechFingerprint,
    coreTraits: character.coreTraits as string[],
    motivations: character.motivations as string,
    protagonistRelationship: parseProtagonistRelationship(data['protagonistRelationship']),
    knowledgeBoundaries: character.knowledgeBoundaries as string,
    falseBeliefs: character.falseBeliefs as string[],
    secretsKept: character.secretsKept as string[],
    decisionPattern: character.decisionPattern as string,
    coreBeliefs: character.coreBeliefs as string[],
    conflictPriority: character.conflictPriority as string,
    appearance: character.appearance as string,
    rawDescription,
  };
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

function parseDecompositionResponse(
  parsed: unknown,
  context: EntityDecomposerContext
): Omit<EntityDecompositionResult, 'rawResponse'> {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'Entity decomposition response must be an object',
      'DECOMPOSITION_PARSE_ERROR',
      true
    );
  }

  const data = parsed as Record<string, unknown>;

  if (!Array.isArray(data['characters']) || data['characters'].length === 0) {
    throw new LLMError(
      'Entity decomposition must include at least the protagonist character',
      'DECOMPOSITION_PARSE_ERROR',
      true
    );
  }

  const rawCharacters = data['characters'] as unknown[];
  const npcList = context.npcs ?? [];

  const decomposedCharacters: DecomposedCharacter[] = rawCharacters.map((raw, i) => {
    const rawDescription =
      i === 0
        ? context.characterConcept
        : npcList[i - 1]?.description ?? '';
    return parseCharacter(raw, i, rawDescription);
  });

  const rawFacts = Array.isArray(data['worldFacts']) ? (data['worldFacts'] as unknown[]) : [];
  const worldFacts: WorldFact[] = rawFacts
    .map((raw) => parseWorldFact(raw))
    .filter((fact): fact is WorldFact => fact !== null);

  const decomposedWorld: DecomposedWorld = {
    facts: worldFacts,
    rawWorldbuilding: context.worldbuilding,
  };

  return { decomposedCharacters, decomposedWorld };
}

export async function decomposeEntities(
  context: EntityDecomposerContext,
  apiKey: string
): Promise<EntityDecompositionResult> {
  const config = getConfig().llm;
  const model = config.defaultModel;
  const temperature = config.temperature;
  const maxTokens = config.maxTokens;

  const messages = buildEntityDecomposerPrompt(context);
  logPrompt(logger, 'entity-decomposer', messages);

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
        response_format: ENTITY_DECOMPOSITION_SCHEMA,
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

    const responseData = await readJsonResponse(response);
    const content = responseData.choices[0]?.message?.content;
    if (!content) {
      throw new LLMError('Empty response from OpenRouter', 'EMPTY_RESPONSE', true);
    }

    const parsedMessage = parseMessageJsonContent(content);
    const responseText = parsedMessage.rawText;
    try {
      const result = parseDecompositionResponse(parsedMessage.parsed, context);
      return { ...result, rawResponse: responseText };
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
