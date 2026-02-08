import { getActDisplayInfo } from '@/server/utils/view-helpers';
import {
  createPage,
  createChoice,
  createStory,
  createEmptyAccumulatedStructureState,
  parseStructureVersionId,
} from '@/models';
import type { Story, Page, VersionedStoryStructure, StoryStructure, StructureVersionId } from '@/models';

function createTestStructure(acts: Array<{ id: string; name: string }>): StoryStructure {
  return {
    acts: acts.map(act => ({
      id: act.id,
      name: act.name,
      objective: 'Test objective',
      stakes: 'Test stakes',
      entryCondition: 'Test entry',
      beats: [],
    })),
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
        displayString: 'Act 1: The Beginning',
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
        displayString: 'Act 2: The Middle',
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
        displayString: 'Act 2: Another Custom',
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
  });
});
