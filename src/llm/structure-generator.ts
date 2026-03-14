import { getConfig } from '../config/index.js';
import { getStageMaxTokens } from '../config/stage-model.js';
import { runGenerationStage } from '../engine/generation-pipeline-helpers.js';
import type { GenerationStage, GenerationStageCallback } from '../engine/types.js';
import type {
  MacroArchitectureResult,
  StructureGenerationResult,
} from '../models/structure-generation.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { runLlmStage } from './llm-stage-runner.js';
import { parseMacroArchitectureResponseObject } from './macro-architecture-response-parser.js';
import { parseMilestoneGenerationResponseObject } from './milestone-generation-response-parser.js';
import { resolvePromptOptions } from './options.js';
import { buildMacroArchitecturePrompt } from './prompts/macro-architecture-prompt.js';
import {
  buildMilestoneGenerationPrompt,
  type StructureContext,
} from './prompts/milestone-generation-prompt.js';
import { MACRO_ARCHITECTURE_SCHEMA } from './schemas/macro-architecture-schema.js';
import { MILESTONE_GENERATION_SCHEMA } from './schemas/milestone-generation-schema.js';
import { validateAndRepairStructure } from './structure-validator.js';

type StructureGenerationOptions = Partial<GenerationOptions> & {
  onGenerationStage?: GenerationStageCallback;
};

const STRUCTURE_PIPELINE_STAGES = {
  macroArchitecture: 'DESIGNING_ARCHITECTURE',
  milestoneGeneration: 'GENERATING_MILESTONES',
  validation: 'VALIDATING_STRUCTURE',
} satisfies Record<'macroArchitecture' | 'milestoneGeneration' | 'validation', GenerationStage>;

async function generateMacroArchitecture(
  context: StructureContext,
  apiKey: string,
  options: {
    model?: string;
    temperature: number;
    maxTokens: number;
    promptOptions: ReturnType<typeof resolvePromptOptions>;
  }
): Promise<MacroArchitectureResult> {
  const messages = buildMacroArchitecturePrompt(context, options.promptOptions);
  const result = await runLlmStage({
    stageModel: 'macroArchitecture',
    promptType: 'macroArchitecture',
    apiKey,
    options: {
      ...(options.model ? { model: options.model } : {}),
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    },
    schema: MACRO_ARCHITECTURE_SCHEMA,
    messages,
    parseResponse: (parsed) => parseMacroArchitectureResponseObject(parsed),
  });

  return {
    ...result.parsed,
    rawResponse: result.rawResponse,
  };
}

async function generateMilestones(
  context: StructureContext,
  macroArchitecture: MacroArchitectureResult,
  apiKey: string,
  options: {
    model?: string;
    temperature: number;
    maxTokens: number;
    promptOptions: ReturnType<typeof resolvePromptOptions>;
  }
): Promise<StructureGenerationResult> {
  const messages = buildMilestoneGenerationPrompt(context, macroArchitecture, options.promptOptions);
  const milestoneStageResult = await runLlmStage({
    stageModel: 'milestoneGeneration',
    promptType: 'milestoneGeneration',
    apiKey,
    options: {
      ...(options.model ? { model: options.model } : {}),
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    },
    schema: MILESTONE_GENERATION_SCHEMA,
    messages,
    parseResponse: (parsed) =>
      parseMilestoneGenerationResponseObject(parsed, macroArchitecture, {
        verifiedSetpieceCount: context.conceptVerification?.escalatingSetpieces.length ?? 0,
      }),
  });
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
  options?: StructureGenerationOptions
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
  const macroArchitecture = await runGenerationStage(
    options?.onGenerationStage,
    STRUCTURE_PIPELINE_STAGES.macroArchitecture,
    () =>
      generateMacroArchitecture(context, apiKey, {
        ...(overrideModel ? { model: overrideModel } : {}),
        temperature,
        maxTokens: macroMaxTokens,
        promptOptions,
      })
  );

  const result = await runGenerationStage(
    options?.onGenerationStage,
    STRUCTURE_PIPELINE_STAGES.milestoneGeneration,
    () =>
      generateMilestones(context, macroArchitecture, apiKey, {
        ...(overrideModel ? { model: overrideModel } : {}),
        temperature,
        maxTokens: milestoneMaxTokens,
        promptOptions,
      })
  );

  const validated = await runGenerationStage(
    options?.onGenerationStage,
    STRUCTURE_PIPELINE_STAGES.validation,
    () => validateAndRepairStructure(result, context, apiKey, resolvedOptions)
  );
  return validated.result;
}
