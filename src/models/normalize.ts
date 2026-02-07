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
 * Normalizes a character name for consistent keying.
 * - Converts to lowercase
 * - Removes extra punctuation (periods, commas, etc.)
 * - Collapses multiple spaces to single space
 * - Trims whitespace
 */
export function normalizeCharacterName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,;:!?'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
