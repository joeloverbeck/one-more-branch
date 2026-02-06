import type {
  MakeChoiceOptions,
  MakeChoiceResult,
  PlaySession,
  StartStoryOptions,
  StartStoryResult,
} from '../../../src/engine/types';
import { EngineError } from '../../../src/engine/types';
import { createPage, createStory, parsePageId, parseStoryId } from '../../../src/models';

describe('Engine types', () => {
  describe('EngineError', () => {
    it('creates an Error with expected properties', () => {
      const error = new EngineError('msg', 'STORY_NOT_FOUND');

      expect(error.name).toBe('EngineError');
      expect(error.message).toBe('msg');
      expect(error.code).toBe('STORY_NOT_FOUND');
      expect(error).toBeInstanceOf(Error);
    });

    it('preserves Error prototype behavior', () => {
      const error = new EngineError('failure', 'VALIDATION_FAILED');

      expect(error.stack).toBeDefined();
    });
  });

  describe('type compatibility (compile-time)', () => {
    it('supports StartStoryResult and MakeChoiceResult', () => {
      const story = createStory({ title: 'Apprentice Tale', characterConcept: 'A curious apprentice' });
      const page = createPage({
        id: parsePageId(1),
        narrativeText: 'The tower door creaks open.',
        choices: [],
        stateChanges: { added: [], removed: [] },
        isEnding: true,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      const startResult: StartStoryResult = { story, page };
      const makeChoiceResult: MakeChoiceResult = { page, wasGenerated: true };

      expect(startResult.page.id).toBe(1);
      expect(makeChoiceResult.wasGenerated).toBe(true);
    });

    it('supports PlaySession and option types with branded ids', () => {
      const storyId = parseStoryId('550e8400-e29b-41d4-a716-446655440000');
      const pageId = parsePageId(2);

      const session: PlaySession = {
        storyId,
        currentPageId: pageId,
        apiKey: 'test-key',
      };
      const startOptions: StartStoryOptions = {
        characterConcept: 'A runaway prince',
        worldbuilding: 'A flooded kingdom',
        tone: 'hopeful mystery',
        apiKey: 'test-key',
      };
      const makeChoiceOptions: MakeChoiceOptions = {
        storyId,
        pageId,
        choiceIndex: 1,
        apiKey: 'test-key',
      };

      expect(session.storyId).toBe(storyId);
      expect(startOptions.characterConcept).toContain('prince');
      expect(makeChoiceOptions.pageId).toBe(pageId);
    });
  });
});
