import {
  Inventory,
  InventoryChanges,
  InventoryItem,
  applyInventoryChanges as applyChanges,
  createEmptyInventoryChanges,
} from '../models';

/**
 * Normalizes an item name for comparison purposes.
 * Used for duplicate detection and removal matching.
 */
export function normalizeItemName(item: string): string {
  return item.trim().toLowerCase();
}

/**
 * Adds an item to the inventory immutably.
 * Allows duplicates (e.g., multiple "Health Potion" entries).
 */
export function addInventoryItem(inventory: Inventory, item: InventoryItem): Inventory {
  const trimmed = item.trim();
  if (!trimmed) {
    return inventory;
  }
  return [...inventory, trimmed];
}

/**
 * Removes an item from the inventory immutably.
 * Removes only the first matching item (case-insensitive).
 * Returns unchanged inventory if item not found.
 */
export function removeInventoryItem(inventory: Inventory, item: InventoryItem): Inventory {
  const normalizedItem = normalizeItemName(item);
  const result = [...inventory];
  const index = result.findIndex(i => normalizeItemName(i) === normalizedItem);
  if (index !== -1) {
    result.splice(index, 1);
  }
  return result;
}

/**
 * Applies inventory changes (additions and removals) to current inventory.
 * Re-exports from models for convenience.
 */
export function applyInventoryChanges(current: Inventory, changes: InventoryChanges): Inventory {
  return applyChanges(current, changes);
}

/**
 * Formats inventory for inclusion in LLM prompts.
 * Returns empty string if inventory is empty.
 */
export function formatInventoryForPrompt(inventory: Inventory): string {
  if (inventory.length === 0) {
    return '';
  }

  const formattedItems = inventory.map(item => `- ${item}`).join('\n');
  return `YOUR INVENTORY:\n${formattedItems}\n`;
}

/**
 * Creates inventory changes from arrays of added/removed items.
 */
export function createInventoryChanges(
  added: readonly string[],
  removed: readonly string[],
): InventoryChanges {
  return {
    added: added.map(item => item.trim()).filter(item => item),
    removed: removed.map(item => item.trim()).filter(item => item),
  };
}

/**
 * Checks if inventory contains an item (case-insensitive).
 */
export function hasInventoryItem(inventory: Inventory, item: InventoryItem): boolean {
  const normalizedItem = normalizeItemName(item);
  return inventory.some(i => normalizeItemName(i) === normalizedItem);
}

/**
 * Counts occurrences of an item in inventory (case-insensitive).
 */
export function countInventoryItem(inventory: Inventory, item: InventoryItem): number {
  const normalizedItem = normalizeItemName(item);
  return inventory.filter(i => normalizeItemName(i) === normalizedItem).length;
}

/**
 * Gets parent accumulated inventory from a page.
 */
export function getParentAccumulatedInventory(
  parentPage: { accumulatedInventory: Inventory },
): Inventory {
  return parentPage.accumulatedInventory;
}

// Re-export for convenience
export { createEmptyInventoryChanges };
