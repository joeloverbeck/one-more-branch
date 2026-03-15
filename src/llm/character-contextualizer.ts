import { getStageModel } from '../config/stage-model.js';
import { getConfig } from '../config/index.js';
import type {
  DecomposedCharacter,
  DecomposedRelationship,
} from '../models/decomposed-character.js';
import type { StandaloneDecomposedCharacter } from '../models/standalone-decomposed-character.js';
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
  buildCharacterContextualizerPrompt,
  type CharacterContextualizerContext,
} from './prompts/character-contextualizer-prompt.js';
import { withRetry } from './retry.js';
import { CHARACTER_CONTEXTUALIZATION_SCHEMA } from './schemas/character-contextualizer-schema.js';

export interface CharacterContextualizationResult {
  readonly decomposedCharacters: readonly DecomposedCharacter[];
  readonly rawResponse: string;
}

function parseProtagonistRelationship(raw: unknown): DecomposedRelationship | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const data = raw as Record<string, unknown>;
  const rawValence = data['valence'];
  const numericValence =
    typeof rawValence === 'number'
      ? rawValence
      : typeof rawValence === 'string' && rawValence.trim() !== ''
        ? Number(rawValence)
        : 0;
  const clampedValence = Math.max(-5, Math.min(5, Number.isNaN(numericValence) ? 0 : numericValence));

  return {
    valence: clampedValence,
    dynamic: typeof data['dynamic'] === 'string' ? data['dynamic'] : 'neutral',
    history: typeof data['history'] === 'string' ? data['history'] : '',
    currentTension: typeof data['currentTension'] === 'string' ? data['currentTension'] : '',
    leverage: typeof data['leverage'] === 'string' ? data['leverage'] : '',
  };
}

function mergeContextIntoCharacter(
  standalone: StandaloneDecomposedCharacter,
  contextEntry: { thematicStance: string; protagonistRelationship: unknown }
): DecomposedCharacter {
  return {
    name: standalone.name,
    speechFingerprint: standalone.speechFingerprint,
    coreTraits: standalone.coreTraits,
    ...(standalone.superObjective ? { superObjective: standalone.superObjective } : {}),
    thematicStance:
      typeof contextEntry.thematicStance === 'string' ? contextEntry.thematicStance : '',
    protagonistRelationship: parseProtagonistRelationship(contextEntry.protagonistRelationship),
    knowledgeBoundaries: standalone.knowledgeBoundaries,
    falseBeliefs: standalone.falseBeliefs,
    secretsKept: standalone.secretsKept,
    decisionPattern: standalone.decisionPattern,
    coreBeliefs: standalone.coreBeliefs,
    conflictPriority: standalone.conflictPriority,
    appearance: standalone.appearance,
    rawDescription: standalone.rawDescription,
    ...(standalone.stakes ? { stakes: standalone.stakes } : {}),
    ...(standalone.pressurePoint ? { pressurePoint: standalone.pressurePoint } : {}),
    ...(standalone.personalDilemmas ? { personalDilemmas: standalone.personalDilemmas } : {}),
    ...(standalone.emotionSalience ? { emotionSalience: standalone.emotionSalience } : {}),
    ...(standalone.moralLine ? { moralLine: standalone.moralLine } : {}),
    ...(standalone.worstFear ? { worstFear: standalone.worstFear } : {}),
    ...(standalone.formativeWound ? { formativeWound: standalone.formativeWound } : {}),
    ...(standalone.misbelief ? { misbelief: standalone.misbelief } : {}),
    ...(standalone.stressVariants ? { stressVariants: standalone.stressVariants } : {}),
    ...(standalone.focalizationFilter ? { focalizationFilter: standalone.focalizationFilter } : {}),
    ...(standalone.escalationLadder ? { escalationLadder: standalone.escalationLadder } : {}),
    ...(standalone.immediateObjectives ? { immediateObjectives: standalone.immediateObjectives } : {}),
    ...(standalone.constraints ? { constraints: standalone.constraints } : {}),
    ...(standalone.desires ? { desires: standalone.desires } : {}),
    ...(standalone.currentIntentions ? { currentIntentions: standalone.currentIntentions } : {}),
    ...(standalone.sociology ? { sociology: standalone.sociology } : {}),
  };
}

function parseContextualizationResponse(
  parsed: unknown,
  standaloneCharacters: readonly StandaloneDecomposedCharacter[]
): Omit<CharacterContextualizationResult, 'rawResponse'> {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'Character contextualization response must be an object',
      'CONTEXTUALIZATION_PARSE_ERROR',
      true
    );
  }

  const data = parsed as Record<string, unknown>;

  if (!Array.isArray(data['characters']) || data['characters'].length === 0) {
    throw new LLMError(
      'Character contextualization must include at least one character',
      'CONTEXTUALIZATION_PARSE_ERROR',
      true
    );
  }

  const rawEntries = data['characters'] as unknown[];

  if (rawEntries.length !== standaloneCharacters.length) {
    throw new LLMError(
      `Expected ${standaloneCharacters.length} characters, got ${rawEntries.length}`,
      'CONTEXTUALIZATION_PARSE_ERROR',
      true
    );
  }

  const decomposedCharacters: DecomposedCharacter[] = rawEntries.map((raw, i) => {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      throw new LLMError(
        `Character entry at index ${i} must be an object`,
        'CONTEXTUALIZATION_PARSE_ERROR',
        true
      );
    }

    const entry = raw as Record<string, unknown>;
    return mergeContextIntoCharacter(standaloneCharacters[i]!, {
      thematicStance: entry['thematicStance'] as string,
      protagonistRelationship: entry['protagonistRelationship'],
    });
  });

  return { decomposedCharacters };
}

interface ContextualizationRequest<TParsed> {
  readonly model: string;
  readonly temperature: number;
  readonly maxTokens: number;
  readonly responseLabel: string;
  readonly messages: ChatMessage[];
  readonly schema: JsonSchema;
  readonly parseResponse: (parsed: unknown) => TParsed;
}

async function fetchContextualization<TParsed>(
  apiKey: string,
  request: ContextualizationRequest<TParsed>
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

export async function contextualizeCharacters(
  context: CharacterContextualizerContext,
  apiKey: string
): Promise<CharacterContextualizationResult> {
  const config = getConfig().llm;
  const primaryModel = getStageModel('characterContextualizer');
  const temperature = config.temperature;
  const maxTokens = config.maxTokens;

  const messages = buildCharacterContextualizerPrompt(context);
  logPrompt(logger, 'characterContextualizer', messages);

  const result = await withRetry(() =>
    withModelFallback(
      (model) =>
        fetchContextualization(apiKey, {
          model,
          temperature,
          maxTokens,
          responseLabel: 'character-contextualizer',
          messages,
          schema: CHARACTER_CONTEXTUALIZATION_SCHEMA,
          parseResponse: (parsed) =>
            parseContextualizationResponse(parsed, context.characters),
        }),
      primaryModel,
      'characterContextualizer'
    )
  );
  logResponse(logger, 'characterContextualizer', result.rawResponse);
  return result;
}
