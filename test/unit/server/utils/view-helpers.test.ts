import {
  getActDisplayInfo,
  getKeyedEntryPanelData,
  getNpcRelationshipPanelData,
  getOpenThreadPanelData,
  getOpenThreadPanelRows,
  getTrackedPromisesPanelData,
} from '@/server/utils/view-helpers';
import {
  createPage,
  createChoice,
  createStory,
  createEmptyAccumulatedStructureState,
  parseStructureVersionId,
  ThreadType,
  Urgency,
} from '@/models';
import { PromiseType } from '@/models/state/keyed-entry';
import type {
  Story,
  Page,
  VersionedStoryStructure,
  StoryStructure,
  StructureVersionId,
} from '@/models';

function createTestStructure(acts: Array<{ id: string; name: string }>): StoryStructure {
  return {
    acts: acts.map((act, index) => ({
      id: act.id,
      name: act.name,
      objective: 'Test objective',
      stakes: 'Test stakes',
      entryCondition: 'Test entry',
      beats: [
        {
          id: `${index + 1}.1`,
          name: `${act.name} Beat`,
          description: 'Test beat description',
          objective: 'Test beat objective',
          role: 'setup',
        },
      ],
    })),
    overallTheme: 'Test theme',
    premise: 'Test premise',
    pacingBudget: {
      targetPagesMin: 1,
      targetPagesMax: 2,
    },
    generatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

// Creates a valid test version ID (format: sv-{13 digits}-{4 hex chars})
function createTestVersionId(suffix: string): StructureVersionId {
  return parseStructureVersionId(`sv-1234567890123-${suffix.padStart(4, '0')}`);
}

function createTestVersionedStructure(
  versionId: StructureVersionId,
  structure: StoryStructure
): VersionedStoryStructure {
  return {
    id: versionId,
    previousVersionId: null,
    createdAtPageId: 1,
    rewriteReason: null,
    structure,
    preservedBeatIds: [],
  };
}

describe('getActDisplayInfo', () => {
  const baseStory = createStory({
    title: 'Test Story',
    characterConcept: 'A test character',
    worldbuilding: 'Test world',
    tone: 'Adventure',
  });

  const basePage = createPage({
    id: 1,
    narrativeText: 'Test narrative',
    sceneSummary: 'Test summary of the scene events and consequences.',
    choices: [createChoice('Choice 1'), createChoice('Choice 2')],
    isEnding: false,
    parentPageId: null,
    parentChoiceIndex: null,
  });

  describe('returns correct info', () => {
    it('returns correct info for first act with standard act ID', () => {
      const structure = createTestStructure([
        { id: 'act-1', name: 'The Beginning' },
        { id: 'act-2', name: 'The Middle' },
      ]);
      const versionId = createTestVersionId('0001');
      const story: Story = {
        ...baseStory,
        structureVersions: [createTestVersionedStructure(versionId, structure)],
      };
      const page: Page = {
        ...basePage,
        structureVersionId: versionId,
        accumulatedStructureState: {
          ...createEmptyAccumulatedStructureState(),
          currentActIndex: 0,
        },
      };

      const result = getActDisplayInfo(story, page);

      expect(result).toEqual({
        actNumber: 1,
        actName: 'The Beginning',
        beatId: '1.1',
        beatName: 'The Beginning Beat',
        displayString: 'Act 1: The Beginning - Beat 1.1: The Beginning Beat',
        actObjective: 'Test objective',
        actStakes: 'Test stakes',
        beatObjective: 'Test beat objective',
      });
    });

    it('returns correct info for second act with standard act ID', () => {
      const structure = createTestStructure([
        { id: 'act-1', name: 'The Beginning' },
        { id: 'act-2', name: 'The Middle' },
      ]);
      const versionId = createTestVersionId('0001');
      const story: Story = {
        ...baseStory,
        structureVersions: [createTestVersionedStructure(versionId, structure)],
      };
      const page: Page = {
        ...basePage,
        structureVersionId: versionId,
        pageActIndex: 1,
        pageBeatIndex: 0,
        accumulatedStructureState: {
          ...createEmptyAccumulatedStructureState(),
          currentActIndex: 1,
        },
      };

      const result = getActDisplayInfo(story, page);

      expect(result).toEqual({
        actNumber: 2,
        actName: 'The Middle',
        beatId: '2.1',
        beatName: 'The Middle Beat',
        displayString: 'Act 2: The Middle - Beat 2.1: The Middle Beat',
        actObjective: 'Test objective',
        actStakes: 'Test stakes',
        beatObjective: 'Test beat objective',
      });
    });

    it('falls back to index+1 for non-standard act ID', () => {
      const structure = createTestStructure([
        { id: 'custom-act', name: 'Custom Act' },
        { id: 'another-custom', name: 'Another Custom' },
      ]);
      const versionId = createTestVersionId('0001');
      const story: Story = {
        ...baseStory,
        structureVersions: [createTestVersionedStructure(versionId, structure)],
      };
      const page: Page = {
        ...basePage,
        structureVersionId: versionId,
        pageActIndex: 1,
        pageBeatIndex: 0,
        accumulatedStructureState: {
          ...createEmptyAccumulatedStructureState(),
          currentActIndex: 1,
        },
      };

      const result = getActDisplayInfo(story, page);

      expect(result).toEqual({
        actNumber: 2,
        actName: 'Another Custom',
        beatId: '2.1',
        beatName: 'Another Custom Beat',
        displayString: 'Act 2: Another Custom - Beat 2.1: Another Custom Beat',
        actObjective: 'Test objective',
        actStakes: 'Test stakes',
        beatObjective: 'Test beat objective',
      });
    });
  });

  describe('returns structure detail fields', () => {
    it('returns actObjective, actStakes, and beatObjective from structure', () => {
      const structure: StoryStructure = {
        acts: [
          {
            id: 'act-1',
            name: 'Opening',
            objective: 'Establish the world',
            stakes: 'Character survival',
            entryCondition: 'Story start',
            beats: [
              {
                id: '1.1',
                name: 'Discovery',
                description: 'First discovery',
                objective: 'Find the clue',
                role: 'setup',
              },
            ],
          },
        ],
        overallTheme: 'Theme',
        premise: 'Premise',
        pacingBudget: { targetPagesMin: 1, targetPagesMax: 5 },
        generatedAt: new Date('2026-01-01T00:00:00.000Z'),
      };
      const versionId = createTestVersionId('0001');
      const story: Story = {
        ...baseStory,
        structureVersions: [createTestVersionedStructure(versionId, structure)],
      };
      const page: Page = {
        ...basePage,
        structureVersionId: versionId,
        accumulatedStructureState: {
          ...createEmptyAccumulatedStructureState(),
          currentActIndex: 0,
        },
      };

      const result = getActDisplayInfo(story, page);

      expect(result?.actObjective).toBe('Establish the world');
      expect(result?.actStakes).toBe('Character survival');
      expect(result?.beatObjective).toBe('Find the clue');
    });

    it('returns null for empty objective and stakes strings', () => {
      const structure: StoryStructure = {
        acts: [
          {
            id: 'act-1',
            name: 'Opening',
            objective: '',
            stakes: '',
            entryCondition: 'Start',
            beats: [
              {
                id: '1.1',
                name: 'Beat',
                description: 'Desc',
                objective: '',
                role: 'setup',
              },
            ],
          },
        ],
        overallTheme: 'Theme',
        premise: 'Premise',
        pacingBudget: { targetPagesMin: 1, targetPagesMax: 5 },
        generatedAt: new Date('2026-01-01T00:00:00.000Z'),
      };
      const versionId = createTestVersionId('0002');
      const story: Story = {
        ...baseStory,
        structureVersions: [createTestVersionedStructure(versionId, structure)],
      };
      const page: Page = {
        ...basePage,
        structureVersionId: versionId,
        accumulatedStructureState: {
          ...createEmptyAccumulatedStructureState(),
          currentActIndex: 0,
        },
      };

      const result = getActDisplayInfo(story, page);

      expect(result?.actObjective).toBeNull();
      expect(result?.actStakes).toBeNull();
      expect(result?.beatObjective).toBeNull();
    });
  });

  describe('returns null for edge cases', () => {
    it('returns null when page has no structureVersionId', () => {
      const story: Story = {
        ...baseStory,
        structureVersions: [],
      };
      const page: Page = {
        ...basePage,
        structureVersionId: null,
      };

      const result = getActDisplayInfo(story, page);

      expect(result).toBeNull();
    });

    it('returns null when story has no structureVersions', () => {
      const versionId = createTestVersionId('0001');
      const story: Story = {
        ...baseStory,
        structureVersions: undefined,
      } as Story;
      const page: Page = {
        ...basePage,
        structureVersionId: versionId,
      };

      const result = getActDisplayInfo(story, page);

      expect(result).toBeNull();
    });

    it('returns null when story has empty structureVersions array', () => {
      const versionId = createTestVersionId('0001');
      const story: Story = {
        ...baseStory,
        structureVersions: [],
      };
      const page: Page = {
        ...basePage,
        structureVersionId: versionId,
      };

      const result = getActDisplayInfo(story, page);

      expect(result).toBeNull();
    });

    it('returns null when structureVersionId does not match any version', () => {
      const structure = createTestStructure([{ id: 'act-1', name: 'Test Act' }]);
      const storyVersionId = createTestVersionId('0001');
      const pageVersionId = createTestVersionId('9999'); // Different ID
      const story: Story = {
        ...baseStory,
        structureVersions: [createTestVersionedStructure(storyVersionId, structure)],
      };
      const page: Page = {
        ...basePage,
        structureVersionId: pageVersionId,
        accumulatedStructureState: {
          ...createEmptyAccumulatedStructureState(),
          currentActIndex: 0,
        },
      };

      const result = getActDisplayInfo(story, page);

      expect(result).toBeNull();
    });

    it('returns null when pageActIndex is out of bounds', () => {
      const structure = createTestStructure([{ id: 'act-1', name: 'Only Act' }]);
      const versionId = createTestVersionId('0001');
      const story: Story = {
        ...baseStory,
        structureVersions: [createTestVersionedStructure(versionId, structure)],
      };
      const page: Page = {
        ...basePage,
        structureVersionId: versionId,
        pageActIndex: 5,
        pageBeatIndex: 0,
        accumulatedStructureState: {
          ...createEmptyAccumulatedStructureState(),
          currentActIndex: 5,
        },
      };

      const result = getActDisplayInfo(story, page);

      expect(result).toBeNull();
    });

    it('returns null when pageBeatIndex is out of bounds', () => {
      const structure = createTestStructure([{ id: 'act-1', name: 'Only Act' }]);
      const versionId = createTestVersionId('0001');
      const story: Story = {
        ...baseStory,
        structureVersions: [createTestVersionedStructure(versionId, structure)],
      };
      const page: Page = {
        ...basePage,
        structureVersionId: versionId,
        pageActIndex: 0,
        pageBeatIndex: 3,
        accumulatedStructureState: {
          ...createEmptyAccumulatedStructureState(),
          currentActIndex: 0,
          currentBeatIndex: 3,
        },
      };

      const result = getActDisplayInfo(story, page);

      expect(result).toBeNull();
    });
  });
});

describe('getOpenThreadPanelRows', () => {
  it('sorts by urgency in HIGH, MEDIUM, LOW order', () => {
    const result = getOpenThreadPanelRows([
      {
        id: 'td-1',
        text: 'Low urgency thread',
        threadType: ThreadType.INFORMATION,
        urgency: Urgency.LOW,
      },
      {
        id: 'td-2',
        text: 'High urgency thread',
        threadType: ThreadType.MYSTERY,
        urgency: Urgency.HIGH,
      },
      {
        id: 'td-3',
        text: 'Medium urgency thread',
        threadType: ThreadType.QUEST,
        urgency: Urgency.MEDIUM,
      },
    ]);

    expect(result.map((row) => row.id)).toEqual(['td-2', 'td-3', 'td-1']);
  });

  it('preserves source order for matching urgencies', () => {
    const result = getOpenThreadPanelRows([
      { id: 'td-1', text: 'First', threadType: ThreadType.INFORMATION, urgency: Urgency.MEDIUM },
      { id: 'td-2', text: 'Second', threadType: ThreadType.QUEST, urgency: Urgency.MEDIUM },
      { id: 'td-3', text: 'Third', threadType: ThreadType.MORAL, urgency: Urgency.MEDIUM },
    ]);

    expect(result.map((row) => row.id)).toEqual(['td-1', 'td-2', 'td-3']);
  });

  it('builds display labels using (<TYPE>/<URGENCY>) <text> format', () => {
    const result = getOpenThreadPanelRows([
      {
        id: 'td-1',
        text: 'Unknown force in the city',
        threadType: ThreadType.MYSTERY,
        urgency: Urgency.HIGH,
      },
    ]);

    expect(result[0]?.displayLabel).toBe('(MYSTERY/HIGH) Unknown force in the city');
  });

  it('treats unknown urgency as lowest priority', () => {
    const result = getOpenThreadPanelRows([
      { id: 'td-1', text: 'Unknown urgency', threadType: ThreadType.QUEST, urgency: 'CRITICAL' },
      { id: 'td-2', text: 'Known urgency', threadType: ThreadType.MYSTERY, urgency: Urgency.HIGH },
    ]);

    expect(result.map((row) => row.id)).toEqual(['td-2', 'td-1']);
  });

  it('limits rows to six entries in urgency order', () => {
    const result = getOpenThreadPanelRows([
      { id: 'td-1', text: 'Low 1', threadType: ThreadType.QUEST, urgency: Urgency.LOW },
      { id: 'td-2', text: 'High 1', threadType: ThreadType.MYSTERY, urgency: Urgency.HIGH },
      { id: 'td-3', text: 'Medium 1', threadType: ThreadType.QUEST, urgency: Urgency.MEDIUM },
      { id: 'td-4', text: 'Low 2', threadType: ThreadType.INFORMATION, urgency: Urgency.LOW },
      { id: 'td-5', text: 'High 2', threadType: ThreadType.DANGER, urgency: Urgency.HIGH },
      { id: 'td-6', text: 'Medium 2', threadType: ThreadType.MORAL, urgency: Urgency.MEDIUM },
      { id: 'td-7', text: 'Low 3', threadType: ThreadType.RESOURCE, urgency: Urgency.LOW },
    ]);

    expect(result.map((row) => row.id)).toEqual(['td-2', 'td-5', 'td-3', 'td-6', 'td-1', 'td-4']);
  });
});

describe('getOpenThreadPanelData', () => {
  it('returns a grouped overflow summary for hidden rows', () => {
    const result = getOpenThreadPanelData([
      { id: 'td-1', text: 'High 1', threadType: ThreadType.DANGER, urgency: Urgency.HIGH },
      { id: 'td-2', text: 'High 2', threadType: ThreadType.QUEST, urgency: Urgency.HIGH },
      { id: 'td-3', text: 'High 3', threadType: ThreadType.MYSTERY, urgency: Urgency.HIGH },
      { id: 'td-4', text: 'High 4', threadType: ThreadType.MORAL, urgency: Urgency.HIGH },
      { id: 'td-5', text: 'Medium 1', threadType: ThreadType.INFORMATION, urgency: Urgency.MEDIUM },
      { id: 'td-6', text: 'Medium 2', threadType: ThreadType.RESOURCE, urgency: Urgency.MEDIUM },
      {
        id: 'td-7',
        text: 'Medium 3',
        threadType: ThreadType.RELATIONSHIP,
        urgency: Urgency.MEDIUM,
      },
      { id: 'td-8', text: 'Low 1', threadType: ThreadType.QUEST, urgency: Urgency.LOW },
      { id: 'td-9', text: 'Low 2', threadType: ThreadType.QUEST, urgency: Urgency.LOW },
      { id: 'td-10', text: 'Low 3', threadType: ThreadType.QUEST, urgency: Urgency.LOW },
    ]);

    expect(result.rows.map((row) => row.id)).toEqual([
      'td-1',
      'td-2',
      'td-3',
      'td-4',
      'td-5',
      'td-6',
    ]);
    expect(result.overflowSummary).toBe('Not shown: 1 (medium), 3 (low)');
  });

  it('returns null overflow summary when all rows fit', () => {
    const result = getOpenThreadPanelData([
      { id: 'td-1', text: 'High', threadType: ThreadType.DANGER, urgency: Urgency.HIGH },
      { id: 'td-2', text: 'Low', threadType: ThreadType.QUEST, urgency: Urgency.LOW },
    ]);

    expect(result.rows).toHaveLength(2);
    expect(result.overflowSummary).toBeNull();
  });
});

describe('getKeyedEntryPanelData', () => {
  it('returns all entries when count <= 6', () => {
    const entries = [
      { id: 'at-1', text: 'Threat one' },
      { id: 'at-2', text: 'Threat two' },
      { id: 'at-3', text: 'Threat three' },
    ];

    const result = getKeyedEntryPanelData(entries);

    expect(result.rows).toHaveLength(3);
    expect(result.rows.map((r) => r.id)).toEqual(['at-1', 'at-2', 'at-3']);
    expect(result.overflowSummary).toBeNull();
  });

  it('limits to 6 entries when count > 6', () => {
    const entries = Array.from({ length: 9 }, (_, i) => ({
      id: `at-${i + 1}`,
      text: `Threat ${i + 1}`,
    }));

    const result = getKeyedEntryPanelData(entries);

    expect(result.rows).toHaveLength(6);
    expect(result.rows.map((r) => r.id)).toEqual(['at-1', 'at-2', 'at-3', 'at-4', 'at-5', 'at-6']);
  });

  it('returns correct overflow summary format', () => {
    const entries = Array.from({ length: 10 }, (_, i) => ({
      id: `cn-${i + 1}`,
      text: `Constraint ${i + 1}`,
    }));

    const result = getKeyedEntryPanelData(entries);

    expect(result.overflowSummary).toBe('+4 more not shown');
  });

  it('returns null overflow summary when all fit', () => {
    const entries = [
      { id: 'at-1', text: 'One' },
      { id: 'at-2', text: 'Two' },
    ];

    const result = getKeyedEntryPanelData(entries);

    expect(result.overflowSummary).toBeNull();
  });

  it('handles empty array', () => {
    const result = getKeyedEntryPanelData([]);

    expect(result.rows).toHaveLength(0);
    expect(result.overflowSummary).toBeNull();
  });

  it('preserves entry order (no sorting)', () => {
    const entries = [
      { id: 'at-3', text: 'Third' },
      { id: 'at-1', text: 'First' },
      { id: 'at-2', text: 'Second' },
    ];

    const result = getKeyedEntryPanelData(entries);

    expect(result.rows.map((r) => r.text)).toEqual(['Third', 'First', 'Second']);
  });

  it('returns exactly 6 entries at the boundary', () => {
    const entries = Array.from({ length: 6 }, (_, i) => ({
      id: `at-${i + 1}`,
      text: `Entry ${i + 1}`,
    }));

    const result = getKeyedEntryPanelData(entries);

    expect(result.rows).toHaveLength(6);
    expect(result.overflowSummary).toBeNull();
  });

  it('returns overflow summary for exactly 7 entries', () => {
    const entries = Array.from({ length: 7 }, (_, i) => ({
      id: `at-${i + 1}`,
      text: `Entry ${i + 1}`,
    }));

    const result = getKeyedEntryPanelData(entries);

    expect(result.rows).toHaveLength(6);
    expect(result.overflowSummary).toBe('+1 more not shown');
  });
});

describe('getTrackedPromisesPanelData', () => {
  it('sorts by urgency HIGH first, then MEDIUM, then LOW', () => {
    const result = getTrackedPromisesPanelData([
      {
        id: 'pr-1',
        description: 'A low-priority clue',
        promiseType: PromiseType.FORESHADOWING,
        suggestedUrgency: Urgency.LOW,
        age: 1,
      },
      {
        id: 'pr-2',
        description: 'A mysterious sword',
        promiseType: PromiseType.CHEKHOV_GUN,
        suggestedUrgency: Urgency.HIGH,
        age: 3,
      },
      {
        id: 'pr-3',
        description: 'An unsettling silence',
        promiseType: PromiseType.DRAMATIC_IRONY,
        suggestedUrgency: Urgency.MEDIUM,
        age: 0,
      },
    ]);

    expect(result.rows.map((r) => r.id)).toEqual(['pr-2', 'pr-3', 'pr-1']);
  });

  it('limits to 6 entries by default', () => {
    const promises = Array.from({ length: 9 }, (_, i) => ({
      id: `pr-${i + 1}`,
      description: `Promise ${i + 1}`,
      promiseType: PromiseType.FORESHADOWING,
      suggestedUrgency: Urgency.MEDIUM,
      age: i,
    }));

    const result = getTrackedPromisesPanelData(promises);

    expect(result.rows).toHaveLength(6);
  });

  it('returns proper overflow summary for hidden entries', () => {
    const promises = [
      {
        id: 'pr-1',
        description: 'High 1',
        promiseType: PromiseType.CHEKHOV_GUN,
        suggestedUrgency: Urgency.HIGH,
        age: 0,
      },
      {
        id: 'pr-2',
        description: 'High 2',
        promiseType: PromiseType.CHEKHOV_GUN,
        suggestedUrgency: Urgency.HIGH,
        age: 1,
      },
      {
        id: 'pr-3',
        description: 'Medium 1',
        promiseType: PromiseType.FORESHADOWING,
        suggestedUrgency: Urgency.MEDIUM,
        age: 2,
      },
      {
        id: 'pr-4',
        description: 'Medium 2',
        promiseType: PromiseType.FORESHADOWING,
        suggestedUrgency: Urgency.MEDIUM,
        age: 0,
      },
      {
        id: 'pr-5',
        description: 'Medium 3',
        promiseType: PromiseType.DRAMATIC_IRONY,
        suggestedUrgency: Urgency.MEDIUM,
        age: 1,
      },
      {
        id: 'pr-6',
        description: 'Medium 4',
        promiseType: PromiseType.SETUP_PAYOFF,
        suggestedUrgency: Urgency.MEDIUM,
        age: 3,
      },
      {
        id: 'pr-7',
        description: 'Medium 5',
        promiseType: PromiseType.FORESHADOWING,
        suggestedUrgency: Urgency.MEDIUM,
        age: 0,
      },
      {
        id: 'pr-8',
        description: 'Low 1',
        promiseType: PromiseType.UNRESOLVED_EMOTION,
        suggestedUrgency: Urgency.LOW,
        age: 4,
      },
    ];

    const result = getTrackedPromisesPanelData(promises);

    expect(result.rows).toHaveLength(6);
    expect(result.overflowSummary).toBe('Not shown: 1 (medium), 1 (low)');
  });

  it('handles empty array', () => {
    const result = getTrackedPromisesPanelData([]);

    expect(result.rows).toHaveLength(0);
    expect(result.overflowSummary).toBeNull();
  });

  it('builds correct displayLabel format', () => {
    const result = getTrackedPromisesPanelData([
      {
        id: 'pr-1',
        description: 'A mysterious sword',
        promiseType: PromiseType.CHEKHOV_GUN,
        suggestedUrgency: Urgency.HIGH,
        age: 3,
      },
    ]);

    expect(result.rows[0]?.displayLabel).toBe('(CHEKHOV_GUN/HIGH) A mysterious sword');
  });

  it('maps description to text field in rows', () => {
    const result = getTrackedPromisesPanelData([
      {
        id: 'pr-1',
        description: 'The locked door was emphasized',
        promiseType: PromiseType.SETUP_PAYOFF,
        suggestedUrgency: Urgency.MEDIUM,
        age: 2,
      },
    ]);

    expect(result.rows[0]?.text).toBe('The locked door was emphasized');
  });
});

describe('getNpcRelationshipPanelData', () => {
  it('returns empty rows for empty relationships', () => {
    const result = getNpcRelationshipPanelData({});

    expect(result.rows).toHaveLength(0);
  });

  it('returns a single NPC row with computed valencePercent', () => {
    const result = getNpcRelationshipPanelData({
      Mira: {
        npcName: 'Mira',
        valence: 2,
        dynamic: 'ally',
        history: 'They fought together.',
        currentTension: 'Mira suspects betrayal.',
        leverage: 'Knows a secret.',
      },
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({
      npcName: 'Mira',
      valence: 2,
      dynamic: 'ally',
      history: 'They fought together.',
      currentTension: 'Mira suspects betrayal.',
      leverage: 'Knows a secret.',
      valencePercent: 70,
    });
  });

  it('computes valencePercent 0% for valence -5', () => {
    const result = getNpcRelationshipPanelData({
      Enemy: {
        npcName: 'Enemy',
        valence: -5,
        dynamic: 'rival',
        history: 'Sworn enemies.',
        currentTension: 'Active conflict.',
        leverage: 'None.',
      },
    });

    expect(result.rows[0]?.valencePercent).toBe(0);
  });

  it('computes valencePercent 100% for valence +5', () => {
    const result = getNpcRelationshipPanelData({
      BestFriend: {
        npcName: 'BestFriend',
        valence: 5,
        dynamic: 'protector',
        history: 'Childhood friends.',
        currentTension: 'No tension.',
        leverage: 'Mutual trust.',
      },
    });

    expect(result.rows[0]?.valencePercent).toBe(100);
  });

  it('computes valencePercent 50% for valence 0', () => {
    const result = getNpcRelationshipPanelData({
      Neutral: {
        npcName: 'Neutral',
        valence: 0,
        dynamic: 'acquaintance',
        history: 'Just met.',
        currentTension: 'Mild unease.',
        leverage: 'Unknown.',
      },
    });

    expect(result.rows[0]?.valencePercent).toBe(50);
  });

  it('returns correct count for multiple NPCs', () => {
    const result = getNpcRelationshipPanelData({
      Alpha: {
        npcName: 'Alpha',
        valence: 3,
        dynamic: 'mentor',
        history: 'Trained the protagonist.',
        currentTension: 'Disappointed.',
        leverage: 'Political connections.',
      },
      Beta: {
        npcName: 'Beta',
        valence: -2,
        dynamic: 'rival',
        history: 'Competing for the same goal.',
        currentTension: 'Escalating hostility.',
        leverage: 'Knows a weakness.',
      },
      Gamma: {
        npcName: 'Gamma',
        valence: 0,
        dynamic: 'dependency',
        history: 'Owed a debt.',
        currentTension: 'Debt is overdue.',
        leverage: 'Holds the contract.',
      },
    });

    expect(result.rows).toHaveLength(3);
    expect(result.rows.map((r) => r.npcName)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });
});
