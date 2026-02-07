/**
 * Shared normalization utilities for consistent string comparison across state modules.
 */

/**
 * Normalizes a string for case-insensitive comparison.
 * Trims whitespace and converts to lowercase.
 */
export function normalizeForComparison(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Cleans a character name for consistent display.
 * Preserves original casing but removes punctuation and normalizes whitespace.
 * - Removes extra punctuation (periods, commas, etc.)
 * - Collapses multiple spaces to single space
 * - Trims whitespace
 *
 * For case-insensitive comparison, use normalizeForComparison() on the result.
 */
export function normalizeCharacterName(name: string): string {
  return name
    .replace(/[.,;:!?'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
