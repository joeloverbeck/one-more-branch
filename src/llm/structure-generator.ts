import { getConfig } from '../config/index.js';
import { getStageMaxTokens, getStageModel, type LlmStage } from '../config/stage-model.js';
import { logger, logPrompt, logResponse } from '../logging/index.js';
import type {
  MacroArchitectureResult,
  StructureGenerationResult,
} from '../models/structure-generation.js';
import { getGenreObligationTags } from '../models/genre-obligations.js';
import {
  OPENROUTER_API_URL,
  extractResponseContent,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from './http-client.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import type { ChatMessage, JsonSchema } from './llm-client-types.js';
import { LLMError } from './llm-client-types.js';
import { parseMacroArchitectureResponseObject } from './macro-architecture-response-parser.js';
import { parseMilestoneGenerationResponseObject } from './milestone-generation-response-parser.js';
import { withModelFallback } from './model-fallback.js';
import { resolvePromptOptions } from './options.js';
import { buildMacroArchitecturePrompt } from './prompts/macro-architecture-prompt.js';
import {
  buildMilestoneGenerationPrompt,
  type StructureContext,
} from './prompts/milestone-generation-prompt.js';
import { withRetry } from './retry.js';
import { MACRO_ARCHITECTURE_SCHEMA } from './schemas/macro-architecture-schema.js';
import { MILESTONE_GENERATION_SCHEMA } from './schemas/milestone-generation-schema.js';

const MIN_UNIQUE_TRACED_SETPIECES = 4;

function countUniqueSetpieceIndices(
  result: Omit<StructureGenerationResult, 'rawResponse'>
): number {
  const unique = new Set<number>();
  for (const act of result.acts) {
    for (const milestone of act.milestones) {
      if (typeof milestone.setpieceSourceIndex === 'number') {
        unique.add(milestone.setpieceSourceIndex);
      }
    }
  }
  return unique.size;
}

function collectTaggedObligations(
  result: Omit<StructureGenerationResult, 'rawResponse'>
): Set<string> {
  const tagged = new Set<string>();
  for (const act of result.acts) {
    for (const milestone of act.milestones) {
      if (typeof milestone.obligatorySceneTag === 'string') {
        tagged.add(milestone.obligatorySceneTag);
      }
    }
  }
  return tagged;
}

async function callStructuredStage<T>(
  stage: LlmStage,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  schema: JsonSchema,
  temperature: number,
  maxTokens: number,
  parse: (parsed: unknown, rawText: string) => T
): Promise<T> {
  logPrompt(logger, stage, messages);

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
      response_format: schema,
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
  const content = extractResponseContent(data, stage, model, maxTokens);
  const parsedMessage = parseMessageJsonContent(content);
  const responseText = parsedMessage.rawText;
  logResponse(logger, stage, responseText);

  try {
    return parse(parsedMessage.parsed, responseText);
  } catch (error) {
    if (error instanceof LLMError) {
      throw new LLMError(error.message, error.code, error.retryable, {
        rawContent: responseText,
      });
    }
    throw error;
  }
}

async function generateMacroArchitecture(
  context: StructureContext,
  apiKey: string,
  options: {
    model: string;
    temperature: number;
    maxTokens: number;
    promptOptions: ReturnType<typeof resolvePromptOptions>;
  }
): Promise<MacroArchitectureResult> {
  const messages = buildMacroArchitecturePrompt(context, options.promptOptions);
  return callStructuredStage(
    'macroArchitecture',
    apiKey,
    options.model,
    messages,
    MACRO_ARCHITECTURE_SCHEMA,
    options.temperature,
    options.maxTokens,
    (parsed, rawText) => ({
      ...parseMacroArchitectureResponseObject(parsed),
      rawResponse: rawText,
    })
  );
}

async function generateMilestones(
  context: StructureContext,
  macroArchitecture: MacroArchitectureResult,
  apiKey: string,
  options: {
    model: string;
    temperature: number;
    maxTokens: number;
    promptOptions: ReturnType<typeof resolvePromptOptions>;
  }
): Promise<StructureGenerationResult> {
  const messages = buildMilestoneGenerationPrompt(context, macroArchitecture, options.promptOptions);
  const milestoneStageResult = await callStructuredStage(
    'milestoneGeneration',
    apiKey,
    options.model,
    messages,
    MILESTONE_GENERATION_SCHEMA,
    options.temperature,
    options.maxTokens,
    (parsed, rawText) => ({
      parsed: parseMilestoneGenerationResponseObject(parsed, macroArchitecture, {
        verifiedSetpieceCount: context.conceptVerification?.escalatingSetpieces.length ?? 0,
      }),
      rawResponse: rawText,
    })
  );
  const milestoneResult = milestoneStageResult.parsed;

  return {
    overallTheme: macroArchitecture.overallTheme,
    premise: macroArchitecture.premise,
    openingImage: macroArchitecture.openingImage,
    closingImage: macroArchitecture.closingImage,
    pacingBudget: macroArchitecture.pacingBudget,
    anchorMoments: macroArchitecture.anchorMoments,
    initialNpcAgendas: macroArchitecture.initialNpcAgendas,
    acts: macroArchitecture.acts.map((act, actIndex) => ({
      ...act,
      milestones: milestoneResult.acts[actIndex]?.milestones ?? [],
    })),
    rawResponse: `[macroArchitecture]\n${macroArchitecture.rawResponse}\n\n[milestoneGeneration]\n${milestoneStageResult.rawResponse}`,
  };
}

function warnOnSoftValidation(
  result: Omit<StructureGenerationResult, 'rawResponse'>,
  hasConceptVerification: boolean,
  expectedGenreObligations: readonly string[] | null
): void {
  if (hasConceptVerification) {
    const uniqueSetpiecesUsed = countUniqueSetpieceIndices(result);
    if (uniqueSetpiecesUsed < MIN_UNIQUE_TRACED_SETPIECES) {
      logger.warn(
        `Structure setpiece tracing below target: ${uniqueSetpiecesUsed}/${MIN_UNIQUE_TRACED_SETPIECES} unique setpieces mapped`
      );
    }
  }

  if (expectedGenreObligations && expectedGenreObligations.length > 0) {
    const tagged = collectTaggedObligations(result);
    const missing = expectedGenreObligations.filter((tag) => !tagged.has(tag));
    if (missing.length > 0) {
      logger.warn(`Structure missing genre obligation tags: ${missing.join(', ')}`);
    }
  }
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
  const overrideModel = options?.model;
  const temperature = options?.temperature ?? config.temperature;
  const macroMaxTokens = options?.maxTokens ?? getStageMaxTokens('macroArchitecture');
  const milestoneMaxTokens = options?.maxTokens ?? getStageMaxTokens('milestoneGeneration');
  const hasConceptVerification = (context.conceptVerification?.escalatingSetpieces.length ?? 0) > 0;
  const expectedGenreObligationEntries = context.conceptSpec
    ? getGenreObligationTags(context.conceptSpec.genreFrame)
    : null;
  const expectedGenreObligations = expectedGenreObligationEntries
    ? expectedGenreObligationEntries.map((entry) => entry.tag)
    : null;

  const macroArchitecture = await withRetry(() =>
    withModelFallback(
      (model) =>
        generateMacroArchitecture(context, apiKey, {
          model,
          temperature,
          maxTokens: macroMaxTokens,
          promptOptions,
        }),
      overrideModel ?? getStageModel('macroArchitecture'),
      'macroArchitecture'
    )
  );

  const result = await withRetry(() =>
    withModelFallback(
      (model) =>
        generateMilestones(context, macroArchitecture, apiKey, {
          model,
          temperature,
          maxTokens: milestoneMaxTokens,
          promptOptions,
        }),
      overrideModel ?? getStageModel('milestoneGeneration'),
      'milestoneGeneration'
    )
  );

  warnOnSoftValidation(result, hasConceptVerification, expectedGenreObligations);
  return result;
}
