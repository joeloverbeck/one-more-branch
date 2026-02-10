import {
  ChoiceType,
  Page,
  PrimaryDelta,
  ThreadType,
  Urgency,
  createChoice,
  createDefaultProtagonistAffect,
  createEmptyActiveState,
  createEmptyActiveStateChanges,
  parsePageId,
} from '@/models';
import {
  PageFileData,
  deserializePage,
  parsePageIdFromFileName,
  serializePage,
} from '@/persistence/page-serializer';

function buildTestPage(overrides?: Partial<Page>): Page {
  const basePage: Page = {
    id: parsePageId(1),
    narrativeText: 'Test narrative',
    sceneSummary: 'Test summary.',
    choices: [createChoice('Choice A'), createChoice('Choice B')],
    activeStateChanges: createEmptyActiveStateChanges(),
    accumulatedActiveState: createEmptyActiveState(),
    inventoryChanges: { added: [], removed: [] },
    accumulatedInventory: [],
    healthChanges: { added: [], removed: [] },
    accumulatedHealth: [],
    characterStateChanges: { added: [], removed: [] },
    accumulatedCharacterState: {},
    accumulatedStructureState: {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [],
      pagesInCurrentBeat: 0,
      pacingNudge: null,
    },
    structureVersionId: null,
    protagonistAffect: createDefaultProtagonistAffect(),
    isEnding: false,
    parentPageId: null,
    parentChoiceIndex: null,
  };

  return { ...basePage, ...overrides };
}

function buildTestFileData(overrides?: Partial<PageFileData>): PageFileData {
  return {
    id: 1,
    narrativeText: 'Test narrative',
    sceneSummary: 'Test summary.',
    choices: [
      {
        text: 'Choice A',
        choiceType: ChoiceType.TACTICAL_APPROACH,
        primaryDelta: PrimaryDelta.GOAL_SHIFT,
        nextPageId: null,
      },
      {
        text: 'Choice B',
        choiceType: ChoiceType.TACTICAL_APPROACH,
        primaryDelta: PrimaryDelta.GOAL_SHIFT,
        nextPageId: null,
      },
    ],
    activeStateChanges: createEmptyActiveStateChanges(),
    accumulatedActiveState: createEmptyActiveState(),
    inventoryChanges: { added: [], removed: [] },
    accumulatedInventory: [],
    healthChanges: { added: [], removed: [] },
    accumulatedHealth: [],
    characterStateChanges: { added: [], removed: [] },
    accumulatedCharacterState: {},
    accumulatedStructureState: {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [],
      pagesInCurrentBeat: 0,
      pacingNudge: null,
    },
    protagonistAffect: createDefaultProtagonistAffect(),
    isEnding: false,
    parentPageId: null,
    parentChoiceIndex: null,
    ...overrides,
  };
}

describe('page-serializer', () => {
  describe('serializePage', () => {
    it('serializes keyed inventory, health, and character state correctly', () => {
      const page = buildTestPage({
        inventoryChanges: { added: ['sword'], removed: ['inv-1'] },
        accumulatedInventory: [
          { id: 'inv-1', text: 'old dagger' },
          { id: 'inv-2', text: 'sword' },
        ],
        healthChanges: { added: ['poisoned'], removed: ['hp-1'] },
        accumulatedHealth: [{ id: 'hp-2', text: 'poisoned' }],
        characterStateChanges: {
          added: [{ characterName: 'Alice', states: ['angry'] }],
          removed: ['cs-1'],
        },
        accumulatedCharacterState: { Alice: [{ id: 'cs-2', text: 'angry' }] },
      });

      const fileData = serializePage(page);

      expect(fileData.inventoryChanges).toEqual({ added: ['sword'], removed: ['inv-1'] });
      expect(fileData.accumulatedInventory).toEqual([
        { id: 'inv-1', text: 'old dagger' },
        { id: 'inv-2', text: 'sword' },
      ]);
      expect(fileData.healthChanges).toEqual({ added: ['poisoned'], removed: ['hp-1'] });
      expect(fileData.accumulatedHealth).toEqual([{ id: 'hp-2', text: 'poisoned' }]);
      expect(fileData.characterStateChanges).toEqual({
        added: [{ characterName: 'Alice', states: ['angry'] }],
        removed: ['cs-1'],
      });
      expect(fileData.accumulatedCharacterState).toEqual({
        Alice: [{ id: 'cs-2', text: 'angry' }],
      });
    });

    it('serializes active state keyed entries correctly', () => {
      const page = buildTestPage({
        activeStateChanges: {
          newLocation: 'Forest',
          threatsAdded: ['A hungry wolf is stalking nearby'],
          threatsRemoved: ['th-1'],
          constraintsAdded: ['No light source is available'],
          constraintsRemoved: [],
          threadsAdded: ['Find where the torn map leads'],
          threadsResolved: [],
        },
        accumulatedActiveState: {
          currentLocation: 'Forest',
          activeThreats: [{ id: 'th-2', text: 'A hungry wolf is stalking nearby' }],
          activeConstraints: [{ id: 'cn-1', text: 'No light source is available' }],
          openThreads: [
            {
              id: 'td-1',
              text: 'Find where the torn map leads',
              threadType: ThreadType.MYSTERY,
              urgency: Urgency.HIGH,
            },
          ],
        },
      });

      const fileData = serializePage(page);

      expect(fileData.activeStateChanges).toEqual(page.activeStateChanges);
      expect(fileData.accumulatedActiveState).toEqual(page.accumulatedActiveState);
    });

    it('creates deep copies to prevent mutation', () => {
      const page = buildTestPage({
        accumulatedInventory: [{ id: 'inv-1', text: 'original' }],
        accumulatedHealth: [{ id: 'hp-1', text: 'healthy' }],
        accumulatedActiveState: {
          currentLocation: 'Watchtower',
          activeThreats: [{ id: 'th-1', text: 'Incoming scouts' }],
          activeConstraints: [{ id: 'cn-1', text: 'Bridge is collapsed' }],
          openThreads: [
            {
              id: 'td-1',
              text: 'Find a crossing',
              threadType: ThreadType.QUEST,
              urgency: Urgency.MEDIUM,
            },
          ],
        },
        characterStateChanges: {
          added: [{ characterName: 'Mira', states: ['alert'] }],
          removed: ['cs-3'],
        },
        accumulatedCharacterState: {
          Mira: [{ id: 'cs-4', text: 'alert' }],
        },
      });

      const fileData = serializePage(page);
      fileData.accumulatedInventory[0] = { id: 'inv-1', text: 'mutated' };
      fileData.accumulatedHealth.push({ id: 'hp-2', text: 'mutated' });
      fileData.accumulatedActiveState.activeThreats[0] = { id: 'th-1', text: 'mutated' };
      fileData.characterStateChanges.added[0].states[0] = 'mutated';
      fileData.accumulatedCharacterState['Mira'] = [{ id: 'cs-4', text: 'mutated' }];

      expect(page.accumulatedInventory).toEqual([{ id: 'inv-1', text: 'original' }]);
      expect(page.accumulatedHealth).toEqual([{ id: 'hp-1', text: 'healthy' }]);
      expect(page.accumulatedActiveState.activeThreats).toEqual([
        { id: 'th-1', text: 'Incoming scouts' },
      ]);
      expect(page.characterStateChanges.added[0]?.states).toEqual(['alert']);
      expect(page.accumulatedCharacterState).toEqual({
        Mira: [{ id: 'cs-4', text: 'alert' }],
      });
    });
  });

  describe('deserializePage', () => {
    it('deserializes keyed structures correctly', () => {
      const fileData = buildTestFileData({
        inventoryChanges: { added: ['rope'], removed: ['inv-1'] },
        accumulatedInventory: [{ id: 'inv-2', text: 'rope' }],
        healthChanges: { added: ['injured'], removed: [] },
        accumulatedHealth: [{ id: 'hp-1', text: 'injured' }],
        characterStateChanges: {
          added: [{ characterName: 'Greaves', states: ['waiting'] }],
          removed: ['cs-1'],
        },
        accumulatedCharacterState: {
          Greaves: [{ id: 'cs-2', text: 'waiting' }],
        },
      });

      const page = deserializePage(fileData);

      expect(page.inventoryChanges).toEqual(fileData.inventoryChanges);
      expect(page.accumulatedInventory).toEqual(fileData.accumulatedInventory);
      expect(page.healthChanges).toEqual(fileData.healthChanges);
      expect(page.accumulatedHealth).toEqual(fileData.accumulatedHealth);
      expect(page.characterStateChanges).toEqual(fileData.characterStateChanges);
      expect(page.accumulatedCharacterState).toEqual(fileData.accumulatedCharacterState);
    });

    it('creates deep copies during deserialization', () => {
      const fileData = buildTestFileData({
        accumulatedInventory: [{ id: 'inv-1', text: 'item' }],
        accumulatedActiveState: {
          currentLocation: 'Cellar',
          activeThreats: [{ id: 'th-8', text: 'Flooding water' }],
          activeConstraints: [],
          openThreads: [],
        },
        characterStateChanges: {
          added: [{ characterName: 'Greaves', states: ['wary'] }],
          removed: ['cs-9'],
        },
        accumulatedCharacterState: {
          Greaves: [{ id: 'cs-10', text: 'wary' }],
        },
      });

      const page = deserializePage(fileData);
      fileData.accumulatedInventory[0] = { id: 'inv-1', text: 'mutated' };
      fileData.accumulatedActiveState.activeThreats[0] = { id: 'th-8', text: 'mutated' };
      fileData.characterStateChanges.added[0].states[0] = 'mutated';
      fileData.accumulatedCharacterState['Greaves'] = [{ id: 'cs-10', text: 'mutated' }];

      expect(page.accumulatedInventory).toEqual([{ id: 'inv-1', text: 'item' }]);
      expect(page.accumulatedActiveState.activeThreats).toEqual([
        { id: 'th-8', text: 'Flooding water' },
      ]);
      expect(page.characterStateChanges.added[0]?.states).toEqual(['wary']);
      expect(page.accumulatedCharacterState).toEqual({
        Greaves: [{ id: 'cs-10', text: 'wary' }],
      });
    });

    it('defaults structureVersionId to null when missing', () => {
      const fileData = buildTestFileData();
      delete fileData.structureVersionId;

      const page = deserializePage(fileData);
      expect(page.structureVersionId).toBeNull();
    });

    it('parses structureVersionId when provided', () => {
      const fileData = buildTestFileData({ structureVersionId: 'sv-1707321600000-a1b2' });
      const page = deserializePage(fileData);
      expect(page.structureVersionId).toBe('sv-1707321600000-a1b2');
    });

    it('throws when required fields are missing', () => {
      const fileData = buildTestFileData();
      const invalid = { ...fileData } as Record<string, unknown>;
      delete invalid.inventoryChanges;
      expect(() => deserializePage(invalid as PageFileData)).toThrow();
    });
  });

  describe('round-trip serialization', () => {
    it('preserves all data through serialize/deserialize cycle', () => {
      const originalPage = buildTestPage({
        id: parsePageId(5),
        choices: [
          {
            text: 'First choice',
            choiceType: ChoiceType.TACTICAL_APPROACH,
            primaryDelta: PrimaryDelta.GOAL_SHIFT,
            nextPageId: parsePageId(6),
          },
          {
            text: 'Second choice',
            choiceType: ChoiceType.MORAL_DILEMMA,
            primaryDelta: PrimaryDelta.RELATIONSHIP_CHANGE,
            nextPageId: null,
          },
        ],
        activeStateChanges: {
          newLocation: 'Temple',
          threatsAdded: ['An armed guard blocks the inner doorway'],
          threatsRemoved: [],
          constraintsAdded: [],
          constraintsRemoved: [],
          threadsAdded: [],
          threadsResolved: [],
        },
        accumulatedActiveState: {
          currentLocation: 'Temple',
          activeThreats: [{ id: 'th-1', text: 'An armed guard blocks the inner doorway' }],
          activeConstraints: [],
          openThreads: [],
        },
        inventoryChanges: { added: ['key'], removed: [] },
        accumulatedInventory: [{ id: 'inv-1', text: 'key' }],
        healthChanges: { added: ['hurt'], removed: [] },
        accumulatedHealth: [{ id: 'hp-1', text: 'hurt' }],
        characterStateChanges: {
          added: [{ characterName: 'Companion', states: ['trusting'] }],
          removed: [],
        },
        accumulatedCharacterState: {
          Companion: [{ id: 'cs-1', text: 'trusting' }],
        },
        parentPageId: parsePageId(4),
        parentChoiceIndex: 1,
      });

      const serialized = serializePage(originalPage);
      const deserialized = deserializePage(serialized);
      expect(deserialized).toEqual(originalPage);
    });
  });

  describe('parsePageIdFromFileName', () => {
    it('parses valid page file names', () => {
      expect(parsePageIdFromFileName('page_1.json')).toBe(1);
      expect(parsePageIdFromFileName('page_42.json')).toBe(42);
    });

    it('returns null for invalid file names', () => {
      expect(parsePageIdFromFileName('page.json')).toBeNull();
      expect(parsePageIdFromFileName('page_abc.json')).toBeNull();
      expect(parsePageIdFromFileName('PAGE_1.json')).toBeNull();
    });
  });
});
