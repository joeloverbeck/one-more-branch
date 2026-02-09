export type {
  GenerationResult,
  ContinuationGenerationResult,
  CompletedBeat,
  StructureRewriteContext,
  StructureRewriteResult,
  GenerationOptions,
  OpeningContext,
  ContinuationContext,
  ChatMessage,
  JsonSchema,
  PromptOptions,
  WriterResult,
  AnalystResult,
  AnalystContext,
} from './types.js';

export { LLMError } from './types.js';

export { CONTENT_POLICY } from './content-policy.js';

export { buildOpeningPrompt, buildContinuationPrompt } from './prompts/index.js';

export { buildFewShotMessages } from './examples.js';

export { generateStoryStructure } from './structure-generator.js';
export type { StructureGenerationResult } from './structure-generator.js';

export {
  STORY_GENERATION_SCHEMA,
  WRITER_GENERATION_SCHEMA,
  ANALYST_SCHEMA,
  GenerationResultSchema,
  validateGenerationResponse,
  validateWriterResponse,
  validateAnalystResponse,
  isStructuredOutputNotSupported,
} from './schemas/index.js';

export { generateOpeningPage, generateWriterPage, generateAnalystEvaluation, validateApiKey } from './client.js';

export { mergeWriterAndAnalystResults } from './result-merger.js';
