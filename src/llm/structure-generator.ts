import { getConfig } from '../config/index.js';
import { logger, logPrompt } from '../logging/index.js';
import {
  OPENROUTER_API_URL,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from './http-client.js';
import { resolvePromptOptions } from './options.js';
import { buildStructurePrompt, type StructureContext } from './prompts/structure-prompt.js';
import { withRetry } from './retry.js';
import { STRUCTURE_GENERATION_SCHEMA } from './schemas/structure-schema.js';
import { type GenerationOptions, LLMError } from './types.js';

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

  if (!Array.isArray(data['acts']) || data['acts'].length !== 3) {
    throw new LLMError('Structure response must include exactly 3 acts', 'STRUCTURE_PARSE_ERROR', true);
  }

  const acts = data['acts'].map((act, actIndex) => {
    if (typeof act !== 'object' || act === null || Array.isArray(act)) {
      throw new LLMError(
        `Structure act ${actIndex + 1} must be an object`,
        'STRUCTURE_PARSE_ERROR',
        true,
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
        true,
      );
    }

    if (!Array.isArray(actData['beats']) || actData['beats'].length < 2 || actData['beats'].length > 4) {
      throw new LLMError(
        `Structure act ${actIndex + 1} must have 2-4 beats`,
        'STRUCTURE_PARSE_ERROR',
        true,
      );
    }

    const beats = actData['beats'].map((beat, beatIndex) => {
      if (typeof beat !== 'object' || beat === null || Array.isArray(beat)) {
        throw new LLMError(
          `Structure beat ${actIndex + 1}.${beatIndex + 1} must be an object`,
          'STRUCTURE_PARSE_ERROR',
          true,
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
          true,
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
          targetPagesMin: typeof (rawBudget as Record<string, unknown>)['targetPagesMin'] === 'number'
            ? ((rawBudget as Record<string, unknown>)['targetPagesMin'] as number)
            : 15,
          targetPagesMax: typeof (rawBudget as Record<string, unknown>)['targetPagesMax'] === 'number'
            ? ((rawBudget as Record<string, unknown>)['targetPagesMax'] as number)
            : 50,
        }
      : { targetPagesMin: 15, targetPagesMax: 50 };

  return {
    overallTheme: data['overallTheme'],
    premise,
    pacingBudget,
    acts,
  };
}

export async function generateStoryStructure(
  context: StructureContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<StructureGenerationResult> {
  const resolvedOptions: GenerationOptions = {
    apiKey,
    ...options,
  };
  const promptOptions = resolvePromptOptions(resolvedOptions);
  const config = getConfig().llm;
  const model = options?.model ?? config.defaultModel;
  const temperature = options?.temperature ?? 0.8;
  const maxTokens = options?.maxTokens ?? 2000;

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
    const parsed = parseStructureResponse(parsedMessage.parsed);

    return {
      ...parsed,
      rawResponse: responseText,
    };
  });
}
