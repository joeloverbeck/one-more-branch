/**
 * Few-shot examples for story generation prompts.
 *
 * This module serves as a backwards-compatible facade, re-exporting
 * from the refactored modules:
 * - few-shot-data.ts: Pure data constants
 * - few-shot-builder.ts: Message building logic
 */

export {
  OPENING_EXAMPLE_USER,
  OPENING_EXAMPLE_RESPONSE,
  CONTINUATION_EXAMPLE_USER,
  CONTINUATION_EXAMPLE_RESPONSE,
  ENDING_EXAMPLE_USER,
  ENDING_EXAMPLE_RESPONSE,
} from './few-shot-data.js';

export { buildFewShotMessages } from './few-shot-builder.js';
