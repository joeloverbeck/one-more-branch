import { getConfig } from '../config/index.js';
import type { GenerationOptions, PromptOptions } from './types.js';

/**
 * Returns default prompt options from configuration.
 */
export function getDefaultPromptOptions(): PromptOptions {
  const { promptOptions } = getConfig().llm;
  return {
    fewShotMode: promptOptions.fewShotMode,
    enableChainOfThought: promptOptions.enableChainOfThought,
    choiceGuidance: promptOptions.choiceGuidance,
  };
}

/**
 * Merges user-provided prompt options with defaults from configuration.
 * All enhancements are enabled by default for maximum story quality.
 */
export function resolvePromptOptions(options: GenerationOptions): PromptOptions {
  return {
    ...getDefaultPromptOptions(),
    ...options.promptOptions,
  };
}
