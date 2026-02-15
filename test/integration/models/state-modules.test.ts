/**
 * Integration tests for state modules under keyed-entry architecture.
 */

import { normalizeCharacterName } from '@/models/normalize';
import { normalizeCharacterNameForState } from '@/engine/character-state-manager';
import {
  CanonFact,
  GlobalCanon,
  CharacterCanonFact,
  CharacterCanon,
  GlobalCharacterCanon,
  Inventory,
  InventoryChanges,
  Health,
  HealthChanges,
  CharacterState,
  CharacterStateAddition,
  CharacterStateChanges,
  AccumulatedCharacterState,
  addCanonFact,
  mergeCanonFacts,
  createEmptyInventoryChanges,
  applyInventoryChanges,
  createEmptyHealthChanges,
  applyHealthChanges,
  createEmptyCharacterStateChanges,
  createEmptyAccumulatedCharacterState,
  applyCharacterStateChanges,
  createPage,
  createChoice,
  parsePageId,
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
        expect(normalizeCharacterName(testCase)).toBe(normalizeCharacterNameForState(testCase));
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
      const inv1 = applyInventoryChanges([], {
        added: ['Sword', 'Shield'],
        removed: [],
      });
      expect(inv1).toEqual([
        { id: 'inv-1', text: 'Sword' },
        { id: 'inv-2', text: 'Shield' },
      ]);

      const health1 = applyHealthChanges([], {
        added: ['Healthy', 'Well-rested'],
        removed: [],
      });
      expect(health1).toEqual([
        { id: 'hp-1', text: 'Healthy' },
        { id: 'hp-2', text: 'Well-rested' },
      ]);

      const charState1 = applyCharacterStateChanges(
        {},
        {
          added: [{ characterName: 'Greaves', states: ['Gave protagonist a map'] }],
          removed: [],
        }
      );
      expect(charState1).toEqual({
        Greaves: [{ id: 'cs-1', text: 'Gave protagonist a map' }],
      });
    });

    it('processes removals correctly across all state types', () => {
      const existingInventory = [
        { id: 'inv-1', text: 'Sword' },
        { id: 'inv-2', text: 'Shield' },
      ] as const;
      const inv = applyInventoryChanges(existingInventory, {
        added: ['Bow'],
        removed: ['inv-1'],
      });
      expect(inv).toEqual([
        { id: 'inv-2', text: 'Shield' },
        { id: 'inv-3', text: 'Bow' },
      ]);

      const existingHealth = [
        { id: 'hp-1', text: 'Healthy' },
        { id: 'hp-2', text: 'Poisoned' },
      ] as const;
      const health = applyHealthChanges(existingHealth, {
        added: ['Cured'],
        removed: ['hp-2'],
      });
      expect(health).toEqual([
        { id: 'hp-1', text: 'Healthy' },
        { id: 'hp-3', text: 'Cured' },
      ]);

      const charState = applyCharacterStateChanges(
        {
          greaves: [
            { id: 'cs-1', text: 'Gave map' },
            { id: 'cs-2', text: 'Friendly' },
          ],
        },
        {
          added: [{ characterName: 'Greaves', states: ['Suspicious'] }],
          removed: ['cs-2'],
        }
      );
      expect(charState).toEqual({
        greaves: [
          { id: 'cs-1', text: 'Gave map' },
          { id: 'cs-3', text: 'Suspicious' },
        ],
      });
    });
  });

  describe('barrel export verification', () => {
    it('exports all expected types and functions from @/models', () => {
      const canonFact: CanonFact = { text: 'test', factType: 'NORM' };
      const globalCanon: GlobalCanon = [];
      const charCanonFact: CharacterCanonFact = 'test';
      const charCanon: CharacterCanon = [];
      const globalCharCanon: GlobalCharacterCanon = {};
      const inv: Inventory = [];
      const invChanges: InventoryChanges = { added: [], removed: [] };
      const health: Health = [];
      const healthChanges: HealthChanges = { added: [], removed: [] };
      const charState: CharacterState = [];
      const charStateAddition: CharacterStateAddition = { characterName: 'test', states: [] };
      const charStateChanges: CharacterStateChanges = { added: [], removed: [] };
      const accCharState: AccumulatedCharacterState = {};

      expect(typeof addCanonFact).toBe('function');
      expect(typeof mergeCanonFacts).toBe('function');
      expect(typeof createEmptyInventoryChanges).toBe('function');
      expect(typeof applyInventoryChanges).toBe('function');
      expect(typeof createEmptyHealthChanges).toBe('function');
      expect(typeof applyHealthChanges).toBe('function');
      expect(typeof createEmptyCharacterStateChanges).toBe('function');
      expect(typeof createEmptyAccumulatedCharacterState).toBe('function');
      expect(typeof applyCharacterStateChanges).toBe('function');

      expect(canonFact).toBeDefined();
      expect(globalCanon).toBeDefined();
      expect(charCanonFact).toBeDefined();
      expect(charCanon).toBeDefined();
      expect(globalCharCanon).toBeDefined();
      expect(inv).toBeDefined();
      expect(invChanges).toBeDefined();
      expect(health).toBeDefined();
      expect(healthChanges).toBeDefined();
      expect(charState).toBeDefined();
      expect(charStateAddition).toBeDefined();
      expect(charStateChanges).toBeDefined();
      expect(accCharState).toBeDefined();
    });
  });

  describe('page chain with mixed state types', () => {
    it('accumulates all state types correctly through page chain', () => {
      const page1 = createPage({
        id: parsePageId(1),
        narrativeText: 'The adventure begins.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Go north'), createChoice('Go south')],
        inventoryChanges: { added: ['Backpack', 'Torch'], removed: [] },
        healthChanges: { added: ['Healthy'], removed: [] },
        characterStateChanges: {
          added: [{ characterName: 'Mentor', states: ['Gave advice'] }],
          removed: [],
        },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      expect(page1.accumulatedInventory.map((entry) => entry.text)).toEqual(['Backpack', 'Torch']);
      expect(page1.accumulatedHealth.map((entry) => entry.text)).toEqual(['Healthy']);
      expect(page1.accumulatedCharacterState['Mentor']?.map((entry) => entry.text)).toEqual([
        'Gave advice',
      ]);

      const torchId = page1.accumulatedInventory.find((item) => item.text === 'Torch')?.id;
      expect(torchId).toBeDefined();

      const page2 = createPage({
        id: parsePageId(2),
        narrativeText: 'You travel north into the forest.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Explore cave'), createChoice('Continue north')],
        inventoryChanges: { added: ['Map'], removed: [torchId!] },
        healthChanges: { added: ['Tired'], removed: [] },
        characterStateChanges: {
          added: [
            { characterName: 'Mentor', states: ['Worried'] },
            { characterName: 'Greaves', states: ['First encounter'] },
          ],
          removed: [],
        },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedInventory: page1.accumulatedInventory,
        parentAccumulatedHealth: page1.accumulatedHealth,
        parentAccumulatedCharacterState: page1.accumulatedCharacterState,
      });

      expect(page2.accumulatedInventory.map((entry) => entry.text)).toEqual(['Backpack', 'Map']);
      expect(page2.accumulatedHealth.map((entry) => entry.text)).toEqual(['Healthy', 'Tired']);
      expect(page2.accumulatedCharacterState['Mentor']?.map((entry) => entry.text)).toEqual([
        'Gave advice',
        'Worried',
      ]);
      expect(page2.accumulatedCharacterState['Greaves']?.map((entry) => entry.text)).toEqual([
        'First encounter',
      ]);

      const healthyId = page2.accumulatedHealth.find((entry) => entry.text === 'Healthy')?.id;
      const firstEncounterId = page2.accumulatedCharacterState['Greaves']?.find(
        (entry) => entry.text === 'First encounter'
      )?.id;
      expect(healthyId).toBeDefined();
      expect(firstEncounterId).toBeDefined();

      const page3 = createPage({
        id: parsePageId(3),
        narrativeText: 'You discover a hidden cave.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Enter cave'), createChoice('Return home')],
        inventoryChanges: { added: ['Gold coins', 'Ruby'], removed: ['inv-1'] },
        healthChanges: { added: ['Injured'], removed: [healthyId!] },
        characterStateChanges: {
          added: [{ characterName: 'Greaves', states: ['Helped find cave'] }],
          removed: [firstEncounterId!],
        },
        isEnding: false,
        parentPageId: parsePageId(2),
        parentChoiceIndex: 0,
        parentAccumulatedInventory: page2.accumulatedInventory,
        parentAccumulatedHealth: page2.accumulatedHealth,
        parentAccumulatedCharacterState: page2.accumulatedCharacterState,
      });

      expect(page3.accumulatedInventory.map((entry) => entry.text)).toEqual([
        'Map',
        'Gold coins',
        'Ruby',
      ]);
      expect(page3.accumulatedHealth.map((entry) => entry.text)).toEqual(['Tired', 'Injured']);
      expect(page3.accumulatedCharacterState['Mentor']?.map((entry) => entry.text)).toEqual([
        'Gave advice',
        'Worried',
      ]);
      expect(page3.accumulatedCharacterState['Greaves']?.map((entry) => entry.text)).toEqual([
        'Helped find cave',
      ]);
    });

    it('handles ending page with all state types', () => {
      const endingPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Your journey ends here.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [],
        inventoryChanges: { added: ['Final reward'], removed: [] },
        healthChanges: { added: ['Victorious'], removed: [] },
        characterStateChanges: {
          added: [{ characterName: 'Hero', states: ['Completed quest'] }],
          removed: [],
        },
        isEnding: true,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      expect(endingPage.isEnding).toBe(true);
      expect(endingPage.choices).toHaveLength(0);
      expect(endingPage.accumulatedInventory.map((entry) => entry.text)).toEqual(['Final reward']);
      expect(endingPage.accumulatedHealth.map((entry) => entry.text)).toEqual(['Victorious']);
      expect(endingPage.accumulatedCharacterState['Hero']?.map((entry) => entry.text)).toEqual([
        'Completed quest',
      ]);
    });
  });

  describe('canon functions', () => {
    it('addCanonFact deduplicates case-insensitively', () => {
      let canon: GlobalCanon = [];
      canon = addCanonFact(canon, { text: 'The sword is magical', factType: 'NORM' });
      canon = addCanonFact(canon, { text: 'THE SWORD IS MAGICAL', factType: 'NORM' });
      canon = addCanonFact(canon, { text: 'the sword is magical', factType: 'NORM' });
      canon = addCanonFact(canon, { text: 'The hero is brave', factType: 'NORM' });

      expect(canon).toHaveLength(2);
      expect(canon).toEqual([
        { text: 'The sword is magical', factType: 'NORM' },
        { text: 'The hero is brave', factType: 'NORM' },
      ]);
    });

    it('mergeCanonFacts handles multiple facts', () => {
      const canon: GlobalCanon = [{ text: 'Existing fact', factType: 'NORM' }];
      const newFacts: CanonFact[] = [
        { text: 'New fact 1', factType: 'NORM' },
        { text: 'New fact 2', factType: 'NORM' },
        { text: 'Existing fact', factType: 'NORM' },
      ];

      const merged = mergeCanonFacts(canon, newFacts);

      expect(merged).toHaveLength(3);
      expect(merged).toEqual([
        { text: 'Existing fact', factType: 'NORM' },
        { text: 'New fact 1', factType: 'NORM' },
        { text: 'New fact 2', factType: 'NORM' },
      ]);
    });
  });
});
