import { getConfig } from '../config/index.js';
import type { GenerationOptions, PromptOptions } from './generation-pipeline-types.js';

/**
 * Returns default prompt options from configuration.
 */
export function getDefaultPromptOptions(): PromptOptions {
  const { promptOptions } = getConfig().llm;
  return {
    fewShotMode: promptOptions.fewShotMode,
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
