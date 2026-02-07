import { Page, createChoice, parsePageId, createDefaultProtagonistAffect } from '@/models';
import {
  deserializePage,
  PageFileData,
  parsePageIdFromFileName,
  serializePage,
} from '@/persistence/page-serializer';

/**
 * Builds a test page directly (not using createPage) to have full control
 * over all fields including accumulated values which createPage computes.
 */
function buildTestPage(overrides?: Partial<Page>): Page {
  const basePage: Page = {
    id: parsePageId(1),
    narrativeText: 'Test narrative',
    choices: [createChoice('Choice A'), createChoice('Choice B')],
    stateChanges: { added: ['state-change'], removed: [] },
    accumulatedState: { changes: ['state-change'] },
    inventoryChanges: { added: [], removed: [] },
    accumulatedInventory: [],
    healthChanges: { added: [], removed: [] },
    accumulatedHealth: [],
    characterStateChanges: [],
    accumulatedCharacterState: {},
    accumulatedStructureState: {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [],
    },
    structureVersionId: null,
    protagonistAffect: createDefaultProtagonistAffect(),
    isEnding: false,
    parentPageId: null,
    parentChoiceIndex: null,
  };

  return { ...basePage, ...overrides };
}

describe('page-serializer', () => {
  describe('serializePage', () => {
    it('serializes all page fields correctly', () => {
      const page = buildTestPage({
        inventoryChanges: { added: ['sword'], removed: ['dagger'] },
        accumulatedInventory: ['sword', 'shield'],
        healthChanges: { added: ['poisoned'], removed: ['healthy'] },
        accumulatedHealth: ['poisoned'],
        characterStateChanges: [
          { characterName: 'Alice', added: ['angry'], removed: ['calm'] },
        ],
        accumulatedCharacterState: { Alice: ['angry', 'suspicious'] },
        accumulatedStructureState: {
          currentActIndex: 1,
          currentBeatIndex: 2,
          beatProgressions: [
            { beatId: '1.1', status: 'concluded', resolution: 'Won the battle' },
            { beatId: '1.2', status: 'active' },
          ],
        },
      });

      const fileData = serializePage(page);

      expect(fileData.id).toBe(1);
      expect(fileData.narrativeText).toBe('Test narrative');
      expect(fileData.choices).toEqual([
        { text: 'Choice A', nextPageId: null },
        { text: 'Choice B', nextPageId: null },
      ]);
      expect(fileData.stateChanges).toEqual({ added: ['state-change'], removed: [] });
      expect(fileData.inventoryChanges).toEqual({ added: ['sword'], removed: ['dagger'] });
      expect(fileData.accumulatedInventory).toEqual(['sword', 'shield']);
      expect(fileData.healthChanges).toEqual({ added: ['poisoned'], removed: ['healthy'] });
      expect(fileData.accumulatedHealth).toEqual(['poisoned']);
      expect(fileData.characterStateChanges).toEqual([
        { characterName: 'Alice', added: ['angry'], removed: ['calm'] },
      ]);
      expect(fileData.accumulatedCharacterState).toEqual({ Alice: ['angry', 'suspicious'] });
      expect(fileData.accumulatedStructureState).toEqual({
        currentActIndex: 1,
        currentBeatIndex: 2,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Won the battle' },
          { beatId: '1.2', status: 'active' },
        ],
      });
      expect(fileData.structureVersionId).toBeNull();
      expect(fileData.isEnding).toBe(false);
      expect(fileData.parentPageId).toBeNull();
      expect(fileData.parentChoiceIndex).toBeNull();
    });

    it('creates deep copies of arrays to prevent mutation', () => {
      const page = buildTestPage({
        stateChanges: { added: ['original'], removed: [] },
        accumulatedState: { changes: ['original'] },
      });

      const fileData = serializePage(page);

      // Mutate the file data
      fileData.stateChanges.added.push('mutated');
      fileData.accumulatedState.changes.push('mutated');

      // Original page should be unchanged
      expect(page.stateChanges.added).toEqual(['original']);
      expect(page.accumulatedState.changes).toEqual(['original']);
    });

    it('serializes parent page id and choice index for child pages', () => {
      const page = buildTestPage({
        id: parsePageId(2),
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
      });

      const fileData = serializePage(page);

      expect(fileData.parentPageId).toBe(1);
      expect(fileData.parentChoiceIndex).toBe(0);
    });

    it('serializes choices with linked next page ids', () => {
      const page = buildTestPage({
        choices: [
          { text: 'Go left', nextPageId: parsePageId(2) },
          { text: 'Go right', nextPageId: null },
        ],
      });

      const fileData = serializePage(page);

      expect(fileData.choices).toEqual([
        { text: 'Go left', nextPageId: 2 },
        { text: 'Go right', nextPageId: null },
      ]);
    });
  });

  describe('deserializePage', () => {
    function buildTestFileData(overrides?: Partial<PageFileData>): PageFileData {
      return {
        id: 1,
        narrativeText: 'Test narrative',
        choices: [
          { text: 'Choice A', nextPageId: null },
          { text: 'Choice B', nextPageId: null },
        ],
        stateChanges: { added: ['state-change'], removed: [] },
        accumulatedState: { changes: ['state-change'] },
        inventoryChanges: { added: [], removed: [] },
        accumulatedInventory: [],
        healthChanges: { added: [], removed: [] },
        accumulatedHealth: [],
        characterStateChanges: [],
        accumulatedCharacterState: {},
        accumulatedStructureState: {
          currentActIndex: 0,
          currentBeatIndex: 0,
          beatProgressions: [],
        },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        ...overrides,
      };
    }

    it('deserializes all page fields correctly', () => {
      const fileData = buildTestFileData({
        inventoryChanges: { added: ['sword'], removed: ['dagger'] },
        accumulatedInventory: ['sword', 'shield'],
        healthChanges: { added: ['poisoned'], removed: ['healthy'] },
        accumulatedHealth: ['poisoned'],
        characterStateChanges: [
          { characterName: 'Alice', added: ['angry'], removed: ['calm'] },
        ],
        accumulatedCharacterState: { Alice: ['angry', 'suspicious'] },
        accumulatedStructureState: {
          currentActIndex: 1,
          currentBeatIndex: 2,
          beatProgressions: [
            { beatId: '1.1', status: 'concluded', resolution: 'Won the battle' },
            { beatId: '1.2', status: 'active' },
          ],
        },
      });

      const page = deserializePage(fileData);

      expect(page.id).toBe(1);
      expect(page.narrativeText).toBe('Test narrative');
      expect(page.choices).toEqual([
        { text: 'Choice A', nextPageId: null },
        { text: 'Choice B', nextPageId: null },
      ]);
      expect(page.stateChanges).toEqual({ added: ['state-change'], removed: [] });
      expect(page.inventoryChanges).toEqual({ added: ['sword'], removed: ['dagger'] });
      expect(page.accumulatedInventory).toEqual(['sword', 'shield']);
      expect(page.healthChanges).toEqual({ added: ['poisoned'], removed: ['healthy'] });
      expect(page.accumulatedHealth).toEqual(['poisoned']);
      expect(page.characterStateChanges).toEqual([
        { characterName: 'Alice', added: ['angry'], removed: ['calm'] },
      ]);
      expect(page.accumulatedCharacterState).toEqual({ Alice: ['angry', 'suspicious'] });
      expect(page.accumulatedStructureState).toEqual({
        currentActIndex: 1,
        currentBeatIndex: 2,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Won the battle' },
          { beatId: '1.2', status: 'active' },
        ],
      });
      expect(page.structureVersionId).toBeNull();
      expect(page.isEnding).toBe(false);
      expect(page.parentPageId).toBeNull();
      expect(page.parentChoiceIndex).toBeNull();
    });

    it('creates deep copies of arrays to prevent mutation', () => {
      const fileData = buildTestFileData({
        stateChanges: { added: ['original'], removed: [] },
        accumulatedState: { changes: ['original'] },
      });

      const page = deserializePage(fileData);

      // Mutate the original file data
      fileData.stateChanges.added.push('mutated');
      fileData.accumulatedState.changes.push('mutated');

      // Deserialized page should be unchanged
      expect(page.stateChanges.added).toEqual(['original']);
      expect(page.accumulatedState.changes).toEqual(['original']);
    });

    it('deserializes parent page id and choice index for child pages', () => {
      const fileData = buildTestFileData({
        id: 2,
        parentPageId: 1,
        parentChoiceIndex: 0,
      });

      const page = deserializePage(fileData);

      expect(page.parentPageId).toBe(1);
      expect(page.parentChoiceIndex).toBe(0);
    });

    it('deserializes choices with linked next page ids', () => {
      const fileData = buildTestFileData({
        choices: [
          { text: 'Go left', nextPageId: 2 },
          { text: 'Go right', nextPageId: null },
        ],
      });

      const page = deserializePage(fileData);

      expect(page.choices).toEqual([
        { text: 'Go left', nextPageId: 2 },
        { text: 'Go right', nextPageId: null },
      ]);
    });

    describe('strict field validation', () => {
      it('throws when inventoryChanges is missing', () => {
        const fileData = buildTestFileData();
        const invalidFileData = { ...fileData } as Record<string, unknown>;
        delete invalidFileData.inventoryChanges;

        expect(() => deserializePage(invalidFileData as PageFileData)).toThrow();
      });

      it('throws when accumulatedInventory is missing', () => {
        const fileData = buildTestFileData();
        const invalidFileData = { ...fileData } as Record<string, unknown>;
        delete invalidFileData.accumulatedInventory;

        expect(() => deserializePage(invalidFileData as PageFileData)).toThrow();
      });

      it('throws when healthChanges is missing', () => {
        const fileData = buildTestFileData();
        const invalidFileData = { ...fileData } as Record<string, unknown>;
        delete invalidFileData.healthChanges;

        expect(() => deserializePage(invalidFileData as PageFileData)).toThrow();
      });

      it('throws when accumulatedHealth is missing', () => {
        const fileData = buildTestFileData();
        const invalidFileData = { ...fileData } as Record<string, unknown>;
        delete invalidFileData.accumulatedHealth;

        expect(() => deserializePage(invalidFileData as PageFileData)).toThrow();
      });

      it('throws when characterStateChanges is missing', () => {
        const fileData = buildTestFileData();
        const invalidFileData = { ...fileData } as Record<string, unknown>;
        delete invalidFileData.characterStateChanges;

        expect(() => deserializePage(invalidFileData as PageFileData)).toThrow();
      });

      it('throws when accumulatedCharacterState is missing', () => {
        const fileData = buildTestFileData();
        const invalidFileData = { ...fileData } as Record<string, unknown>;
        delete invalidFileData.accumulatedCharacterState;

        expect(() => deserializePage(invalidFileData as PageFileData)).toThrow();
      });

      it('throws when accumulatedStructureState is missing', () => {
        const fileData = buildTestFileData();
        const invalidFileData = { ...fileData } as Record<string, unknown>;
        delete invalidFileData.accumulatedStructureState;

        expect(() => deserializePage(invalidFileData as PageFileData)).toThrow();
      });

      it('defaults structureVersionId to null when missing', () => {
        const fileData = buildTestFileData();
        delete fileData.structureVersionId;

        const page = deserializePage(fileData);

        expect(page.structureVersionId).toBeNull();
      });

      it('parses structureVersionId when provided', () => {
        const fileData = buildTestFileData({
          structureVersionId: 'sv-1707321600000-a1b2',
        });

        const page = deserializePage(fileData);

        expect(page.structureVersionId).toBe('sv-1707321600000-a1b2');
      });
    });
  });

  describe('round-trip serialization', () => {
    it('preserves all data through serialize/deserialize cycle', () => {
      const originalPage = buildTestPage({
        id: parsePageId(5),
        narrativeText: 'A complex narrative with special characters: "quotes", \'apostrophes\', & symbols',
        choices: [
          { text: 'First choice', nextPageId: parsePageId(6) },
          { text: 'Second choice', nextPageId: null },
          { text: 'Third choice', nextPageId: parsePageId(7) },
        ],
        stateChanges: { added: ['change1', 'change2'], removed: ['old-change'] },
        accumulatedState: { changes: ['change1', 'change2', 'existing'] },
        inventoryChanges: { added: ['magic-sword', 'potion'], removed: ['rusty-dagger'] },
        accumulatedInventory: ['magic-sword', 'potion', 'gold-coins'],
        healthChanges: { added: ['blessed'], removed: ['cursed'] },
        accumulatedHealth: ['blessed', 'well-fed'],
        characterStateChanges: [
          { characterName: 'Hero', added: ['confident'], removed: ['nervous'] },
          { characterName: 'Companion', added: ['loyal'], removed: [] },
        ],
        accumulatedCharacterState: {
          Hero: ['confident', 'strong'],
          Companion: ['loyal', 'brave'],
        },
        accumulatedStructureState: {
          currentActIndex: 2,
          currentBeatIndex: 3,
          beatProgressions: [
            { beatId: '1.1', status: 'concluded', resolution: 'Victory' },
            { beatId: '1.2', status: 'concluded', resolution: 'Discovery' },
            { beatId: '2.1', status: 'active' },
            { beatId: '2.2', status: 'pending' },
          ],
        },
        isEnding: false,
        parentPageId: parsePageId(4),
        parentChoiceIndex: 1,
      });

      const serialized = serializePage(originalPage);
      const deserialized = deserializePage(serialized);

      expect(deserialized).toEqual(originalPage);
    });

    it('preserves ending page data through round-trip', () => {
      const endingPage: Page = {
        id: parsePageId(10),
        narrativeText: 'The end of the story',
        choices: [],
        stateChanges: { added: [], removed: [] },
        accumulatedState: { changes: ['some-state'] },
        inventoryChanges: { added: [], removed: [] },
        accumulatedInventory: [],
        healthChanges: { added: [], removed: [] },
        accumulatedHealth: [],
        characterStateChanges: [],
        accumulatedCharacterState: {},
        accumulatedStructureState: {
          currentActIndex: 0,
          currentBeatIndex: 0,
          beatProgressions: [],
        },
        structureVersionId: null,
        protagonistAffect: createDefaultProtagonistAffect(),
        isEnding: true,
        parentPageId: parsePageId(9),
        parentChoiceIndex: 0,
      };

      const serialized = serializePage(endingPage);
      const deserialized = deserializePage(serialized);

      expect(deserialized).toEqual(endingPage);
      expect(deserialized.isEnding).toBe(true);
      expect(deserialized.choices).toEqual([]);
    });
  });

  describe('parsePageIdFromFileName', () => {
    it('parses valid page file names', () => {
      expect(parsePageIdFromFileName('page_1.json')).toBe(1);
      expect(parsePageIdFromFileName('page_42.json')).toBe(42);
      expect(parsePageIdFromFileName('page_100.json')).toBe(100);
      expect(parsePageIdFromFileName('page_999.json')).toBe(999);
    });

    it('returns null for invalid file names', () => {
      expect(parsePageIdFromFileName('page.json')).toBeNull();
      expect(parsePageIdFromFileName('page_.json')).toBeNull();
      expect(parsePageIdFromFileName('story.json')).toBeNull();
      expect(parsePageIdFromFileName('page_1.txt')).toBeNull();
      expect(parsePageIdFromFileName('page_abc.json')).toBeNull();
      expect(parsePageIdFromFileName('PAGE_1.json')).toBeNull();
      expect(parsePageIdFromFileName('page_1.json.backup')).toBeNull();
      expect(parsePageIdFromFileName('')).toBeNull();
    });

    it('returns null for file names with extra characters', () => {
      expect(parsePageIdFromFileName('prefix_page_1.json')).toBeNull();
      expect(parsePageIdFromFileName('page_1_suffix.json')).toBeNull();
    });
  });
});
