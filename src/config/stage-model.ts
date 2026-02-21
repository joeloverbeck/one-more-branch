import { getConfig } from './index.js';

export type LlmStage =
  | 'kernelIdeator'
  | 'kernelEvaluator'
  | 'conceptIdeator'
  | 'conceptEvaluator'
  | 'conceptStressTester'
  | 'conceptVerifier'
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
