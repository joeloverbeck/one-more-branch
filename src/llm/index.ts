export type {
  GenerationResult,
  GenerationOptions,
  OpeningContext,
  ContinuationContext,
  ChatMessage,
  JsonSchema,
} from './types.js';

export { LLMError } from './types.js';

export { CONTENT_POLICY } from './content-policy.js';

export { buildOpeningPrompt, buildContinuationPrompt } from './prompts.js';

export {
  STORY_GENERATION_SCHEMA,
  GenerationResultSchema,
  validateGenerationResponse,
  isStructuredOutputNotSupported,
} from './schemas.js';

export { parseTextResponse } from './fallback-parser.js';

export { generateOpeningPage, generateContinuationPage, validateApiKey } from './client.js';
