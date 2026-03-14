import { getConfig } from '../config/index.js';
import { getStageMaxTokens, getStageModel, type LlmStage } from '../config/stage-model.js';
import { logger, logPrompt, logResponse } from '../logging/index.js';
import type {
  MacroArchitectureResult,
  StructureGenerationResult,
} from '../models/structure-generation.js';
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
import { validateAndRepairStructure } from './structure-validator.js';

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

  const validated = await validateAndRepairStructure(result, context, apiKey, resolvedOptions);
  return validated.result;
}
