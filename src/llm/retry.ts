import { getConfig } from '../config/index.js';
import { LLMError } from './llm-client-types.js';

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries?: number,
  baseDelay?: number
): Promise<T> {
  const config = getConfig().llm.retry;
  const retries = maxRetries ?? config.maxRetries;
  const baseDelayMs = baseDelay ?? config.baseDelayMs;
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (error instanceof LLMError && !error.retryable) {
        throw error;
      }

      if (attempt < retries - 1) {
        const waitTime = baseDelayMs * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new LLMError('Generation failed after retries', 'UNKNOWN_ERROR', true);
}
