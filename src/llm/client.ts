import { logger, logPrompt } from '../logging/index.js';
import { generateAnalystWithFallback } from './analyst-generation.js';
import { generateWithFallback } from './generation-strategy.js';
import { OPENROUTER_API_URL } from './http-client.js';
import { resolvePromptOptions } from './options.js';
import { buildAnalystPrompt } from './prompts/analyst-prompt.js';
import { buildContinuationPrompt, buildOpeningPrompt } from './prompts/index.js';
import { withRetry } from './retry.js';
import {
  type AnalystContext,
  type AnalystResult,
  type ContinuationGenerationResult,
  type ContinuationContext,
  type GenerationOptions,
  type GenerationResult,
  type OpeningContext,
  type WriterResult,
} from './types.js';
import { generateWriterWithFallback } from './writer-generation.js';

export async function generateOpeningPage(
  context: OpeningContext,
  options: GenerationOptions,
): Promise<GenerationResult> {
  const promptOptions = resolvePromptOptions(options);
  const messages = buildOpeningPrompt(context, promptOptions);

  logPrompt(logger, 'opening', messages);

  const resolvedOptions = { ...options, promptOptions };
  return withRetry(() => generateWithFallback(messages, resolvedOptions));
}

export async function generateContinuationPage(
  context: ContinuationContext,
  options: GenerationOptions,
): Promise<ContinuationGenerationResult> {
  const promptOptions = resolvePromptOptions(options);
  const messages = buildContinuationPrompt(context, promptOptions);

  logPrompt(logger, 'continuation', messages);

  const resolvedOptions = { ...options, promptOptions };
  return withRetry(() => generateWithFallback(messages, resolvedOptions));
}

export async function generateWriterPage(
  context: ContinuationContext,
  options: GenerationOptions,
): Promise<WriterResult> {
  const promptOptions = resolvePromptOptions(options);
  const messages = buildContinuationPrompt(context, promptOptions);

  logPrompt(logger, 'writer', messages);

  const resolvedOptions = { ...options, promptOptions };
  return withRetry(() => generateWriterWithFallback(messages, resolvedOptions));
}

export async function generateAnalystEvaluation(
  context: AnalystContext,
  options: GenerationOptions,
): Promise<AnalystResult> {
  const messages = buildAnalystPrompt(context);

  logPrompt(logger, 'analyst', messages);

  const analystOptions = { ...options, temperature: 0.3, maxTokens: 1024 };
  return withRetry(() => generateAnalystWithFallback(messages, analystOptions));
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
