import { getConfig } from './index.js';
import { getLlmStageCatalogEntry, type LlmStage } from './llm-stage-registry.js';
export type { LlmStage };

export function getStageModel(stage: LlmStage): string {
  const config = getConfig().llm;
  return config.models?.[stage] ?? getLlmStageCatalogEntry(stage).defaultModel ?? config.defaultModel;
}

export function getStageMaxTokens(stage: LlmStage): number {
  const config = getConfig().llm;
  return (
    config.stageMaxTokens?.[stage] ?? getLlmStageCatalogEntry(stage).defaultMaxTokens ?? config.maxTokens
  );
}

export function getStageTemperature(stage: LlmStage): number {
  const config = getConfig().llm;
  return (
    config.stageTemperatures?.[stage] ??
    getLlmStageCatalogEntry(stage).defaultTemperature ??
    config.temperature
  );
}
