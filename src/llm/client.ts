import { getStageModel } from '../config/stage-model.js';
import { logger, logPrompt, logResponse } from '../logging/index.js';
import { generateAccountantWithFallback } from './accountant-generation.js';
import { generateLorekeeperWithFallback } from './lorekeeper-generation.js';
import { generateStructureEvaluatorWithFallback } from './structure-evaluator-generation.js';
import { generatePromiseTrackerWithFallback } from './promise-tracker-generation.js';
import { generateProseQualityWithFallback } from './prose-quality-generation.js';
import { generateNpcIntelligenceWithFallback } from './npc-intelligence-generation.js';
import { OPENROUTER_API_URL } from './http-client.js';
import { withModelFallback } from './model-fallback.js';
import { resolvePromptOptions } from './options.js';
import { generatePlannerWithFallback } from './planner-generation.js';
import { buildStructureEvaluatorPrompt } from './prompts/structure-evaluator-prompt.js';
import { buildPromiseTrackerPrompt } from './prompts/promise-tracker-prompt.js';
import { buildProseQualityPrompt } from './prompts/prose-quality-prompt.js';
import { buildNpcIntelligencePrompt } from './prompts/npc-intelligence-prompt.js';
import { buildLorekeeperPrompt } from './prompts/lorekeeper-prompt.js';
import {
  buildContinuationPrompt,
  buildOpeningPrompt,
  buildPagePlannerPrompt,
  buildStateAccountantPrompt,
} from './prompts/index.js';
import { withRetry } from './retry.js';
import type { StateAccountantGenerationResult } from './accountant-types.js';
import type { StructureEvaluatorContext, StructureEvaluatorResult } from './structure-evaluator-types.js';
import type { PromiseTrackerContext, PromiseTrackerResult } from './promise-tracker-types.js';
import type { ProseQualityContext, ProseQualityResult } from './prose-quality-types.js';
import type { NpcIntelligenceContext, NpcIntelligenceResult } from './npc-intelligence-types.js';
import type {
  ContinuationContext,
  LorekeeperContext,
  OpeningContext,
  PagePlanContext,
} from './context-types.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import type { LorekeeperResult } from './lorekeeper-types.js';
import type {
  PagePlan,
  ReducedPagePlanGenerationResult,
  ReducedPagePlanResult,
} from './planner-types.js';
import type { PageWriterResult } from './writer-types.js';
import { generateWriterWithFallback } from './writer-generation.js';
import { generateChoiceGeneratorWithFallback } from './choice-generator-generation.js';
import {
  buildChoiceGeneratorPrompt,
  type ChoiceGeneratorContext,
} from './prompts/choice-generator-prompt.js';
import type { ChoiceGeneratorResult } from './choice-generator-types.js';

export async function generateOpeningPage(
  context: OpeningContext,
  options: GenerationOptions
): Promise<PageWriterResult> {
  const promptOptions = resolvePromptOptions(options);
  const messages = buildOpeningPrompt(context, promptOptions);

  logPrompt(logger, 'opening', messages);

  const resolvedOptions = { ...options, promptOptions };
  const primaryModel = resolvedOptions.model ?? getStageModel('writer');
  const result = await withRetry(() =>
    withModelFallback(
      (m) => generateWriterWithFallback(messages, { ...resolvedOptions, model: m }),
      primaryModel,
      'writer'
    )
  );
  logResponse(logger, 'opening', result.rawResponse);
  return result;
}

export async function generateWriterPage(
  context: ContinuationContext,
  options: GenerationOptions
): Promise<PageWriterResult> {
  const promptOptions = resolvePromptOptions(options);
  const messages = buildContinuationPrompt(context, promptOptions);

  logPrompt(logger, 'writer', messages);

  const resolvedOptions = { ...options, promptOptions };
  const primaryModel = resolvedOptions.model ?? getStageModel('writer');
  const result = await withRetry(() =>
    withModelFallback(
      (m) => generateWriterWithFallback(messages, { ...resolvedOptions, model: m }),
      primaryModel,
      'writer'
    )
  );
  logResponse(logger, 'writer', result.rawResponse);
  return result;
}

export async function generatePageWriterOutput(
  context: ContinuationContext,
  plan: PagePlan,
  options: GenerationOptions
): Promise<PageWriterResult> {
  return generateWriterPage({ ...context, pagePlan: plan }, options);
}

export async function generateStructureEvaluation(
  context: StructureEvaluatorContext,
  options: GenerationOptions
): Promise<StructureEvaluatorResult & { rawResponse: string }> {
  const messages = buildStructureEvaluatorPrompt(context);

  logPrompt(logger, 'structureEvaluator', messages);

  const evalOptions = { ...options, temperature: 0.3 };
  const primaryModel = evalOptions.model ?? getStageModel('structureEvaluator');
  const result = await withRetry(() =>
    withModelFallback(
      (m) => generateStructureEvaluatorWithFallback(messages, { ...evalOptions, model: m }),
      primaryModel,
      'structureEvaluator'
    )
  );
  logResponse(logger, 'structureEvaluator', result.rawResponse);
  return result;
}

export async function generatePromiseTracking(
  context: PromiseTrackerContext,
  options: GenerationOptions
): Promise<PromiseTrackerResult & { rawResponse: string }> {
  const messages = buildPromiseTrackerPrompt(context);

  logPrompt(logger, 'promiseTracker', messages);

  const evalOptions = { ...options, temperature: 0.3 };
  const primaryModel = evalOptions.model ?? getStageModel('promiseTracker');
  const result = await withRetry(() =>
    withModelFallback(
      (m) => generatePromiseTrackerWithFallback(messages, { ...evalOptions, model: m }),
      primaryModel,
      'promiseTracker'
    )
  );
  logResponse(logger, 'promiseTracker', result.rawResponse);
  return result;
}

export async function generateProseQualityEvaluation(
  context: ProseQualityContext,
  options: GenerationOptions
): Promise<ProseQualityResult & { rawResponse: string }> {
  const messages = buildProseQualityPrompt(context);

  logPrompt(logger, 'proseQuality', messages);

  const evalOptions = { ...options, temperature: 0.3 };
  const primaryModel = evalOptions.model ?? getStageModel('proseQuality');
  const result = await withRetry(() =>
    withModelFallback(
      (m) => generateProseQualityWithFallback(messages, { ...evalOptions, model: m }),
      primaryModel,
      'proseQuality'
    )
  );
  logResponse(logger, 'proseQuality', result.rawResponse);
  return result;
}

export async function generateNpcIntelligenceEvaluation(
  context: NpcIntelligenceContext,
  options: GenerationOptions
): Promise<NpcIntelligenceResult & { rawResponse: string }> {
  const messages = buildNpcIntelligencePrompt(context);

  logPrompt(logger, 'npcIntelligence', messages);

  const evalOptions = { ...options, temperature: 0.3 };
  const primaryModel = evalOptions.model ?? getStageModel('npcIntelligence');
  const result = await withRetry(() =>
    withModelFallback(
      (m) => generateNpcIntelligenceWithFallback(messages, { ...evalOptions, model: m }),
      primaryModel,
      'npcIntelligence'
    )
  );
  logResponse(logger, 'npcIntelligence', result.rawResponse);
  return result;
}

export async function generatePagePlan(
  context: PagePlanContext,
  options: GenerationOptions
): Promise<ReducedPagePlanGenerationResult> {
  const messages = buildPagePlannerPrompt(context);

  logPrompt(logger, 'planner', messages);

  const primaryModel = options.model ?? getStageModel('planner');
  const result = await withRetry(() =>
    withModelFallback(
      (m) => generatePlannerWithFallback(messages, { ...options, model: m }),
      primaryModel,
      'planner'
    )
  );
  logResponse(logger, 'planner', result.rawResponse);
  return result;
}

export async function generateStateAccountant(
  context: PagePlanContext,
  reducedPlan: ReducedPagePlanResult,
  options: GenerationOptions
): Promise<StateAccountantGenerationResult> {
  const messages = buildStateAccountantPrompt(context, reducedPlan);

  logPrompt(logger, 'accountant', messages);

  const primaryModel = options.model ?? getStageModel('accountant');
  const result = await withRetry(() =>
    withModelFallback(
      (m) => generateAccountantWithFallback(messages, { ...options, model: m }),
      primaryModel,
      'accountant'
    )
  );
  logResponse(logger, 'accountant', result.rawResponse);
  return result;
}

export async function generateLorekeeperBible(
  context: LorekeeperContext,
  options: GenerationOptions
): Promise<LorekeeperResult> {
  const messages = buildLorekeeperPrompt(context);

  logPrompt(logger, 'lorekeeper', messages);

  const lorekeeperOptions = { ...options, temperature: 0.3 };
  const primaryModel = lorekeeperOptions.model ?? getStageModel('lorekeeper');
  const result = await withRetry(() =>
    withModelFallback(
      (m) => generateLorekeeperWithFallback(messages, { ...lorekeeperOptions, model: m }),
      primaryModel,
      'lorekeeper'
    )
  );
  logResponse(logger, 'lorekeeper', result.rawResponse);
  return result;
}

export async function generateChoices(
  context: ChoiceGeneratorContext,
  options: GenerationOptions
): Promise<ChoiceGeneratorResult> {
  const messages = buildChoiceGeneratorPrompt(context);

  logPrompt(logger, 'choiceGenerator', messages);

  const primaryModel = options.model ?? getStageModel('choiceGenerator');
  const result = await withRetry(() =>
    withModelFallback(
      (m) => generateChoiceGeneratorWithFallback(messages, { ...options, model: m }),
      primaryModel,
      'choiceGenerator'
    )
  );
  logResponse(logger, 'choiceGenerator', result.rawResponse);
  return result;
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      }),
    });

    return response.status !== 401;
  } catch {
    return true;
  }
}
