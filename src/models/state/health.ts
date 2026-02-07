/**
 * Health types and functions for health status management.
 */

import { modelWarn } from '../model-logger.js';
import { normalizeForComparison } from '../normalize.js';

export type HealthEntry = string;
export type Health = readonly HealthEntry[];

export interface HealthChanges {
  readonly added: Health;
  readonly removed: Health;
}

/**
 * Creates an empty HealthChanges object.
 */
export function createEmptyHealthChanges(): HealthChanges {
  return {
    added: [],
    removed: [],
  };
}

/**
 * Applies health changes (additions and removals) to current health.
 * Removals are processed first using case-insensitive matching.
 * Unmatched removals are logged as warnings.
 */
export function applyHealthChanges(current: Health, changes: HealthChanges): Health {
  const result = [...current];

  // Process removals first (case-insensitive match)
  for (const entryToRemove of changes.removed) {
    const normalizedRemove = normalizeForComparison(entryToRemove);
    if (!normalizedRemove) continue; // Skip empty strings silently
    const index = result.findIndex(
      entry => normalizeForComparison(entry) === normalizedRemove
    );
    if (index !== -1) {
      result.splice(index, 1);
    } else {
      modelWarn(`Health removal did not match any existing entry: "${entryToRemove}"`);
    }
  }

  // Then add new entries
  for (const entryToAdd of changes.added) {
    const trimmed = entryToAdd.trim();
    if (trimmed) {
      result.push(trimmed);
    }
  }

  return result;
}
