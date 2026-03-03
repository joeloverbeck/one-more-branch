import { getConfig } from '../config/index.js';
import type { LlmStage } from '../config/stage-model.js';
import { logger } from '../logging/index.js';
import { LLMError } from './llm-client-types.js';

export async function withModelFallback<T>(
  fn: (model: string) => Promise<T>,
  primaryModel: string,
  stage: LlmStage
): Promise<T> {
  try {
    return await fn(primaryModel);
  } catch (error) {
    const defaultModel = getConfig().llm.defaultModel;

    if (
      error instanceof LLMError &&
      error.code === 'HTTP_429' &&
      primaryModel !== defaultModel
    ) {
      logger.warn(
        `Stage "${stage}": model ${primaryModel} rate-limited (429), falling back to ${defaultModel}`
      );
      return fn(defaultModel);
    }

    if (
      error instanceof LLMError &&
      error.code === 'REASONING_MODEL_ERROR' &&
      primaryModel !== defaultModel
    ) {
      logger.warn(
        `Stage "${stage}": model ${primaryModel} reasoning error, falling back to ${defaultModel}`
      );
      return fn(defaultModel);
    }

    throw error;
  }
}
