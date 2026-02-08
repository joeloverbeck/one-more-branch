/**
 * Few-shot examples for story generation prompts.
 * Re-exports from modular modules for convenience.
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
