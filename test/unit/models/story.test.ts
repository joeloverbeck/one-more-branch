import { isStoryId } from '@/models/id';
import type { ConceptSpec } from '@/models/concept-generator';
import { StoryStructure } from '@/models/story-arc';
import { createInitialVersionedStructure } from '@/models/structure-version';
import {
  addStructureVersion,
  createStory,
  getLatestStructureVersion,
  getStructureVersion,
  isStory,
  isStoryStructure,
  updateStoryCanon,
  updateStoryStructure,
} from '@/models/story';
import { createConceptSpecFixture } from '../../fixtures/concept-generator';

function createTestStructure(): StoryStructure {
  return {
    acts: [
      {
        id: '1',
        name: 'Act 1',
        objective: 'Find the clue',
        stakes: 'Lose the trail forever',
        entryCondition: 'Hero accepts the quest',
        beats: [
          {
            id: '1.1',
            description: 'The hero learns about the threat',
            objective: 'Understand the danger',
          },
        ],
      },
      {
        id: '2',
        name: 'Act 2',
        objective: 'Confront the enemy',
        stakes: 'Allies are at risk',
        entryCondition: 'Trail leads to enemy base',
        beats: [
          {
            id: '2.1',
            description: 'The hero infiltrates the fortress',
            objective: 'Reach the inner chamber',
          },
        ],
      },
      {
        id: '3',
        name: 'Act 3',
        objective: 'Resolve the conflict',
        stakes: 'The world falls into chaos',
        entryCondition: 'Enemy launches final ritual',
        beats: [
          {
            id: '3.1',
            description: 'Final confrontation begins',
            objective: 'Stop the ritual',
          },
        ],
      },
    ],
    overallTheme: 'Hope against overwhelming odds',
    generatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function createTestConceptSpec(): ConceptSpec {
  return createConceptSpecFixture(1);
}

describe('Story', () => {
  describe('createStory', () => {
    it('creates story with required title and characterConcept', () => {
      const story = createStory({
        title: 'The Knights Quest',
        characterConcept: 'A brave knight seeking adventure',
      });

      expect(isStoryId(story.id)).toBe(true);
      expect(story.title).toBe('The Knights Quest');
      expect(story.characterConcept).toBe('A brave knight seeking adventure');
      expect(story.worldbuilding).toBe('');
      expect(story.tone).toBe('fantasy adventure');
      expect(story.globalCanon).toEqual([]);
      expect(story.structure).toBeNull();
      expect(story.structureVersions).toEqual([]);
    });

    it('creates story with all fields provided', () => {
      const story = createStory({
        title: 'Dungeon Crawl',
        characterConcept: 'A cunning rogue',
        worldbuilding: 'A world of endless dungeons',
        tone: 'dark and mysterious',
      });

      expect(story.title).toBe('Dungeon Crawl');
      expect(story.characterConcept).toBe('A cunning rogue');
      expect(story.worldbuilding).toBe('A world of endless dungeons');
      expect(story.tone).toBe('dark and mysterious');
    });

    it('creates story with npcs when provided', () => {
      const story = createStory({
        title: 'Test',
        characterConcept: 'A brave knight',
        npcs: [
          { name: 'Gandalf', description: 'A wise wizard' },
          { name: 'Frodo', description: 'A brave hobbit' },
        ],
      });

      expect(story.npcs).toEqual([
        { name: 'Gandalf', description: 'A wise wizard' },
        { name: 'Frodo', description: 'A brave hobbit' },
      ]);
    });

    it('creates story with startingSituation when provided', () => {
      const story = createStory({
        title: 'Test',
        characterConcept: 'A brave knight',
        startingSituation: 'You wake up in a dungeon cell',
      });

      expect(story.startingSituation).toBe('You wake up in a dungeon cell');
    });

    it('filters out npcs with empty name or description', () => {
      const story = createStory({
        title: 'Test',
        characterConcept: 'A brave knight',
        npcs: [
          { name: 'Gandalf', description: 'A wizard' },
          { name: '', description: 'No name' },
          { name: 'Frodo', description: '' },
        ],
        startingSituation: '  Dungeon cell  ',
      });

      expect(story.npcs).toEqual([{ name: 'Gandalf', description: 'A wizard' }]);
      expect(story.startingSituation).toBe('Dungeon cell');
    });

    it('sets npcs to undefined when empty array', () => {
      const story = createStory({
        title: 'Test',
        characterConcept: 'A brave knight',
        npcs: [],
      });

      expect(story.npcs).toBeUndefined();
    });

    it('sets startingSituation to undefined when empty string', () => {
      const story = createStory({
        title: 'Test',
        characterConcept: 'A brave knight',
        startingSituation: '',
      });

      expect(story.startingSituation).toBeUndefined();
    });

    it('sets npcs to undefined when all entries have empty names', () => {
      const story = createStory({
        title: 'Test',
        characterConcept: 'A brave knight',
        npcs: [
          { name: '   ', description: 'A wizard' },
          { name: '', description: 'A hobbit' },
        ],
      });

      expect(story.npcs).toBeUndefined();
    });

    it('sets startingSituation to undefined when whitespace only', () => {
      const story = createStory({
        title: 'Test',
        characterConcept: 'A brave knight',
        startingSituation: '   ',
      });

      expect(story.startingSituation).toBeUndefined();
    });

    it('trims whitespace from title, characterConcept, worldbuilding, and tone', () => {
      const story = createStory({
        title: '  Title  ',
        characterConcept: '  Hero  ',
        worldbuilding: '  World  ',
        tone: '  Tone  ',
      });

      expect(story.title).toBe('Title');
      expect(story.characterConcept).toBe('Hero');
      expect(story.worldbuilding).toBe('World');
      expect(story.tone).toBe('Tone');
    });

    it("throws 'Title is required' for empty string", () => {
      expect(() => createStory({ title: '', characterConcept: 'Hero' })).toThrow(
        'Title is required'
      );
    });

    it("throws 'Title is required' for whitespace-only string", () => {
      expect(() => createStory({ title: '   ', characterConcept: 'Hero' })).toThrow(
        'Title is required'
      );
    });

    it("throws 'Character concept is required' for empty string", () => {
      expect(() => createStory({ title: 'Test', characterConcept: '' })).toThrow(
        'Character concept is required'
      );
    });

    it("throws 'Character concept is required' for whitespace-only string", () => {
      expect(() => createStory({ title: 'Test', characterConcept: '   ' })).toThrow(
        'Character concept is required'
      );
    });

    it('sets createdAt and updatedAt to current time and equal initially', () => {
      const before = new Date();
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      const after = new Date();

      expect(story.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(story.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(story.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(story.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(story.createdAt.getTime()).toBe(story.updatedAt.getTime());
    });

    it('stores conceptSpec when provided', () => {
      const conceptSpec = createTestConceptSpec();
      const story = createStory({
        title: 'Concept Story',
        characterConcept: 'A protagonist with enough detail',
        conceptSpec,
      });

      expect(story.conceptSpec).toEqual(conceptSpec);
    });
  });

  describe('isStory', () => {
    it('returns true for valid Story object', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      expect(isStory(story)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isStory(null)).toBe(false);
    });

    it('returns false for empty object', () => {
      expect(isStory({})).toBe(false);
    });

    it('returns false for object with invalid id', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      expect(isStory({ ...story, id: 'not-uuid' })).toBe(false);
    });

    it('returns false when title is whitespace only', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      expect(isStory({ ...story, title: '   ' })).toBe(false);
    });

    it('returns false when characterConcept is whitespace only', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      expect(isStory({ ...story, characterConcept: '   ' })).toBe(false);
    });

    it('returns true for story with valid structure object', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      expect(isStory({ ...story, structure: createTestStructure() })).toBe(true);
    });

    it('returns false when structure has invalid shape', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      expect(
        isStory({
          ...story,
          structure: { acts: [], overallTheme: 'A', generatedAt: 'not a date' },
        })
      ).toBe(false);
    });

    it('returns false when structureVersions contains invalid entries', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      expect(isStory({ ...story, structureVersions: ['not-a-version'] })).toBe(false);
    });

    it('returns true when optional conceptSpec is valid', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      expect(isStory({ ...story, conceptSpec: createTestConceptSpec() })).toBe(true);
    });

    it('returns false when optional conceptSpec is invalid', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      expect(isStory({ ...story, conceptSpec: { oneLineHook: 'bad' } })).toBe(false);
    });
  });

  describe('updateStoryCanon', () => {
    it('updates globalCanon to new value', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      const updated = updateStoryCanon(story, ['New fact']);

      expect(updated.globalCanon).toEqual(['New fact']);
    });

    it('updates updatedAt timestamp', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      const updated = updateStoryCanon(story, ['New fact']);

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(story.updatedAt.getTime());
    });

    it('does not mutate original story', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      const updated = updateStoryCanon(story, ['New fact']);

      expect(story.globalCanon).toEqual([]);
      expect(updated).not.toBe(story);
    });
  });

  describe('updateStoryStructure', () => {
    it('creates initial structure version when no versions exist', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      const structure = createTestStructure();
      const updated = updateStoryStructure(story, structure);

      expect(updated.structure).toBe(structure);
      expect(updated.structureVersions).toHaveLength(1);
      expect(updated.structureVersions?.[0]?.structure).toBe(structure);
      expect(updated.structureVersions?.[0]?.previousVersionId).toBeNull();
    });

    it('updates updatedAt timestamp', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      const updated = updateStoryStructure(story, createTestStructure());

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(story.updatedAt.getTime());
    });

    it('does not append a new version when versions already exist', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      const firstStructure = createTestStructure();
      const firstUpdated = updateStoryStructure(story, firstStructure);
      const secondStructure = {
        ...createTestStructure(),
        overallTheme: 'A changed theme',
      };
      const secondUpdated = updateStoryStructure(firstUpdated, secondStructure);

      expect(firstUpdated.structureVersions).toHaveLength(1);
      expect(secondUpdated.structureVersions).toHaveLength(1);
      expect(secondUpdated.structure).toEqual(secondStructure);
    });

    it('does not mutate original story', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      const updated = updateStoryStructure(story, createTestStructure());

      expect(story.structure).toBeNull();
      expect(updated).not.toBe(story);
    });
  });

  describe('getLatestStructureVersion', () => {
    it('returns null for empty structureVersions', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });

      expect(getLatestStructureVersion(story)).toBeNull();
    });

    it('returns last version in array', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      const firstVersion = createInitialVersionedStructure(createTestStructure());
      const secondVersion = createInitialVersionedStructure({
        ...createTestStructure(),
        overallTheme: 'Second',
      });

      const withFirst = addStructureVersion(story, firstVersion);
      const withSecond = addStructureVersion(withFirst, secondVersion);

      expect(getLatestStructureVersion(withSecond)).toBe(secondVersion);
    });
  });

  describe('getStructureVersion', () => {
    it('returns null when version not found', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      const version = createInitialVersionedStructure(createTestStructure());
      const updated = addStructureVersion(story, version);

      expect(getStructureVersion(updated, 'sv-1234567890123-abcd' as typeof version.id)).toBeNull();
    });

    it('returns matching version by ID', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      const version = createInitialVersionedStructure(createTestStructure());
      const updated = addStructureVersion(story, version);

      expect(getStructureVersion(updated, version.id)).toBe(version);
    });
  });

  describe('addStructureVersion', () => {
    it('appends version to structureVersions', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      const version = createInitialVersionedStructure(createTestStructure());
      const updated = addStructureVersion(story, version);

      expect(updated.structureVersions).toHaveLength(1);
      expect(updated.structureVersions?.[0]).toBe(version);
    });

    it('updates structure field to new version structure', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      const version = createInitialVersionedStructure(createTestStructure());
      const updated = addStructureVersion(story, version);

      expect(updated.structure).toBe(version.structure);
    });

    it('updates updatedAt timestamp', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      const version = createInitialVersionedStructure(createTestStructure());
      const updated = addStructureVersion(story, version);

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(story.updatedAt.getTime());
    });

    it('returns new story object (immutability)', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      const version = createInitialVersionedStructure(createTestStructure());
      const updated = addStructureVersion(story, version);

      expect(updated).not.toBe(story);
      expect(story.structure).toBeNull();
      expect(story.structureVersions).toEqual([]);
    });
  });

  describe('isStoryStructure', () => {
    it('returns true for a valid structure', () => {
      expect(isStoryStructure(createTestStructure())).toBe(true);
    });

    it('returns false for null', () => {
      expect(isStoryStructure(null)).toBe(false);
    });

    it('returns false when required fields are missing', () => {
      expect(isStoryStructure({ acts: [] })).toBe(false);
    });

    it('returns false when required fields have wrong types', () => {
      expect(
        isStoryStructure({
          acts: {},
          overallTheme: 42,
          generatedAt: '2026-01-01',
        })
      ).toBe(false);
    });
  });
});
