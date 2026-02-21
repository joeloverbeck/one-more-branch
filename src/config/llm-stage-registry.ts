export const LLM_STAGE_KEYS = [
  'kernelIdeator',
  'kernelEvaluator',
  'conceptIdeator',
  'conceptEvolver',
  'conceptEvaluator',
  'conceptStressTester',
  'conceptVerifier',
  'spine',
  'entityDecomposer',
  'structure',
  'planner',
  'accountant',
  'lorekeeper',
  'writer',
  'analyst',
  'agendaResolver',
] as const;

export type LlmStage = (typeof LLM_STAGE_KEYS)[number];
