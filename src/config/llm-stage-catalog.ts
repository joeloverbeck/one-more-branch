interface LlmStageCatalogEntryDefinition {
  readonly key: string;
  readonly defaultModel?: string;
  readonly defaultMaxTokens?: number;
  readonly defaultTemperature?: number;
}

export const LLM_STAGE_CATALOG = [
  { key: 'kernelIdeator' },
  { key: 'kernelEvaluator', defaultMaxTokens: 32768 },
  { key: 'kernelEvolver', defaultMaxTokens: 32768 },
  { key: 'conceptSeeder', defaultModel: 'anthropic/claude-sonnet-4.6' },
  { key: 'conceptEvolverSeeder', defaultModel: 'anthropic/claude-sonnet-4.6' },
  { key: 'conceptArchitect', defaultModel: 'anthropic/claude-sonnet-4.6' },
  {
    key: 'conceptEngineer',
    defaultModel: 'anthropic/claude-sonnet-4.6',
    defaultMaxTokens: 32768,
  },
  { key: 'conceptEvaluator', defaultMaxTokens: 32768 },
  {
    key: 'conceptStressTester',
    defaultModel: 'anthropic/claude-sonnet-4.6',
    defaultMaxTokens: 32768,
  },
  {
    key: 'conceptSpecificity',
    defaultModel: 'anthropic/claude-sonnet-4.6',
    defaultMaxTokens: 32768,
  },
  {
    key: 'conceptScenario',
    defaultModel: 'anthropic/claude-sonnet-4.6',
    defaultMaxTokens: 32768,
  },
  { key: 'spineFoundation', defaultModel: 'anthropic/claude-sonnet-4.6' },
  { key: 'spineArcEngine', defaultModel: 'anthropic/claude-sonnet-4.6' },
  { key: 'spineSynthesis', defaultModel: 'anthropic/claude-sonnet-4.6' },
  { key: 'entityDecomposer' },
  { key: 'characterDecomposer' },
  { key: 'characterContextualizer' },
  { key: 'characterBrainstormer', defaultModel: 'anthropic/claude-sonnet-4.6' },
  {
    key: 'chatSceneContext',
    defaultModel: 'anthropic/claude-sonnet-4.6',
    defaultMaxTokens: 3000,
    defaultTemperature: 0.3,
  },
  {
    key: 'chatCharacterContext',
    defaultModel: 'anthropic/claude-sonnet-4.6',
    defaultMaxTokens: 3000,
    defaultTemperature: 0.3,
  },
  {
    key: 'chatPlanner',
    defaultModel: 'anthropic/claude-sonnet-4.6',
    defaultMaxTokens: 1000,
    defaultTemperature: 0.3,
  },
  {
    key: 'chatWriter',
    defaultModel: 'anthropic/claude-sonnet-4.6',
    defaultMaxTokens: 2000,
    defaultTemperature: 0.7,
  },
  { key: 'chatStateUpdater', defaultMaxTokens: 2000, defaultTemperature: 0.2 },
  { key: 'chatSummarizer', defaultMaxTokens: 1500, defaultTemperature: 0.2 },
  { key: 'worldbuildingDecomposer' },
  { key: 'macroArchitecture', defaultModel: 'anthropic/claude-sonnet-4.6' },
  { key: 'milestoneGeneration', defaultModel: 'anthropic/claude-sonnet-4.6' },
  { key: 'structure', defaultModel: 'anthropic/claude-sonnet-4.6' },
  { key: 'planner', defaultModel: 'anthropic/claude-sonnet-4.6' },
  { key: 'accountant', defaultMaxTokens: 32768 },
  { key: 'lorekeeper', defaultMaxTokens: 32768 },
  { key: 'sceneBlueprint', defaultModel: 'anthropic/claude-sonnet-4.6' },
  { key: 'writer', defaultModel: 'anthropic/claude-sonnet-4.6' },
  { key: 'choiceGenerator' },
  { key: 'structureEvaluator', defaultMaxTokens: 32768 },
  { key: 'promiseTracker', defaultMaxTokens: 32768 },
  { key: 'proseQuality', defaultMaxTokens: 32768 },
  { key: 'npcIntelligence', defaultMaxTokens: 32768 },
  { key: 'agendaResolver', defaultMaxTokens: 32768 },
  { key: 'sceneIdeator', defaultModel: 'anthropic/claude-sonnet-4.6' },
  { key: 'structureRewrite', defaultModel: 'anthropic/claude-sonnet-4.6' },
  { key: 'structureRepair' },
  { key: 'spineRewrite' },
  { key: 'contentOneShot' },
  { key: 'contentTasteDistiller' },
  { key: 'contentSparkstormer' },
  { key: 'contentPacketer' },
  { key: 'contentEvaluator' },
  { key: 'characterWeb' },
  { key: 'charKernel' },
  { key: 'charTridimensional' },
  { key: 'charAgency' },
  { key: 'charRelationships' },
  { key: 'charPresentation' },
  { key: 'worldbuildingSeed' },
  { key: 'worldbuildingElaboration' },
] as const satisfies readonly LlmStageCatalogEntryDefinition[];

export type LlmStage = (typeof LLM_STAGE_CATALOG)[number]['key'];

export interface LlmStageCatalogEntry {
  readonly key: LlmStage;
  readonly defaultModel?: string;
  readonly defaultMaxTokens?: number;
  readonly defaultTemperature?: number;
}

export const LLM_STAGE_KEYS: readonly LlmStage[] = LLM_STAGE_CATALOG.map((entry) => entry.key);

function toLlmStageCatalogEntry(entry: (typeof LLM_STAGE_CATALOG)[number]): LlmStageCatalogEntry {
  return {
    key: entry.key,
    ...('defaultModel' in entry ? { defaultModel: entry.defaultModel } : {}),
    ...('defaultMaxTokens' in entry ? { defaultMaxTokens: entry.defaultMaxTokens } : {}),
    ...('defaultTemperature' in entry
      ? { defaultTemperature: entry.defaultTemperature }
      : {}),
  };
}

const llmStageCatalogEntries = LLM_STAGE_CATALOG.map(toLlmStageCatalogEntry);

export const LLM_STAGE_CATALOG_BY_KEY: Readonly<Record<LlmStage, LlmStageCatalogEntry>> =
  Object.freeze(
    Object.fromEntries(llmStageCatalogEntries.map((entry) => [entry.key, entry])) as Record<
      LlmStage,
      LlmStageCatalogEntry
    >
  );

export function getLlmStageCatalogEntry(stage: LlmStage): LlmStageCatalogEntry {
  return LLM_STAGE_CATALOG_BY_KEY[stage];
}
