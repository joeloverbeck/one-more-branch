import type {
  GenerationStageCallback,
  GenerationStageEvent,
  GenerationStageStatus,
  GenerationStage,
  MakeChoiceOptions,
  MakeChoiceResult,
  PlaySession,
  StartStoryOptions,
  StartStoryResult,
} from '../../../src/engine/types';
import { EngineError, GENERATION_STAGES } from '../../../src/engine/types';
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

    it('supports reconciliation hard-failure engine code', () => {
      const error = new EngineError('reconciliation failed', 'GENERATION_RECONCILIATION_FAILED');

      expect(error.code).toBe('GENERATION_RECONCILIATION_FAILED');
    });
  });

  describe('type compatibility (compile-time)', () => {
    it('defines shared generation stage IDs exactly once and in order', () => {
      const expectedStages: GenerationStage[] = [
        'PLANNING_PAGE',
        'CURATING_CONTEXT',
        'WRITING_OPENING_PAGE',
        'WRITING_CONTINUING_PAGE',
        'ANALYZING_SCENE',
        'RESOLVING_AGENDAS',
        'RESTRUCTURING_STORY',
      ];

      expect(GENERATION_STAGES).toEqual(expectedStages);
    });

    it('supports generation stage callback contracts', () => {
      const status: GenerationStageStatus = 'started';
      const event: GenerationStageEvent = {
        stage: 'PLANNING_PAGE',
        status,
        attempt: 1,
      };
      const callback: GenerationStageCallback = jest.fn();

      callback(event);

      expect(event.stage).toBe('PLANNING_PAGE');
      expect(event.attempt).toBe(1);
      expect(callback).toHaveBeenCalledWith(event);
    });

    it('supports StartStoryResult and MakeChoiceResult', () => {
      const story = createStory({
        title: 'Apprentice Tale',
        characterConcept: 'A curious apprentice',
      });
      const page = createPage({
        id: parsePageId(1),
        narrativeText: 'The tower door creaks open.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [],
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
