/**
 * Inventory types and functions for item management.
 */

import { KeyedEntry, assignIds, removeByIds } from './keyed-entry.js';

export type Inventory = readonly KeyedEntry[];

export interface InventoryChanges {
  readonly added: readonly string[];
  readonly removed: readonly string[];
}

/**
 * Creates an empty InventoryChanges object.
 */
export function createEmptyInventoryChanges(): InventoryChanges {
  return {
    added: [],
    removed: [],
  };
}

/**
 * Applies inventory changes (additions and removals) to current inventory.
 * Removals are ID-based and processed before additions.
 */
export function applyInventoryChanges(
  current: Inventory,
  changes: InventoryChanges,
): Inventory {
  const afterRemoval = removeByIds(current, changes.removed);
  const additions = assignIds(current, changes.added, 'inv');
  return [...afterRemoval, ...additions];
}
