import {
  createChoice,
  createPage,
  createRewrittenVersionedStructure,
  createStory,
  parsePageId,
  Story,
  StructureVersionId,
  updateStoryStructure,
} from '@/models';
import type { StoryStructure } from '@/models/story-arc';
import {
  validateFirstPageStructureVersion,
  validateContinuationStructureVersion,
  resolveActiveStructureVersion,
} from '@/engine/structure-version-validator';
import { EngineError } from '@/engine/types';

function createTestStructure(): StoryStructure {
  return {
    theme: 'Test Theme',
    acts: [
      {
        title: 'Act 1',
        beats: [{ id: '1.1', description: 'Opening', objective: 'Start' }],
      },
      {
        title: 'Act 2',
        beats: [{ id: '2.1', description: 'Rising', objective: 'Build' }],
      },
      {
        title: 'Act 3',
        beats: [{ id: '3.1', description: 'Resolution', objective: 'End' }],
      },
    ],
  };
}

function createTestStoryWithStructure(): Story {
  const baseStory = createStory({
    title: 'Test Story',
    characterConcept: 'Test character',
    worldbuilding: 'Test world',
    tone: 'Test tone',
  });
  return updateStoryStructure(baseStory, createTestStructure());
}

function createTestStoryWithoutStructure(): Story {
  return createStory({
    title: 'Test Story',
    characterConcept: 'Test character',
    worldbuilding: 'Test world',
    tone: 'Test tone',
  });
}

describe('structure-version-validator', () => {
  describe('validateFirstPageStructureVersion', () => {
    it('does not throw for story without structure', () => {
      const story = createTestStoryWithoutStructure();

      expect(() => validateFirstPageStructureVersion(story)).not.toThrow();
    });

    it('does not throw for story with structure and valid version', () => {
      const story = createTestStoryWithStructure();

      expect(() => validateFirstPageStructureVersion(story)).not.toThrow();
    });

    it('throws EngineError when story has structure but no versions', () => {
      const story = createTestStoryWithStructure();
      // Remove all structure versions
      const storyWithNoVersions: Story = {
        ...story,
        structureVersions: [],
      };

      expect(() => validateFirstPageStructureVersion(storyWithNoVersions)).toThrow(EngineError);
      expect(() => validateFirstPageStructureVersion(storyWithNoVersions)).toThrow(
        'Story has structure but no structure versions',
      );
    });
  });

  describe('validateContinuationStructureVersion', () => {
    it('does not throw for story without structure', () => {
      const story = createTestStoryWithoutStructure();
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Test narrative',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Choice A'), createChoice('Choice B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      expect(() => validateContinuationStructureVersion(story, parentPage)).not.toThrow();
    });

    it('throws when story has structure but no versions', () => {
      const story = createTestStoryWithStructure();
      const storyWithNoVersions: Story = {
        ...story,
        structureVersions: [],
      };
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Test narrative',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Choice A'), createChoice('Choice B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      expect(() => validateContinuationStructureVersion(storyWithNoVersions, parentPage)).toThrow(
        'Story has structure but no structure versions',
      );
    });

    it('throws when parent page has null structureVersionId', () => {
      const story = createTestStoryWithStructure();
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Test narrative',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Choice A'), createChoice('Choice B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        structureVersionId: null,
      });

      expect(() => validateContinuationStructureVersion(story, parentPage)).toThrow(
        'has null structureVersionId but story has structure',
      );
    });

    it('does not throw when story has structure and parent has valid version', () => {
      const story = createTestStoryWithStructure();
      const versionId = story.structureVersions[0].id;
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Test narrative',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Choice A'), createChoice('Choice B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        structureVersionId: versionId,
      });

      expect(() => validateContinuationStructureVersion(story, parentPage)).not.toThrow();
    });
  });

  describe('resolveActiveStructureVersion', () => {
    it('returns null when parent has no structureVersionId', () => {
      const story = createTestStoryWithStructure();
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Test narrative',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Choice A'), createChoice('Choice B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        structureVersionId: null,
      });

      const result = resolveActiveStructureVersion(story, parentPage);

      expect(result).toBeNull();
    });

    it('returns matching version when parent has valid structureVersionId', () => {
      const story = createTestStoryWithStructure();
      const expectedVersion = story.structureVersions[0];
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Test narrative',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Choice A'), createChoice('Choice B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        structureVersionId: expectedVersion.id,
      });

      const result = resolveActiveStructureVersion(story, parentPage);

      expect(result).toBe(expectedVersion);
    });

    it('returns latest version as fallback when parent version not found', () => {
      const story = createTestStoryWithStructure();
      const latestVersion = story.structureVersions[0];
      const nonExistentVersionId = 'sv-99999-nonexistent' as StructureVersionId;
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Test narrative',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Choice A'), createChoice('Choice B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        structureVersionId: nonExistentVersionId,
      });

      const result = resolveActiveStructureVersion(story, parentPage);

      expect(result).toBe(latestVersion);
    });

    it('returns correct version in multi-version story', () => {
      const story = createTestStoryWithStructure();
      const firstVersionId = story.structureVersions[0].id;

      // Add a second version
      const firstVersion = story.structureVersions[0];
      const secondVersion = createRewrittenVersionedStructure(
        firstVersion,
        createTestStructure(),
        ['1.1', '2.1', '3.1'],
        'Test rewrite',
        parsePageId(2),
      );
      const storyWithTwoVersions: Story = {
        ...story,
        structureVersions: [...story.structureVersions, secondVersion],
      };

      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Test narrative',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Choice A'), createChoice('Choice B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        structureVersionId: firstVersionId,
      });

      const result = resolveActiveStructureVersion(storyWithTwoVersions, parentPage);

      expect(result?.id).toBe(firstVersionId);
    });
  });
});
