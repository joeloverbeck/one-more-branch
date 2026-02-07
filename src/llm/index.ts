export type {
  GenerationResult,
  GenerationOptions,
  OpeningContext,
  ContinuationContext,
  ChatMessage,
  JsonSchema,
  PromptOptions,
} from './types.js';

export { LLMError } from './types.js';

export { CONTENT_POLICY } from './content-policy.js';

export { buildOpeningPrompt, buildContinuationPrompt } from './prompts.js';

export { buildFewShotMessages } from './examples.js';

export { generateStoryStructure } from './structure-generator.js';
export type { StructureGenerationResult } from './structure-generator.js';

export {
  extractOutputFromCoT,
  extractThinkingSection,
  hasCoTFormatting,
} from './cot-parser.js';

export {
  STORY_GENERATION_SCHEMA,
  GenerationResultSchema,
  validateGenerationResponse,
  isStructuredOutputNotSupported,
} from './schemas.js';

export { generateOpeningPage, generateContinuationPage, validateApiKey } from './client.js';
