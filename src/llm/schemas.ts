// Re-export all schema functionality from the new module structure
// This file exists for backward compatibility and can be removed once all imports are updated
export {
  STORY_GENERATION_SCHEMA,
  GenerationResultSchema,
  type ValidatedGenerationResult,
  validateGenerationResponse,
  isStructuredOutputNotSupported,
} from './schemas/index.js';
