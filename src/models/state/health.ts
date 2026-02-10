/**
 * Health types and functions for health status management.
 */

import { KeyedEntry, assignIds, removeByIds } from './keyed-entry.js';

export type Health = readonly KeyedEntry[];

export interface HealthChanges {
  readonly added: readonly string[];
  readonly removed: readonly string[];
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
 * Removals are ID-based and processed before additions.
 */
export function applyHealthChanges(current: Health, changes: HealthChanges): Health {
  const afterRemoval = removeByIds(current, changes.removed);
  const additions = assignIds(current, changes.added, 'hp');
  return [...afterRemoval, ...additions];
}
