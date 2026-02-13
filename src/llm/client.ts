import { logger, logPrompt } from '../logging/index.js';
import { generateAnalystWithFallback } from './analyst-generation.js';
import { generateLorekeeperWithFallback } from './lorekeeper-generation.js';
import { OPENROUTER_API_URL } from './http-client.js';
import { resolvePromptOptions } from './options.js';
import { generatePlannerWithFallback } from './planner-generation.js';
import { buildAnalystPrompt } from './prompts/analyst-prompt.js';
import { buildLorekeeperPrompt } from './prompts/lorekeeper-prompt.js';
import {
  buildContinuationPrompt,
  buildOpeningPrompt,
  buildPagePlannerPrompt,
} from './prompts/index.js';
import { withRetry } from './retry.js';
import type { AnalystContext, AnalystResult } from './analyst-types.js';
import type {
  ContinuationContext,
  LorekeeperContext,
  OpeningContext,
  PagePlanContext,
} from './context-types.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import type { LorekeeperResult } from './lorekeeper-types.js';
import type { PagePlan, PagePlanGenerationResult } from './planner-types.js';
import type { WriterResult } from './writer-types.js';
import { generateWriterWithFallback } from './writer-generation.js';

export async function generateOpeningPage(
  context: OpeningContext,
  options: GenerationOptions
): Promise<WriterResult> {
  const promptOptions = resolvePromptOptions(options);
  const messages = buildOpeningPrompt(context, promptOptions);

  logPrompt(logger, 'opening', messages);

  const resolvedOptions = { ...options, promptOptions };
  return withRetry(() => generateWriterWithFallback(messages, resolvedOptions));
}

export async function generateWriterPage(
  context: ContinuationContext,
  options: GenerationOptions
): Promise<WriterResult> {
  const promptOptions = resolvePromptOptions(options);
  const messages = buildContinuationPrompt(context, promptOptions);

  logPrompt(logger, 'writer', messages);

  const resolvedOptions = { ...options, promptOptions };
  return withRetry(() => generateWriterWithFallback(messages, resolvedOptions));
}

export async function generatePageWriterOutput(
  context: ContinuationContext,
  plan: PagePlan,
  options: GenerationOptions
): Promise<WriterResult> {
  return generateWriterPage({ ...context, pagePlan: plan }, options);
}

export async function generateAnalystEvaluation(
  context: AnalystContext,
  options: GenerationOptions
): Promise<AnalystResult> {
  const messages = buildAnalystPrompt(context);

  logPrompt(logger, 'analyst', messages);

  const analystOptions = { ...options, temperature: 0.3, maxTokens: 1024 };
  return withRetry(() => generateAnalystWithFallback(messages, analystOptions));
}

export async function generatePagePlan(
  context: PagePlanContext,
  options: GenerationOptions
): Promise<PagePlanGenerationResult> {
  const messages = buildPagePlannerPrompt(context);

  logPrompt(logger, 'planner', messages);

  return withRetry(() => generatePlannerWithFallback(messages, options));
}

export async function generateLorekeeperBible(
  context: LorekeeperContext,
  options: GenerationOptions
): Promise<LorekeeperResult> {
  const messages = buildLorekeeperPrompt(context);

  logPrompt(logger, 'lorekeeper', messages);

  const lorekeeperOptions = { ...options, temperature: 0.3, maxTokens: 2048 };
  return withRetry(() => generateLorekeeperWithFallback(messages, lorekeeperOptions));
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
