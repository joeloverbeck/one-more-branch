import { getStageModel } from '../config/stage-model.js';
import { logger, logPrompt } from '../logging/index.js';
import { generateAccountantWithFallback } from './accountant-generation.js';
import { generateLorekeeperWithFallback } from './lorekeeper-generation.js';
import { generateStructureEvaluatorWithFallback } from './structure-evaluator-generation.js';
import { generatePromiseTrackerWithFallback } from './promise-tracker-generation.js';
import { generateSceneQualityWithFallback } from './scene-quality-generation.js';
import { OPENROUTER_API_URL } from './http-client.js';
import { withModelFallback } from './model-fallback.js';
import { resolvePromptOptions } from './options.js';
import { generatePlannerWithFallback } from './planner-generation.js';
import { buildStructureEvaluatorPrompt } from './prompts/structure-evaluator-prompt.js';
import { buildPromiseTrackerPrompt } from './prompts/promise-tracker-prompt.js';
import { buildSceneQualityPrompt } from './prompts/scene-quality-prompt.js';
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
import type { SceneQualityContext, SceneQualityResult } from './scene-quality-types.js';
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

export async function generateOpeningPage(
  context: OpeningContext,
  options: GenerationOptions
): Promise<PageWriterResult> {
  const promptOptions = resolvePromptOptions(options);
  const messages = buildOpeningPrompt(context, promptOptions);

  logPrompt(logger, 'opening', messages);

  const resolvedOptions = { ...options, promptOptions };
  const primaryModel = resolvedOptions.model ?? getStageModel('writer');
  return withRetry(() =>
    withModelFallback(
      (m) => generateWriterWithFallback(messages, { ...resolvedOptions, model: m }),
      primaryModel,
      'writer'
    )
  );
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
  return withRetry(() =>
    withModelFallback(
      (m) => generateWriterWithFallback(messages, { ...resolvedOptions, model: m }),
      primaryModel,
      'writer'
    )
  );
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

  const evalOptions = { ...options, temperature: 0.3, maxTokens: 8192 };
  const primaryModel = evalOptions.model ?? getStageModel('structureEvaluator');
  return withRetry(() =>
    withModelFallback(
      (m) => generateStructureEvaluatorWithFallback(messages, { ...evalOptions, model: m }),
      primaryModel,
      'structureEvaluator'
    )
  );
}

export async function generatePromiseTracking(
  context: PromiseTrackerContext,
  options: GenerationOptions
): Promise<PromiseTrackerResult & { rawResponse: string }> {
  const messages = buildPromiseTrackerPrompt(context);

  logPrompt(logger, 'promiseTracker', messages);

  const evalOptions = { ...options, temperature: 0.3, maxTokens: 8192 };
  const primaryModel = evalOptions.model ?? getStageModel('promiseTracker');
  return withRetry(() =>
    withModelFallback(
      (m) => generatePromiseTrackerWithFallback(messages, { ...evalOptions, model: m }),
      primaryModel,
      'promiseTracker'
    )
  );
}

export async function generateSceneQualityEvaluation(
  context: SceneQualityContext,
  options: GenerationOptions
): Promise<SceneQualityResult & { rawResponse: string }> {
  const messages = buildSceneQualityPrompt(context);

  logPrompt(logger, 'sceneQuality', messages);

  const evalOptions = { ...options, temperature: 0.3, maxTokens: 8192 };
  const primaryModel = evalOptions.model ?? getStageModel('sceneQuality');
  return withRetry(() =>
    withModelFallback(
      (m) => generateSceneQualityWithFallback(messages, { ...evalOptions, model: m }),
      primaryModel,
      'sceneQuality'
    )
  );
}

export async function generatePagePlan(
  context: PagePlanContext,
  options: GenerationOptions
): Promise<ReducedPagePlanGenerationResult> {
  const messages = buildPagePlannerPrompt(context);

  logPrompt(logger, 'planner', messages);

  const primaryModel = options.model ?? getStageModel('planner');
  return withRetry(() =>
    withModelFallback(
      (m) => generatePlannerWithFallback(messages, { ...options, model: m }),
      primaryModel,
      'planner'
    )
  );
}

export async function generateStateAccountant(
  context: PagePlanContext,
  reducedPlan: ReducedPagePlanResult,
  options: GenerationOptions
): Promise<StateAccountantGenerationResult> {
  const messages = buildStateAccountantPrompt(context, reducedPlan);

  logPrompt(logger, 'accountant', messages);

  const primaryModel = options.model ?? getStageModel('accountant');
  return withRetry(() =>
    withModelFallback(
      (m) => generateAccountantWithFallback(messages, { ...options, model: m }),
      primaryModel,
      'accountant'
    )
  );
}

export async function generateLorekeeperBible(
  context: LorekeeperContext,
  options: GenerationOptions
): Promise<LorekeeperResult> {
  const messages = buildLorekeeperPrompt(context);

  logPrompt(logger, 'lorekeeper', messages);

  const lorekeeperOptions = { ...options, temperature: 0.3, maxTokens: 2048 };
  const primaryModel = lorekeeperOptions.model ?? getStageModel('lorekeeper');
  return withRetry(() =>
    withModelFallback(
      (m) => generateLorekeeperWithFallback(messages, { ...lorekeeperOptions, model: m }),
      primaryModel,
      'lorekeeper'
    )
  );
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
