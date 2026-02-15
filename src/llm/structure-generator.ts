import { getConfig } from '../config/index.js';
import { logger, logPrompt } from '../logging/index.js';
import {
  OPENROUTER_API_URL,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from './http-client.js';
import type { NpcAgenda } from '../models/state/npc-agenda.js';
import { resolvePromptOptions } from './options.js';
import { buildStructurePrompt, type StructureContext } from './prompts/structure-prompt.js';
import { withRetry } from './retry.js';
import { STRUCTURE_GENERATION_SCHEMA } from './schemas/structure-schema.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';

export interface StructureGenerationResult {
  overallTheme: string;
  premise: string;
  pacingBudget: { targetPagesMin: number; targetPagesMax: number };
  acts: Array<{
    name: string;
    objective: string;
    stakes: string;
    entryCondition: string;
    beats: Array<{
      name: string;
      description: string;
      objective: string;
      role: string;
    }>;
  }>;
  initialNpcAgendas?: NpcAgenda[];
  rawResponse: string;
}

function parseStructureResponse(parsed: unknown): Omit<StructureGenerationResult, 'rawResponse'> {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Structure response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;
  if (typeof data['overallTheme'] !== 'string') {
    throw new LLMError('Structure response missing overallTheme', 'STRUCTURE_PARSE_ERROR', true);
  }

  if (!Array.isArray(data['acts']) || data['acts'].length < 3 || data['acts'].length > 5) {
    const received = Array.isArray(data['acts']) ? data['acts'].length : typeof data['acts'];
    throw new LLMError(
      `Structure response must include 3-5 acts (received: ${received})`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const acts = data['acts'].map((act, actIndex) => {
    if (typeof act !== 'object' || act === null || Array.isArray(act)) {
      throw new LLMError(
        `Structure act ${actIndex + 1} must be an object`,
        'STRUCTURE_PARSE_ERROR',
        true
      );
    }

    const actData = act as Record<string, unknown>;
    if (
      typeof actData['name'] !== 'string' ||
      typeof actData['objective'] !== 'string' ||
      typeof actData['stakes'] !== 'string' ||
      typeof actData['entryCondition'] !== 'string'
    ) {
      throw new LLMError(
        `Structure act ${actIndex + 1} is missing required fields`,
        'STRUCTURE_PARSE_ERROR',
        true
      );
    }

    if (
      !Array.isArray(actData['beats']) ||
      actData['beats'].length < 2 ||
      actData['beats'].length > 4
    ) {
      const received = Array.isArray(actData['beats'])
        ? actData['beats'].length
        : typeof actData['beats'];
      throw new LLMError(
        `Structure act ${actIndex + 1} must have 2-4 beats (received: ${received})`,
        'STRUCTURE_PARSE_ERROR',
        true
      );
    }

    const beats = actData['beats'].map((beat, beatIndex) => {
      if (typeof beat !== 'object' || beat === null || Array.isArray(beat)) {
        throw new LLMError(
          `Structure beat ${actIndex + 1}.${beatIndex + 1} must be an object`,
          'STRUCTURE_PARSE_ERROR',
          true
        );
      }

      const beatData = beat as Record<string, unknown>;
      if (
        typeof beatData['name'] !== 'string' ||
        typeof beatData['description'] !== 'string' ||
        typeof beatData['objective'] !== 'string'
      ) {
        throw new LLMError(
          `Structure beat ${actIndex + 1}.${beatIndex + 1} is missing required fields`,
          'STRUCTURE_PARSE_ERROR',
          true
        );
      }

      const role = typeof beatData['role'] === 'string' ? beatData['role'] : 'escalation';

      return {
        name: beatData['name'],
        description: beatData['description'],
        objective: beatData['objective'],
        role,
      };
    });

    return {
      name: actData['name'],
      objective: actData['objective'],
      stakes: actData['stakes'],
      entryCondition: actData['entryCondition'],
      beats,
    };
  });

  const premise = typeof data['premise'] === 'string' ? data['premise'] : data['overallTheme'];
  const rawBudget = data['pacingBudget'];
  const pacingBudget =
    typeof rawBudget === 'object' && rawBudget !== null
      ? {
          targetPagesMin:
            typeof (rawBudget as Record<string, unknown>)['targetPagesMin'] === 'number'
              ? ((rawBudget as Record<string, unknown>)['targetPagesMin'] as number)
              : 15,
          targetPagesMax:
            typeof (rawBudget as Record<string, unknown>)['targetPagesMax'] === 'number'
              ? ((rawBudget as Record<string, unknown>)['targetPagesMax'] as number)
              : 50,
        }
      : { targetPagesMin: 15, targetPagesMax: 50 };

  const rawAgendas = data['initialNpcAgendas'];
  const initialNpcAgendas: Array<{
    npcName: string;
    currentGoal: string;
    leverage: string;
    fear: string;
    offScreenBehavior: string;
  }> = [];

  if (Array.isArray(rawAgendas)) {
    for (const agenda of rawAgendas) {
      if (typeof agenda === 'object' && agenda !== null && !Array.isArray(agenda)) {
        const a = agenda as Record<string, unknown>;
        if (
          typeof a['npcName'] === 'string' &&
          typeof a['currentGoal'] === 'string' &&
          typeof a['leverage'] === 'string' &&
          typeof a['fear'] === 'string' &&
          typeof a['offScreenBehavior'] === 'string'
        ) {
          initialNpcAgendas.push({
            npcName: a['npcName'],
            currentGoal: a['currentGoal'],
            leverage: a['leverage'],
            fear: a['fear'],
            offScreenBehavior: a['offScreenBehavior'],
          });
        }
      }
    }
  }

  return {
    overallTheme: data['overallTheme'],
    premise,
    pacingBudget,
    acts,
    ...(initialNpcAgendas.length > 0 ? { initialNpcAgendas } : {}),
  };
}

export async function generateStoryStructure(
  context: StructureContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<StructureGenerationResult> {
  const resolvedOptions: GenerationOptions = {
    apiKey,
    ...options,
  };
  const promptOptions = resolvePromptOptions(resolvedOptions);
  const config = getConfig().llm;
  const model = options?.model ?? config.defaultModel;
  const temperature = options?.temperature ?? config.temperature;
  const maxTokens = options?.maxTokens ?? config.maxTokens;

  const messages = buildStructurePrompt(context, promptOptions);
  logPrompt(logger, 'structure', messages);

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
        response_format: STRUCTURE_GENERATION_SCHEMA,
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
      const parsed = parseStructureResponse(parsedMessage.parsed);
      return { ...parsed, rawResponse: responseText };
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
