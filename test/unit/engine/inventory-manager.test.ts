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

const inv = (id: number, text: string): { id: string; text: string } => ({ id: `inv-${id}`, text });

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
      expect(result).toEqual([inv(1, 'Sword')]);
    });

    it('should add item to existing inventory', () => {
      const inventory: Inventory = [inv(4, 'Shield')];
      const result = addInventoryItem(inventory, 'Sword');
      expect(result).toEqual([inv(4, 'Shield'), inv(5, 'Sword')]);
    });

    it('should trim item name when adding', () => {
      const inventory: Inventory = [];
      const result = addInventoryItem(inventory, '  Sword  ');
      expect(result).toEqual([inv(1, 'Sword')]);
    });

    it('should not add empty items', () => {
      const inventory: Inventory = [inv(1, 'Shield')];
      const result = addInventoryItem(inventory, '');
      expect(result).toEqual([inv(1, 'Shield')]);
    });

    it('should not add whitespace-only items', () => {
      const inventory: Inventory = [inv(1, 'Shield')];
      const result = addInventoryItem(inventory, '   ');
      expect(result).toEqual([inv(1, 'Shield')]);
    });
  });

  describe('removeInventoryItem', () => {
    it('should remove item from inventory by ID', () => {
      const inventory: Inventory = [inv(1, 'Sword'), inv(2, 'Shield')];
      const result = removeInventoryItem(inventory, 'inv-1');
      expect(result).toEqual([inv(2, 'Shield')]);
    });

    it('should remove only the matching ID when text is duplicated', () => {
      const inventory: Inventory = [
        inv(1, 'Health Potion'),
        inv(2, 'Shield'),
        inv(3, 'Health Potion'),
      ];
      const result = removeInventoryItem(inventory, 'inv-3');
      expect(result).toEqual([inv(1, 'Health Potion'), inv(2, 'Shield')]);
    });

    it('should leave inventory unchanged when ID is not found', () => {
      const inventory: Inventory = [inv(1, 'Health Potion')];
      const result = removeInventoryItem(inventory, 'inv-999');
      expect(result).toEqual([inv(1, 'Health Potion')]);
    });
  });

  describe('applyInventoryChanges', () => {
    it('should add items to inventory', () => {
      const inventory: Inventory = [inv(1, 'Shield')];
      const changes: InventoryChanges = { added: ['Sword', 'Helmet'], removed: [] };
      const result = applyInventoryChanges(inventory, changes);
      expect(result).toEqual([inv(1, 'Shield'), inv(2, 'Sword'), inv(3, 'Helmet')]);
    });

    it('should remove items from inventory by ID', () => {
      const inventory: Inventory = [inv(1, 'Sword'), inv(2, 'Shield'), inv(3, 'Helmet')];
      const changes: InventoryChanges = { added: [], removed: ['inv-2'] };
      const result = applyInventoryChanges(inventory, changes);
      expect(result).toEqual([inv(1, 'Sword'), inv(3, 'Helmet')]);
    });
  });

  describe('formatInventoryForPrompt', () => {
    it('should format items as bulleted list with header', () => {
      const inventory: Inventory = [inv(1, 'Sword'), inv(2, 'Shield')];
      const result = formatInventoryForPrompt(inventory);
      expect(result).toBe('YOUR INVENTORY:\n- [inv-1] Sword\n- [inv-2] Shield\n');
    });
  });

  describe('createInventoryChanges', () => {
    it('should create inventory changes from arrays', () => {
      const result = createInventoryChanges(['Sword', 'Shield'], ['inv-1']);
      expect(result).toEqual({
        added: ['Sword', 'Shield'],
        removed: ['inv-1'],
      });
    });
  });

  describe('query helpers', () => {
    const inventory: Inventory = [inv(1, 'Iron Key'), inv(2, 'Shield'), inv(3, 'Iron Key')];

    it('hasInventoryItem should be case-insensitive', () => {
      expect(hasInventoryItem(inventory, 'iron key')).toBe(true);
      expect(hasInventoryItem(inventory, 'IRON KEY')).toBe(true);
      expect(hasInventoryItem(inventory, 'Axe')).toBe(false);
    });

    it('countInventoryItem counts case-insensitive matches', () => {
      expect(countInventoryItem(inventory, 'Iron Key')).toBe(2);
      expect(countInventoryItem(inventory, 'Axe')).toBe(0);
    });

    it('getParentAccumulatedInventory returns inventory', () => {
      const parentPage = { accumulatedInventory: inventory };
      expect(getParentAccumulatedInventory(parentPage)).toEqual(inventory);
    });
  });
});
