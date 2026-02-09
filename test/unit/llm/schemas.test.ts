/**
 * Barrel export verification tests
 *
 * Detailed tests for each module are in:
 * - schemas/writer-validation-schema.test.ts
 * - schemas/error-detection.test.ts
 */

import {
  WRITER_GENERATION_SCHEMA,
  STRUCTURE_GENERATION_SCHEMA,
  isStructuredOutputNotSupported,
  validateWriterResponse,
} from '../../../src/llm/schemas';
import { WriterResultSchema } from '../../../src/llm/schemas/writer-validation-schema';

describe('schemas barrel exports', () => {
  it('should export WRITER_GENERATION_SCHEMA from barrel', () => {
    expect(WRITER_GENERATION_SCHEMA).toBeDefined();
    expect(WRITER_GENERATION_SCHEMA.type).toBe('json_schema');
  });

  it('should export STRUCTURE_GENERATION_SCHEMA from barrel', () => {
    expect(STRUCTURE_GENERATION_SCHEMA).toBeDefined();
    expect(STRUCTURE_GENERATION_SCHEMA.type).toBe('json_schema');
  });

  it('should export WriterResultSchema from writer-validation-schema', () => {
    expect(WriterResultSchema).toBeDefined();
    expect(typeof WriterResultSchema.parse).toBe('function');
  });

  it('should export validateWriterResponse from barrel', () => {
    expect(validateWriterResponse).toBeDefined();
    expect(typeof validateWriterResponse).toBe('function');
  });

  it('should export isStructuredOutputNotSupported from barrel', () => {
    expect(isStructuredOutputNotSupported).toBeDefined();
    expect(typeof isStructuredOutputNotSupported).toBe('function');
  });
});
