export type { AnalystResult, AnalystContext } from './analyst-types.js';
export type {
  OpeningContext,
  ContinuationContext,
  OpeningPagePlanContext,
  ContinuationPagePlanContext,
  PagePlanContext,
  LorekeeperContext,
} from './context-types.js';
export type {
  AncestorSummary,
  ContinuationGenerationResult,
  GenerationOptions,
  GenerationPipelineMetrics,
  PromptOptions,
  ReconciliationFailureReason,
} from './generation-pipeline-types.js';
export { LLMError } from './llm-client-types.js';
export type { ChatMessage, JsonSchema } from './llm-client-types.js';
export type {
  StoryBible,
  StoryBibleCharacter,
  LorekeeperResult,
  AgendaResolverResult,
} from './lorekeeper-types.js';
export type { PagePlan, PagePlanGenerationResult } from './planner-types.js';
export type {
  CompletedBeat,
  StructureRewriteContext,
  StructureRewriteResult,
} from './structure-rewrite-types.js';
export type { PageWriterResult, FinalPageGenerationResult } from './writer-types.js';

export { CONTENT_POLICY } from './content-policy.js';

export { buildOpeningPrompt, buildContinuationPrompt } from './prompts/index.js';

export { buildFewShotMessages } from './examples.js';

export { generateStoryStructure } from './structure-generator.js';
export type { StructureGenerationResult } from './structure-generator.js';

export {
  WRITER_GENERATION_SCHEMA,
  ANALYST_SCHEMA,
  LOREKEEPER_SCHEMA,
  validateWriterResponse,
  validateAnalystResponse,
  validateLorekeeperResponse,
  isStructuredOutputNotSupported,
} from './schemas/index.js';

export {
  generateOpeningPage,
  generatePageWriterOutput,
  generateWriterPage,
  generateAnalystEvaluation,
  generateLorekeeperBible,
  generatePagePlan,
  validateApiKey,
} from './client.js';

export { mergePageWriterAndReconciledStateWithAnalystResults } from './result-merger.js';

export { generateAgendaResolver } from './agenda-resolver-generation.js';

export { decomposeEntities } from './entity-decomposer.js';
export type {
  EntityDecomposerContext,
  EntityDecompositionResult,
} from './entity-decomposer-types.js';
