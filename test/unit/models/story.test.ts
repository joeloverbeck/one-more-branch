import { isStoryId } from '@/models/id';
import { createStory, isStory, updateStoryArc, updateStoryCanon } from '@/models/story';

describe('Story', () => {
  describe('createStory', () => {
    it('creates story with required title and characterConcept', () => {
      const story = createStory({ title: 'The Knights Quest', characterConcept: 'A brave knight seeking adventure' });

      expect(isStoryId(story.id)).toBe(true);
      expect(story.title).toBe('The Knights Quest');
      expect(story.characterConcept).toBe('A brave knight seeking adventure');
      expect(story.worldbuilding).toBe('');
      expect(story.tone).toBe('fantasy adventure');
      expect(story.globalCanon).toEqual([]);
      expect(story.storyArc).toBeNull();
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
      expect(() => createStory({ title: '', characterConcept: 'Hero' })).toThrow('Title is required');
    });

    it("throws 'Title is required' for whitespace-only string", () => {
      expect(() => createStory({ title: '   ', characterConcept: 'Hero' })).toThrow('Title is required');
    });

    it("throws 'Character concept is required' for empty string", () => {
      expect(() => createStory({ title: 'Test', characterConcept: '' })).toThrow('Character concept is required');
    });

    it("throws 'Character concept is required' for whitespace-only string", () => {
      expect(() => createStory({ title: 'Test', characterConcept: '   ' })).toThrow('Character concept is required');
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

  describe('updateStoryArc', () => {
    it('updates storyArc to trimmed value', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      const updated = updateStoryArc(story, '  Defeat the dragon king  ');

      expect(updated.storyArc).toBe('Defeat the dragon king');
    });

    it('updates updatedAt timestamp', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      const updated = updateStoryArc(story, 'Defeat the dragon king');

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(story.updatedAt.getTime());
    });

    it('does not mutate original story', () => {
      const story = createStory({ title: 'Test', characterConcept: 'Hero' });
      const updated = updateStoryArc(story, 'Arc');

      expect(story.storyArc).toBeNull();
      expect(updated).not.toBe(story);
    });
  });
});
