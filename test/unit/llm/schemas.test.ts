/**
 * Barrel export verification tests
 *
 * Detailed tests for each module are in:
 * - schemas/openrouter-schema.test.ts
 * - schemas/validation-schema.test.ts
 * - schemas/response-transformer.test.ts
 * - schemas/error-detection.test.ts
 */

import {
  GenerationResultSchema,
  STORY_GENERATION_SCHEMA,
  isStructuredOutputNotSupported,
  validateGenerationResponse,
} from '../../../src/llm/schemas';

describe('schemas barrel exports', () => {
  it('should export STORY_GENERATION_SCHEMA from barrel', () => {
    expect(STORY_GENERATION_SCHEMA).toBeDefined();
    expect(STORY_GENERATION_SCHEMA.type).toBe('json_schema');
  });

  it('should export GenerationResultSchema from barrel', () => {
    expect(GenerationResultSchema).toBeDefined();
    expect(typeof GenerationResultSchema.parse).toBe('function');
  });

  it('should export validateGenerationResponse from barrel', () => {
    expect(validateGenerationResponse).toBeDefined();
    expect(typeof validateGenerationResponse).toBe('function');
  });

  it('should export isStructuredOutputNotSupported from barrel', () => {
    expect(isStructuredOutputNotSupported).toBeDefined();
    expect(typeof isStructuredOutputNotSupported).toBe('function');
  });
});
