import { logger, logPrompt } from '../logging/index.js';
import { generateWithFallback } from './generation-strategy.js';
import { OPENROUTER_API_URL } from './http-client.js';
import { resolvePromptOptions } from './options.js';
import { buildContinuationPrompt, buildOpeningPrompt } from './prompts.js';
import { withRetry } from './retry.js';
import {
  type ContinuationContext,
  type GenerationOptions,
  type GenerationResult,
  type OpeningContext,
} from './types.js';

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
): Promise<GenerationResult> {
  const promptOptions = resolvePromptOptions(options);
  const messages = buildContinuationPrompt(context, promptOptions);

  logPrompt(logger, 'continuation', messages);

  const resolvedOptions = { ...options, promptOptions };
  return withRetry(() => generateWithFallback(messages, resolvedOptions));
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
