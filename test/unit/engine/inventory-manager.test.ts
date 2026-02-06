import {
  normalizeItemName,
  addInventoryItem,
  removeInventoryItem,
  applyInventoryChanges,
  formatInventoryForPrompt,
  createInventoryChanges,
  hasInventoryItem,
  countInventoryItem,
  getParentAccumulatedInventory,
} from '../../../src/engine/inventory-manager';
import type { Inventory, InventoryChanges } from '../../../src/models';

describe('inventory-manager', () => {
  describe('normalizeItemName', () => {
    it('should trim whitespace', () => {
      expect(normalizeItemName('  Sword  ')).toBe('sword');
    });

    it('should convert to lowercase', () => {
      expect(normalizeItemName('Iron Key')).toBe('iron key');
    });

    it('should handle empty strings', () => {
      expect(normalizeItemName('')).toBe('');
    });
  });

  describe('addInventoryItem', () => {
    it('should add item to empty inventory', () => {
      const inventory: Inventory = [];
      const result = addInventoryItem(inventory, 'Sword');
      expect(result).toEqual(['Sword']);
    });

    it('should add item to existing inventory', () => {
      const inventory: Inventory = ['Shield'];
      const result = addInventoryItem(inventory, 'Sword');
      expect(result).toEqual(['Shield', 'Sword']);
    });

    it('should trim item name when adding', () => {
      const inventory: Inventory = [];
      const result = addInventoryItem(inventory, '  Sword  ');
      expect(result).toEqual(['Sword']);
    });

    it('should not add empty items', () => {
      const inventory: Inventory = ['Shield'];
      const result = addInventoryItem(inventory, '');
      expect(result).toEqual(['Shield']);
    });

    it('should not add whitespace-only items', () => {
      const inventory: Inventory = ['Shield'];
      const result = addInventoryItem(inventory, '   ');
      expect(result).toEqual(['Shield']);
    });

    it('should not mutate original inventory', () => {
      const inventory: Inventory = ['Shield'];
      const result = addInventoryItem(inventory, 'Sword');
      expect(inventory).toEqual(['Shield']);
      expect(result).not.toBe(inventory);
    });
  });

  describe('removeInventoryItem', () => {
    it('should remove item from inventory (case-insensitive)', () => {
      const inventory: Inventory = ['Sword', 'Shield'];
      const result = removeInventoryItem(inventory, 'sword');
      expect(result).toEqual(['Shield']);
    });

    it('should remove first occurrence only (for duplicates)', () => {
      const inventory: Inventory = ['Health Potion', 'Shield', 'Health Potion'];
      const result = removeInventoryItem(inventory, 'Health Potion');
      expect(result).toEqual(['Shield', 'Health Potion']);
    });

    it('should return same inventory if item not found', () => {
      const inventory: Inventory = ['Sword', 'Shield'];
      const result = removeInventoryItem(inventory, 'Axe');
      expect(result).toEqual(['Sword', 'Shield']);
    });

    it('should handle trimmed comparison', () => {
      const inventory: Inventory = ['Iron Key'];
      const result = removeInventoryItem(inventory, '  iron key  ');
      expect(result).toEqual([]);
    });

    it('should not mutate original inventory', () => {
      const inventory: Inventory = ['Sword', 'Shield'];
      const result = removeInventoryItem(inventory, 'Sword');
      expect(inventory).toEqual(['Sword', 'Shield']);
      expect(result).not.toBe(inventory);
    });
  });

  describe('applyInventoryChanges', () => {
    it('should add items to inventory', () => {
      const inventory: Inventory = ['Shield'];
      const changes: InventoryChanges = { added: ['Sword', 'Helmet'], removed: [] };
      const result = applyInventoryChanges(inventory, changes);
      expect(result).toEqual(['Shield', 'Sword', 'Helmet']);
    });

    it('should remove items from inventory', () => {
      const inventory: Inventory = ['Sword', 'Shield', 'Helmet'];
      const changes: InventoryChanges = { added: [], removed: ['Shield'] };
      const result = applyInventoryChanges(inventory, changes);
      expect(result).toEqual(['Sword', 'Helmet']);
    });

    it('should process removals before additions', () => {
      const inventory: Inventory = ['Old Sword'];
      const changes: InventoryChanges = { added: ['New Sword'], removed: ['Old Sword'] };
      const result = applyInventoryChanges(inventory, changes);
      expect(result).toEqual(['New Sword']);
    });

    it('should handle empty changes', () => {
      const inventory: Inventory = ['Sword'];
      const changes: InventoryChanges = { added: [], removed: [] };
      const result = applyInventoryChanges(inventory, changes);
      expect(result).toEqual(['Sword']);
    });

    it('should not mutate original inventory', () => {
      const inventory: Inventory = ['Sword'];
      const changes: InventoryChanges = { added: ['Shield'], removed: [] };
      const result = applyInventoryChanges(inventory, changes);
      expect(inventory).toEqual(['Sword']);
      expect(result).not.toBe(inventory);
    });
  });

  describe('formatInventoryForPrompt', () => {
    it('should format items as bulleted list with header', () => {
      const inventory: Inventory = ['Sword', 'Shield', 'Health Potion'];
      const result = formatInventoryForPrompt(inventory);
      expect(result).toBe('YOUR INVENTORY:\n- Sword\n- Shield\n- Health Potion\n');
    });

    it('should return empty string for empty inventory', () => {
      const inventory: Inventory = [];
      const result = formatInventoryForPrompt(inventory);
      expect(result).toBe('');
    });

    it('should handle single item with header', () => {
      const inventory: Inventory = ['Key'];
      const result = formatInventoryForPrompt(inventory);
      expect(result).toBe('YOUR INVENTORY:\n- Key\n');
    });
  });

  describe('createInventoryChanges', () => {
    it('should create inventory changes from arrays', () => {
      const result = createInventoryChanges(['Sword', 'Shield'], ['Key']);
      expect(result).toEqual({
        added: ['Sword', 'Shield'],
        removed: ['Key'],
      });
    });

    it('should trim items', () => {
      const result = createInventoryChanges(['  Sword  '], ['  Key  ']);
      expect(result).toEqual({
        added: ['Sword'],
        removed: ['Key'],
      });
    });

    it('should filter empty items', () => {
      const result = createInventoryChanges(['Sword', '', '  '], ['Key', '']);
      expect(result).toEqual({
        added: ['Sword'],
        removed: ['Key'],
      });
    });

    it('should handle empty arrays', () => {
      const result = createInventoryChanges([], []);
      expect(result).toEqual({
        added: [],
        removed: [],
      });
    });
  });

  describe('hasInventoryItem', () => {
    it('should return true if item exists (case-insensitive)', () => {
      const inventory: Inventory = ['Iron Key', 'Shield'];
      expect(hasInventoryItem(inventory, 'iron key')).toBe(true);
      expect(hasInventoryItem(inventory, 'IRON KEY')).toBe(true);
    });

    it('should return false if item does not exist', () => {
      const inventory: Inventory = ['Sword'];
      expect(hasInventoryItem(inventory, 'Axe')).toBe(false);
    });

    it('should handle empty inventory', () => {
      const inventory: Inventory = [];
      expect(hasInventoryItem(inventory, 'Sword')).toBe(false);
    });

    it('should handle trimmed comparison', () => {
      const inventory: Inventory = ['Iron Key'];
      expect(hasInventoryItem(inventory, '  iron key  ')).toBe(true);
    });
  });

  describe('countInventoryItem', () => {
    it('should count occurrences of item (case-insensitive)', () => {
      const inventory: Inventory = ['Health Potion', 'Shield', 'Health Potion', 'health potion'];
      expect(countInventoryItem(inventory, 'Health Potion')).toBe(3);
    });

    it('should return 0 if item not found', () => {
      const inventory: Inventory = ['Sword'];
      expect(countInventoryItem(inventory, 'Axe')).toBe(0);
    });

    it('should handle empty inventory', () => {
      const inventory: Inventory = [];
      expect(countInventoryItem(inventory, 'Sword')).toBe(0);
    });
  });

  describe('getParentAccumulatedInventory', () => {
    it('should return parent accumulated inventory', () => {
      const parentPage = { accumulatedInventory: ['Sword', 'Shield'] as Inventory };
      const result = getParentAccumulatedInventory(parentPage);
      expect(result).toEqual(['Sword', 'Shield']);
    });

    it('should handle empty inventory', () => {
      const parentPage = { accumulatedInventory: [] as Inventory };
      const result = getParentAccumulatedInventory(parentPage);
      expect(result).toEqual([]);
    });
  });
});
