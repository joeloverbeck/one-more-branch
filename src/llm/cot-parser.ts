/**
 * Chain-of-Thought response parser
 *
 * Extracts structured output from responses that use the CoT format:
 * <thinking>reasoning...</thinking>
 * <output>{JSON}</output>
 */

const OUTPUT_TAG_REGEX = /<output>([\s\S]*?)<\/output>/i;
const THINKING_TAG_REGEX = /<thinking>([\s\S]*?)<\/thinking>/gi;

/**
 * Extracts the content from <output> tags in a CoT-formatted response.
 *
 * Parsing strategy:
 * 1. Try <output>...</output> extraction first
 * 2. Fallback: Remove <thinking>...</thinking> and return rest
 * 3. Last resort: Return original (validation handles errors)
 *
 * @param response - The raw LLM response potentially containing CoT tags
 * @returns The extracted output content, or the original response if no tags found
 */
export function extractOutputFromCoT(response: string): string {
  // Strategy 1: Try to extract from <output> tags
  const outputMatch = response.match(OUTPUT_TAG_REGEX);
  if (outputMatch?.[1]) {
    return outputMatch[1].trim();
  }

  // Strategy 2: Remove <thinking> tags and return the rest
  const withoutThinking = response.replace(THINKING_TAG_REGEX, '').trim();

  // If content was removed, return the cleaned version
  if (withoutThinking.length < response.length) {
    return withoutThinking;
  }

  // Strategy 3: Return original (no CoT tags detected)
  return response;
}

/**
 * Extracts the thinking/reasoning section from a CoT-formatted response.
 * Useful for logging and debugging.
 *
 * @param response - The raw LLM response potentially containing thinking tags
 * @returns The thinking content, or null if no thinking tags found
 */
export function extractThinkingSection(response: string): string | null {
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  // Reset regex lastIndex for fresh search
  const regex = new RegExp(THINKING_TAG_REGEX.source, 'gi');

  while ((match = regex.exec(response)) !== null) {
    if (match[1]) {
      matches.push(match[1].trim());
    }
  }

  if (matches.length === 0) {
    return null;
  }

  // Join multiple thinking sections if present
  return matches.join('\n\n');
}

/**
 * Checks if a response contains CoT formatting (thinking or output tags).
 *
 * @param response - The raw LLM response to check
 * @returns True if the response contains CoT tags
 */
export function hasCoTFormatting(response: string): boolean {
  return OUTPUT_TAG_REGEX.test(response) || THINKING_TAG_REGEX.test(response);
}
