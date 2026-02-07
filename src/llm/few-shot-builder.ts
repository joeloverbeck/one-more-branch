/**
 * Few-shot message builder for story generation prompts.
 *
 * This module contains the logic for selecting and composing few-shot examples.
 * Data is imported from few-shot-data.ts to maintain single responsibility.
 */

import type { ChatMessage } from './types.js';
import {
  OPENING_EXAMPLE_USER,
  OPENING_EXAMPLE_RESPONSE,
  CONTINUATION_EXAMPLE_USER,
  CONTINUATION_EXAMPLE_RESPONSE,
  ENDING_EXAMPLE_USER,
  ENDING_EXAMPLE_RESPONSE,
} from './few-shot-data.js';

/**
 * Builds few-shot example messages for the specified context type and mode.
 *
 * @param type - 'opening' for story beginnings, 'continuation' for ongoing stories
 * @param mode - 'minimal' returns 1 example, 'standard' returns 2-3 examples
 * @returns Array of ChatMessage pairs (user + assistant) to inject before the actual prompt
 */
export function buildFewShotMessages(
  type: 'opening' | 'continuation',
  mode: 'minimal' | 'standard',
): ChatMessage[] {
  const messages: ChatMessage[] = [];

  if (type === 'opening') {
    // Opening always includes the opening example
    messages.push(
      { role: 'user', content: OPENING_EXAMPLE_USER },
      { role: 'assistant', content: OPENING_EXAMPLE_RESPONSE },
    );
  } else {
    // Continuation includes continuation example
    messages.push(
      { role: 'user', content: CONTINUATION_EXAMPLE_USER },
      { role: 'assistant', content: CONTINUATION_EXAMPLE_RESPONSE },
    );

    // Standard mode also includes ending example to show proper endings
    if (mode === 'standard') {
      messages.push(
        { role: 'user', content: ENDING_EXAMPLE_USER },
        { role: 'assistant', content: ENDING_EXAMPLE_RESPONSE },
      );
    }
  }

  return messages;
}
