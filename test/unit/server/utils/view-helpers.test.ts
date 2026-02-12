import { getActDisplayInfo, getOpenThreadPanelData, getOpenThreadPanelRows } from '@/server/utils/view-helpers';
import {
  createPage,
  createChoice,
  createStory,
  createEmptyAccumulatedStructureState,
  parseStructureVersionId,
  ThreadType,
  Urgency,
} from '@/models';
import type { Story, Page, VersionedStoryStructure, StoryStructure, StructureVersionId } from '@/models';

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
  structure: StoryStructure,
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
      });
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

    it('returns null when currentActIndex is out of bounds', () => {
      const structure = createTestStructure([{ id: 'act-1', name: 'Only Act' }]);
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
          currentActIndex: 5, // Out of bounds
        },
      };

      const result = getActDisplayInfo(story, page);

      expect(result).toBeNull();
    });

    it('returns null when currentBeatIndex is out of bounds', () => {
      const structure = createTestStructure([{ id: 'act-1', name: 'Only Act' }]);
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
      { id: 'td-1', text: 'Low urgency thread', threadType: ThreadType.INFORMATION, urgency: Urgency.LOW },
      { id: 'td-2', text: 'High urgency thread', threadType: ThreadType.MYSTERY, urgency: Urgency.HIGH },
      { id: 'td-3', text: 'Medium urgency thread', threadType: ThreadType.QUEST, urgency: Urgency.MEDIUM },
    ]);

    expect(result.map(row => row.id)).toEqual(['td-2', 'td-3', 'td-1']);
  });

  it('preserves source order for matching urgencies', () => {
    const result = getOpenThreadPanelRows([
      { id: 'td-1', text: 'First', threadType: ThreadType.INFORMATION, urgency: Urgency.MEDIUM },
      { id: 'td-2', text: 'Second', threadType: ThreadType.QUEST, urgency: Urgency.MEDIUM },
      { id: 'td-3', text: 'Third', threadType: ThreadType.MORAL, urgency: Urgency.MEDIUM },
    ]);

    expect(result.map(row => row.id)).toEqual(['td-1', 'td-2', 'td-3']);
  });

  it('builds display labels using (<TYPE>/<URGENCY>) <text> format', () => {
    const result = getOpenThreadPanelRows([
      { id: 'td-1', text: 'Unknown force in the city', threadType: ThreadType.MYSTERY, urgency: Urgency.HIGH },
    ]);

    expect(result[0]?.displayLabel).toBe('(MYSTERY/HIGH) Unknown force in the city');
  });

  it('treats unknown urgency as lowest priority', () => {
    const result = getOpenThreadPanelRows([
      { id: 'td-1', text: 'Unknown urgency', threadType: ThreadType.QUEST, urgency: 'CRITICAL' },
      { id: 'td-2', text: 'Known urgency', threadType: ThreadType.MYSTERY, urgency: Urgency.HIGH },
    ]);

    expect(result.map(row => row.id)).toEqual(['td-2', 'td-1']);
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

    expect(result.map(row => row.id)).toEqual(['td-2', 'td-5', 'td-3', 'td-6', 'td-1', 'td-4']);
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
      { id: 'td-7', text: 'Medium 3', threadType: ThreadType.RELATIONSHIP, urgency: Urgency.MEDIUM },
      { id: 'td-8', text: 'Low 1', threadType: ThreadType.QUEST, urgency: Urgency.LOW },
      { id: 'td-9', text: 'Low 2', threadType: ThreadType.QUEST, urgency: Urgency.LOW },
      { id: 'td-10', text: 'Low 3', threadType: ThreadType.QUEST, urgency: Urgency.LOW },
    ]);

    expect(result.rows.map(row => row.id)).toEqual(['td-1', 'td-2', 'td-3', 'td-4', 'td-5', 'td-6']);
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
