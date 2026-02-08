/**
 * Integration tests for refactored state modules.
 * Verifies:
 * 1. Normalization consistency across modules
 * 2. Cross-module state accumulation
 * 3. Barrel export verification
 * 4. Page chain with mixed state types
 */

import { normalizeCharacterName } from '@/models/normalize';
import { normalizeCharacterNameForState } from '@/engine/character-state-manager';
import {
  // Canon
  CanonFact,
  GlobalCanon,
  addCanonFact,
  mergeCanonFacts,
  // Character canon
  CharacterCanonFact,
  CharacterCanon,
  GlobalCharacterCanon,
  // Inventory
  InventoryItem,
  Inventory,
  InventoryChanges,
  createEmptyInventoryChanges,
  applyInventoryChanges,
  // Health
  HealthEntry,
  Health,
  HealthChanges,
  createEmptyHealthChanges,
  applyHealthChanges,
  // Character state
  CharacterStateEntry,
  CharacterState,
  SingleCharacterStateChanges,
  CharacterStateChanges,
  AccumulatedCharacterState,
  createEmptyCharacterStateChanges,
  createEmptyAccumulatedCharacterState,
  applyCharacterStateChanges,
  // Page creation
  createPage,
  createChoice,
} from '@/models';

describe('state-modules integration', () => {
  describe('normalization consistency', () => {
    it('normalizeCharacterName and normalizeCharacterNameForState behave identically', () => {
      const testCases = [
        'John Doe',
        'Dr. Smith',
        "O'Brien",
        'Mary Jane Watson',
        '  Spaced  Name  ',
        'UPPERCASE',
        'lowercase',
        'MixedCase',
        'Name, Jr.',
        'Name: The Great',
        'Name! Hero?',
      ];

      for (const testCase of testCases) {
        expect(normalizeCharacterName(testCase)).toBe(
          normalizeCharacterNameForState(testCase)
        );
      }
    });

    it('normalizeCharacterName handles empty and whitespace-only strings', () => {
      expect(normalizeCharacterName('')).toBe('');
      expect(normalizeCharacterName('   ')).toBe('');
      expect(normalizeCharacterNameForState('')).toBe('');
      expect(normalizeCharacterNameForState('   ')).toBe('');
    });
  });

  describe('cross-module state accumulation', () => {
    it('applies all state types correctly in isolation', () => {
      // Inventory
      const inv1 = applyInventoryChanges([], {
        added: ['Sword', 'Shield'],
        removed: [],
      });
      expect(inv1).toEqual(['Sword', 'Shield']);

      // Health
      const health1 = applyHealthChanges([], {
        added: ['Healthy', 'Well-rested'],
        removed: [],
      });
      expect(health1).toEqual(['Healthy', 'Well-rested']);

      // Character state
      const charState1 = applyCharacterStateChanges({}, [
        { characterName: 'Greaves', added: ['Gave protagonist a map'], removed: [] },
      ]);
      expect(charState1).toEqual({ Greaves: ['Gave protagonist a map'] });
    });

    it('processes removals correctly across all state types', () => {
      // Inventory with removal
      const inv = applyInventoryChanges(['Sword', 'Shield'], {
        added: ['Bow'],
        removed: ['Sword'],
      });
      expect(inv).toEqual(['Shield', 'Bow']);

      // Health with removal
      const health = applyHealthChanges(['Healthy', 'Poisoned'], {
        added: ['Cured'],
        removed: ['Poisoned'],
      });
      expect(health).toEqual(['Healthy', 'Cured']);

      // Character state with removal
      const charState = applyCharacterStateChanges(
        { greaves: ['Gave map', 'Friendly'] },
        [{ characterName: 'Greaves', added: ['Suspicious'], removed: ['Friendly'] }]
      );
      expect(charState).toEqual({ greaves: ['Gave map', 'Suspicious'] });
    });
  });

  describe('barrel export verification', () => {
    it('exports all expected types and functions from @/models', () => {
      // Types (verified by using them)
      const canonFact: CanonFact = 'test';
      const globalCanon: GlobalCanon = [];
      const charCanonFact: CharacterCanonFact = 'test';
      const charCanon: CharacterCanon = [];
      const globalCharCanon: GlobalCharacterCanon = {};
      const invItem: InventoryItem = 'test';
      const inv: Inventory = [];
      const invChanges: InventoryChanges = { added: [], removed: [] };
      const healthEntry: HealthEntry = 'test';
      const health: Health = [];
      const healthChanges: HealthChanges = { added: [], removed: [] };
      const charStateEntry: CharacterStateEntry = 'test';
      const charState: CharacterState = [];
      const singleCharChanges: SingleCharacterStateChanges = {
        characterName: 'test',
        added: [],
        removed: [],
      };
      const charStateChanges: CharacterStateChanges = [];
      const accCharState: AccumulatedCharacterState = {};

      // Functions (verified by calling them)
      expect(typeof addCanonFact).toBe('function');
      expect(typeof mergeCanonFacts).toBe('function');
      expect(typeof createEmptyInventoryChanges).toBe('function');
      expect(typeof applyInventoryChanges).toBe('function');
      expect(typeof createEmptyHealthChanges).toBe('function');
      expect(typeof applyHealthChanges).toBe('function');
      expect(typeof createEmptyCharacterStateChanges).toBe('function');
      expect(typeof createEmptyAccumulatedCharacterState).toBe('function');
      expect(typeof applyCharacterStateChanges).toBe('function');

      // Suppress unused variable warnings
      expect(canonFact).toBeDefined();
      expect(globalCanon).toBeDefined();
      expect(charCanonFact).toBeDefined();
      expect(charCanon).toBeDefined();
      expect(globalCharCanon).toBeDefined();
      expect(invItem).toBeDefined();
      expect(inv).toBeDefined();
      expect(invChanges).toBeDefined();
      expect(healthEntry).toBeDefined();
      expect(health).toBeDefined();
      expect(healthChanges).toBeDefined();
      expect(charStateEntry).toBeDefined();
      expect(charState).toBeDefined();
      expect(singleCharChanges).toBeDefined();
      expect(charStateChanges).toBeDefined();
      expect(accCharState).toBeDefined();
    });
  });

  describe('page chain with mixed state types', () => {
    it('accumulates all state types correctly through page chain', () => {
      // Page 1: Initial state
      const page1 = createPage({
        id: 1,
        narrativeText: 'The adventure begins.',
        choices: [
          createChoice('Go north'),
          createChoice('Go south'),
        ],
        inventoryChanges: { added: ['Backpack', 'Torch'], removed: [] },
        healthChanges: { added: ['Healthy'], removed: [] },
        characterStateChanges: [
          { characterName: 'Mentor', added: ['Gave advice'], removed: [] },
        ],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      expect(page1.accumulatedInventory).toEqual(['Backpack', 'Torch']);
      expect(page1.accumulatedHealth).toEqual(['Healthy']);
      expect(page1.accumulatedCharacterState).toEqual({ Mentor: ['Gave advice'] });

      // Page 2: Builds on page 1
      const page2 = createPage({
        id: 2,
        narrativeText: 'You travel north into the forest.',
        choices: [
          createChoice('Explore cave'),
          createChoice('Continue north'),
        ],
        inventoryChanges: { added: ['Map'], removed: ['Torch'] },
        healthChanges: { added: ['Tired'], removed: [] },
        characterStateChanges: [
          { characterName: 'Mentor', added: ['Worried'], removed: [] },
          { characterName: 'Greaves', added: ['First encounter'], removed: [] },
        ],
        isEnding: false,
        parentPageId: 1,
        parentChoiceIndex: 0,
        parentAccumulatedInventory: page1.accumulatedInventory,
        parentAccumulatedHealth: page1.accumulatedHealth,
        parentAccumulatedCharacterState: page1.accumulatedCharacterState,
      });

      expect(page2.accumulatedInventory).toEqual(['Backpack', 'Map']);
      expect(page2.accumulatedHealth).toEqual(['Healthy', 'Tired']);
      expect(page2.accumulatedCharacterState).toEqual({
        Mentor: ['Gave advice', 'Worried'],
        Greaves: ['First encounter'],
      });

      // Page 3: Final state with more complex changes
      const page3 = createPage({
        id: 3,
        narrativeText: 'You discover a hidden cave.',
        choices: [
          createChoice('Enter cave'),
          createChoice('Return home'),
        ],
        inventoryChanges: { added: ['Gold coins', 'Ruby'], removed: ['Backpack'] },
        healthChanges: { added: ['Injured'], removed: ['Healthy'] },
        characterStateChanges: [
          { characterName: 'Greaves', added: ['Helped find cave'], removed: ['First encounter'] },
        ],
        isEnding: false,
        parentPageId: 2,
        parentChoiceIndex: 0,
        parentAccumulatedInventory: page2.accumulatedInventory,
        parentAccumulatedHealth: page2.accumulatedHealth,
        parentAccumulatedCharacterState: page2.accumulatedCharacterState,
      });

      expect(page3.accumulatedInventory).toEqual(['Map', 'Gold coins', 'Ruby']);
      expect(page3.accumulatedHealth).toEqual(['Tired', 'Injured']);
      expect(page3.accumulatedCharacterState).toEqual({
        Mentor: ['Gave advice', 'Worried'],
        Greaves: ['Helped find cave'],
      });
    });

    it('handles ending page with all state types', () => {
      const endingPage = createPage({
        id: 1,
        narrativeText: 'Your journey ends here.',
        choices: [],
        inventoryChanges: { added: ['Final reward'], removed: [] },
        healthChanges: { added: ['Victorious'], removed: [] },
        characterStateChanges: [
          { characterName: 'Hero', added: ['Completed quest'], removed: [] },
        ],
        isEnding: true,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      expect(endingPage.isEnding).toBe(true);
      expect(endingPage.choices).toHaveLength(0);
      expect(endingPage.accumulatedInventory).toEqual(['Final reward']);
      expect(endingPage.accumulatedHealth).toEqual(['Victorious']);
      expect(endingPage.accumulatedCharacterState).toEqual({ Hero: ['Completed quest'] });
    });
  });

  describe('canon functions', () => {
    it('addCanonFact deduplicates case-insensitively', () => {
      let canon: GlobalCanon = [];
      canon = addCanonFact(canon, 'The sword is magical');
      canon = addCanonFact(canon, 'THE SWORD IS MAGICAL'); // Duplicate
      canon = addCanonFact(canon, 'the sword is magical'); // Duplicate
      canon = addCanonFact(canon, 'The hero is brave');

      expect(canon).toHaveLength(2);
      expect(canon).toEqual(['The sword is magical', 'The hero is brave']);
    });

    it('mergeCanonFacts handles multiple facts', () => {
      const canon: GlobalCanon = ['Existing fact'];
      const newFacts = ['New fact 1', 'New fact 2', 'Existing fact']; // Last is duplicate

      const merged = mergeCanonFacts(canon, newFacts);

      expect(merged).toHaveLength(3);
      expect(merged).toEqual(['Existing fact', 'New fact 1', 'New fact 2']);
    });
  });
});
