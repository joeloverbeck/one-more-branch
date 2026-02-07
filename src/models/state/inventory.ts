/**
 * Inventory types and functions for item management.
 */

import { normalizeForComparison } from '../normalize.js';

export type InventoryItem = string;
export type Inventory = readonly InventoryItem[];

export interface InventoryChanges {
  readonly added: Inventory;
  readonly removed: Inventory;
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
 * Removals are processed first using case-insensitive matching.
 */
export function applyInventoryChanges(
  current: Inventory,
  changes: InventoryChanges
): Inventory {
  const result = [...current];

  // Process removals first (case-insensitive match)
  for (const itemToRemove of changes.removed) {
    const normalizedRemove = normalizeForComparison(itemToRemove);
    const index = result.findIndex(
      item => normalizeForComparison(item) === normalizedRemove
    );
    if (index !== -1) {
      result.splice(index, 1);
    }
  }

  // Then add new items
  for (const itemToAdd of changes.added) {
    const trimmed = itemToAdd.trim();
    if (trimmed) {
      result.push(trimmed);
    }
  }

  return result;
}
