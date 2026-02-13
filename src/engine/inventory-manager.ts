import {
  Inventory,
  InventoryChanges,
  applyInventoryChanges as applyChanges,
  createEmptyInventoryChanges,
} from '../models';

function getMaxInventoryId(inventory: Inventory): number {
  let maxId = 0;
  for (const entry of inventory) {
    if (entry.id.startsWith('inv-')) {
      const num = Number.parseInt(entry.id.slice(4), 10);
      if (Number.isFinite(num) && num > maxId) {
        maxId = num;
      }
    }
  }
  return maxId;
}

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
export function addInventoryItem(inventory: Inventory, item: string): Inventory {
  const trimmed = item.trim();
  if (!trimmed) {
    return inventory;
  }

  const nextId = getMaxInventoryId(inventory) + 1;
  return [...inventory, { id: `inv-${nextId}`, text: trimmed }];
}

/**
 * Removes an item from the inventory immutably.
 * Matches by entry ID and returns unchanged inventory if ID is not found.
 */
export function removeInventoryItem(inventory: Inventory, itemId: string): Inventory {
  const result = [...inventory];
  const index = result.findIndex((i) => i.id === itemId);
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

  const formattedItems = inventory.map((item) => `- [${item.id}] ${item.text}`).join('\n');
  return `YOUR INVENTORY:\n${formattedItems}\n`;
}

/**
 * Creates inventory changes from arrays of added/removed items.
 */
export function createInventoryChanges(
  added: readonly string[],
  removed: readonly string[]
): InventoryChanges {
  return {
    added: added.map((item) => item.trim()).filter((item) => item),
    removed: removed.map((item) => item.trim()).filter((item) => item),
  };
}

/**
 * Checks if inventory contains an item (case-insensitive).
 */
export function hasInventoryItem(inventory: Inventory, item: string): boolean {
  const normalizedItem = normalizeItemName(item);
  return inventory.some((i) => normalizeItemName(i.text) === normalizedItem);
}

/**
 * Counts occurrences of an item in inventory (case-insensitive).
 */
export function countInventoryItem(inventory: Inventory, item: string): number {
  const normalizedItem = normalizeItemName(item);
  return inventory.filter((i) => normalizeItemName(i.text) === normalizedItem).length;
}

/**
 * Gets parent accumulated inventory from a page.
 */
export function getParentAccumulatedInventory(parentPage: {
  accumulatedInventory: Inventory;
}): Inventory {
  return parentPage.accumulatedInventory;
}

// Re-export for convenience
export { createEmptyInventoryChanges };
