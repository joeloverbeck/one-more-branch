import {
  ChoiceType,
  ConstraintType,
  Page,
  PrimaryDelta,
  ThreatType,
  ThreadType,
  Urgency,
  createChoice,
  createDefaultProtagonistAffect,
  createEmptyActiveState,
  createEmptyActiveStateChanges,
  createEmptyAccumulatedNpcAgendas,
  parsePageId,
} from '@/models';
import type { NpcAgenda } from '@/models/state/npc-agenda';
import {
  PageFileData,
  deserializePage,
  parsePageIdFromFileName,
  serializePage,
} from '@/persistence/page-serializer';
import type { StoryBible } from '@/llm/lorekeeper-types';

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
      currentMilestoneIndex: 0,
      milestoneProgressions: [],
      pagesInCurrentMilestone: 0,
      pacingNudge: null,
    },
    structureVersionId: null,
    analystResult: null,
    thematicValence: 'AMBIGUOUS',
    storyBible: null,
    protagonistAffect: createDefaultProtagonistAffect(),
    threadAges: {},
    accumulatedPromises: [],
    accumulatedDelayedConsequences: [],
    accumulatedKnowledgeState: [],
    npcAgendaUpdates: [],
    accumulatedNpcAgendas: createEmptyAccumulatedNpcAgendas(),
    npcRelationshipUpdates: [],
    accumulatedNpcRelationships: {},
    pageActIndex: 0,
    pageMilestoneIndex: 0,
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
        choiceType: ChoiceType.INTERVENE,
        primaryDelta: PrimaryDelta.GOAL_PRIORITY_CHANGE,
        nextPageId: null,
      },
      {
        text: 'Choice B',
        choiceType: ChoiceType.INTERVENE,
        primaryDelta: PrimaryDelta.GOAL_PRIORITY_CHANGE,
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
      currentMilestoneIndex: 0,
      milestoneProgressions: [],
      pagesInCurrentMilestone: 0,
      pacingNudge: null,
    },
    protagonistAffect: createDefaultProtagonistAffect(),
    structureVersionId: null,
    analystResult: null,
    thematicValence: 'AMBIGUOUS',
    threadAges: {},
    accumulatedPromises: [],
    accumulatedDelayedConsequences: [],
    accumulatedKnowledgeState: [],
    npcAgendaUpdates: [],
    accumulatedNpcAgendas: {},
    npcRelationshipUpdates: [],
    accumulatedNpcRelationships: {},
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
          threatsAdded: [
            { text: 'A hungry wolf is stalking nearby', threatType: ThreatType.ENVIRONMENTAL },
          ],
          threatsRemoved: ['th-1'],
          constraintsAdded: [
            { text: 'No light source is available', constraintType: ConstraintType.ENVIRONMENTAL },
          ],
          constraintsRemoved: [],
          threadsAdded: ['Find where the torn map leads'],
          threadsResolved: [],
        },
        accumulatedActiveState: {
          currentLocation: 'Forest',
          activeThreats: [
            {
              id: 'th-2',
              text: 'A hungry wolf is stalking nearby',
              threatType: ThreatType.ENVIRONMENTAL,
            },
          ],
          activeConstraints: [
            {
              id: 'cn-1',
              text: 'No light source is available',
              constraintType: ConstraintType.ENVIRONMENTAL,
            },
          ],
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

    it('serializes thematicValence', () => {
      const page = buildTestPage({
        thematicValence: 'THESIS_SUPPORTING',
      });

      const fileData = serializePage(page);

      expect(fileData.thematicValence).toBe('THESIS_SUPPORTING');
    });

    it('serializes accumulatedDelayedConsequences', () => {
      const page = buildTestPage({
        accumulatedDelayedConsequences: [
          {
            id: 'dc-1',
            description: 'An old debt is called in.',
            triggerCondition: 'The broker recognizes the protagonist.',
            minPagesDelay: 2,
            maxPagesDelay: 4,
            currentAge: 3,
            triggered: false,
            sourcePageId: parsePageId(1),
          },
        ],
      });

      const fileData = serializePage(page);
      expect(fileData.accumulatedDelayedConsequences).toEqual([
        {
          id: 'dc-1',
          description: 'An old debt is called in.',
          triggerCondition: 'The broker recognizes the protagonist.',
          minPagesDelay: 2,
          maxPagesDelay: 4,
          currentAge: 3,
          triggered: false,
          sourcePageId: 1,
        },
      ]);
    });

    it('serializes accumulatedKnowledgeState', () => {
      const page = buildTestPage({
        accumulatedKnowledgeState: [
          {
            characterName: 'Captain Voss',
            knownFacts: ['The gate lock is tied to reactor pressure.'],
            falseBeliefs: ['The protagonist betrayed the crew.'],
            secrets: ['Voss hid the evacuation codes.'],
          },
        ],
      });

      const fileData = serializePage(page);
      expect(fileData.accumulatedKnowledgeState).toEqual([
        {
          characterName: 'Captain Voss',
          knownFacts: ['The gate lock is tied to reactor pressure.'],
          falseBeliefs: ['The protagonist betrayed the crew.'],
          secrets: ['Voss hid the evacuation codes.'],
        },
      ]);
    });

    it('does not serialize storyBible even when present on the page', () => {
      const storyBible: StoryBible = {
        sceneWorldContext: 'Foggy harbor at dawn.',
        relevantCharacters: [
          {
            name: 'Mira',
            role: 'ally',
            relevantProfile: 'Ex-smuggler with a strict code.',
            speechPatterns: 'Direct and concise.',
            protagonistRelationship: 'Trusted but cautious.',
            currentState: 'Watching the docks.',
          },
        ],
        relevantCanonFacts: ['The harbor is controlled by the syndicate.'],
        relevantHistory: 'Mira helped the protagonist escape once before.',
      };
      const page = buildTestPage({ storyBible });

      const fileData = serializePage(page);

      expect(fileData).not.toHaveProperty('storyBible');
    });

    it('creates deep copies to prevent mutation', () => {
      const page = buildTestPage({
        accumulatedInventory: [{ id: 'inv-1', text: 'original' }],
        accumulatedHealth: [{ id: 'hp-1', text: 'healthy' }],
        accumulatedActiveState: {
          currentLocation: 'Watchtower',
          activeThreats: [{ id: 'th-1', text: 'Incoming scouts', threatType: ThreatType.ENVIRONMENTAL }],
          activeConstraints: [
            { id: 'cn-1', text: 'Bridge is collapsed', constraintType: ConstraintType.ENVIRONMENTAL },
          ],
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
      fileData.accumulatedActiveState.activeThreats[0] = {
        id: 'th-1',
        text: 'mutated',
        threatType: ThreatType.ENVIRONMENTAL,
      };
      fileData.characterStateChanges.added[0].states[0] = 'mutated';
      fileData.accumulatedCharacterState['Mira'] = [{ id: 'cs-4', text: 'mutated' }];

      expect(page.accumulatedInventory).toEqual([{ id: 'inv-1', text: 'original' }]);
      expect(page.accumulatedHealth).toEqual([{ id: 'hp-1', text: 'healthy' }]);
      expect(page.accumulatedActiveState.activeThreats).toEqual([
        { id: 'th-1', text: 'Incoming scouts', threatType: ThreatType.ENVIRONMENTAL },
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
          activeThreats: [{ id: 'th-8', text: 'Flooding water', threatType: ThreatType.ENVIRONMENTAL }],
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
      fileData.accumulatedActiveState.activeThreats[0] = {
        id: 'th-8',
        text: 'mutated',
        threatType: ThreatType.ENVIRONMENTAL,
      };
      fileData.characterStateChanges.added[0].states[0] = 'mutated';
      fileData.accumulatedCharacterState['Greaves'] = [{ id: 'cs-10', text: 'mutated' }];

      expect(page.accumulatedInventory).toEqual([{ id: 'inv-1', text: 'item' }]);
      expect(page.accumulatedActiveState.activeThreats).toEqual([
        { id: 'th-8', text: 'Flooding water', threatType: ThreatType.ENVIRONMENTAL },
      ]);
      expect(page.characterStateChanges.added[0]?.states).toEqual(['wary']);
      expect(page.accumulatedCharacterState).toEqual({
        Greaves: [{ id: 'cs-10', text: 'wary' }],
      });
    });

    it('deserializes npcAgendaUpdates and accumulatedNpcAgendas when present', () => {
      const agenda: NpcAgenda = {
        npcName: 'Garak',
        currentGoal: 'Escape',
        leverage: 'Codes',
        fear: 'Exposure',
        offScreenBehavior: 'Planning',
      };
      const fileData = buildTestFileData({
        npcAgendaUpdates: [agenda],
        accumulatedNpcAgendas: { Garak: agenda },
      });

      const page = deserializePage(fileData);
      expect(page.npcAgendaUpdates).toEqual([agenda]);
      expect(page.accumulatedNpcAgendas).toEqual({ Garak: agenda });
    });

    it('deserializes structureVersionId as null when set to null', () => {
      const fileData = buildTestFileData({ structureVersionId: null });

      const page = deserializePage(fileData);
      expect(page.structureVersionId).toBeNull();
    });

    it('deserializes thematicValence', () => {
      const fileData = buildTestFileData({ thematicValence: 'ANTITHESIS_SUPPORTING' });

      const page = deserializePage(fileData);
      expect(page.thematicValence).toBe('ANTITHESIS_SUPPORTING');
    });

    it('deserializes accumulatedDelayedConsequences', () => {
      const fileData = buildTestFileData({
        accumulatedDelayedConsequences: [
          {
            id: 'dc-3',
            description: 'The forged signature is audited.',
            triggerCondition: 'The ledger is re-opened.',
            minPagesDelay: 1,
            maxPagesDelay: 2,
            currentAge: 1,
            triggered: false,
            sourcePageId: 2,
          },
        ],
      });

      const page = deserializePage(fileData);
      expect(page.accumulatedDelayedConsequences).toEqual([
        {
          id: 'dc-3',
          description: 'The forged signature is audited.',
          triggerCondition: 'The ledger is re-opened.',
          minPagesDelay: 1,
          maxPagesDelay: 2,
          currentAge: 1,
          triggered: false,
          sourcePageId: parsePageId(2),
        },
      ]);
    });

    it('deserializes accumulatedKnowledgeState', () => {
      const fileData = buildTestFileData({
        accumulatedKnowledgeState: [
          {
            characterName: 'Captain Voss',
            knownFacts: ['The gate lock is tied to reactor pressure.'],
            falseBeliefs: ['The protagonist betrayed the crew.'],
            secrets: ['Voss hid the evacuation codes.'],
          },
        ],
      });

      const page = deserializePage(fileData);
      expect(page.accumulatedKnowledgeState).toEqual([
        {
          characterName: 'Captain Voss',
          knownFacts: ['The gate lock is tied to reactor pressure.'],
          falseBeliefs: ['The protagonist betrayed the crew.'],
          secrets: ['Voss hid the evacuation codes.'],
        },
      ]);
    });

    it('always deserializes storyBible as null', () => {
      const fileData = buildTestFileData();
      const legacyLikePayload = {
        ...fileData,
        storyBible: {
          sceneWorldContext: 'Legacy field that should be ignored',
          relevantCharacters: [],
          relevantCanonFacts: [],
          relevantHistory: '',
        },
      } as PageFileData;

      const page = deserializePage(legacyLikePayload);

      expect(page.storyBible).toBeNull();
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

    it('throws when accumulatedPromises is missing', () => {
      const fileData = buildTestFileData();
      const invalid = { ...fileData } as Record<string, unknown>;
      delete invalid.accumulatedPromises;
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
            choiceType: ChoiceType.INTERVENE,
            primaryDelta: PrimaryDelta.GOAL_PRIORITY_CHANGE,
            nextPageId: parsePageId(6),
          },
          {
            text: 'Second choice',
            choiceType: ChoiceType.COMMIT,
            primaryDelta: PrimaryDelta.RELATIONSHIP_ALIGNMENT_CHANGE,
            nextPageId: null,
          },
        ],
        activeStateChanges: {
          newLocation: 'Temple',
          threatsAdded: [
            {
              text: 'An armed guard blocks the inner doorway',
              threatType: ThreatType.ENVIRONMENTAL,
            },
          ],
          threatsRemoved: [],
          constraintsAdded: [],
          constraintsRemoved: [],
          threadsAdded: [],
          threadsResolved: [],
        },
        accumulatedActiveState: {
          currentLocation: 'Temple',
          activeThreats: [
            {
              id: 'th-1',
              text: 'An armed guard blocks the inner doorway',
              threatType: ThreatType.ENVIRONMENTAL,
            },
          ],
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

    it('preserves NPC agenda data through serialize/deserialize cycle', () => {
      const agenda: NpcAgenda = {
        npcName: 'Kira',
        currentGoal: 'Defend the station',
        leverage: 'Military command',
        fear: 'Losing the war',
        offScreenBehavior: 'Coordinating defense',
      };
      const page = buildTestPage({
        npcAgendaUpdates: [agenda],
        accumulatedNpcAgendas: { Kira: agenda },
      });

      const serialized = serializePage(page);
      const deserialized = deserializePage(serialized);
      expect(deserialized.npcAgendaUpdates).toEqual([agenda]);
      expect(deserialized.accumulatedNpcAgendas).toEqual({ Kira: agenda });
    });

    it('ignores legacy resolved meta fields when deserializing old files', () => {
      const legacyFileData = {
        ...buildTestFileData(),
        resolvedThreadMeta: {
          'td-1': { threadType: 'MYSTERY', urgency: 'HIGH' },
        },
        resolvedPromiseMeta: {
          'pr-1': { promiseType: 'CHEKHOV_GUN', scope: 'BEAT', urgency: 'HIGH' },
        },
      };

      const deserialized = deserializePage(legacyFileData as unknown as PageFileData);
      expect(deserialized).toEqual(buildTestPage());
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
