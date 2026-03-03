import { getConfig } from './index.js';
import type { LlmStage } from './llm-stage-registry.js';
export type { LlmStage };

export function getStageModel(stage: LlmStage): string {
  const config = getConfig().llm;
  return config.models?.[stage] ?? config.defaultModel;
}

export function getStageMaxTokens(stage: LlmStage): number {
  const config = getConfig().llm;
  return config.stageMaxTokens?.[stage] ?? config.maxTokens;
}
