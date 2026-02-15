import { getConfig } from './index.js';

export type LlmStage =
  | 'spine'
  | 'entityDecomposer'
  | 'structure'
  | 'planner'
  | 'accountant'
  | 'lorekeeper'
  | 'writer'
  | 'analyst'
  | 'agendaResolver';

export function getStageModel(stage: LlmStage): string {
  const config = getConfig().llm;
  return config.models?.[stage] ?? config.defaultModel;
}
