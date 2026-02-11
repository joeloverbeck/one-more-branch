import { createChoice, createPage, createStory, parsePageId, parseStoryId, StoryMetadata } from '../../../src/models';
import { storage } from '../../../src/persistence';
import { getOrGeneratePage } from '../../../src/engine/page-service';
import {
  deleteStory,
  getPage,
  getStartingPage,
  getStoryStats,
  listAllStories,
  loadStory,
  startNewStory,
} from '../../../src/engine/story-service';
import { StoryEngine, storyEngine } from '../../../src/engine/story-engine';

jest.mock('../../../src/persistence', () => ({
  storage: {
    init: jest.fn(),
    storyExists: jest.fn(),
    loadAllPages: jest.fn(),
  },
}));

jest.mock('../../../src/engine/story-service', () => ({
  startNewStory: jest.fn(),
  loadStory: jest.fn(),
  getPage: jest.fn(),
  getStartingPage: jest.fn(),
  listAllStories: jest.fn(),
  deleteStory: jest.fn(),
  getStoryStats: jest.fn(),
}));

jest.mock('../../../src/engine/page-service', () => ({
  getOrGeneratePage: jest.fn(),
}));

const mockedStorage = storage as {
  init: jest.Mock;
  storyExists: jest.Mock;
  loadAllPages: jest.Mock;
};

const mockedStartNewStory = startNewStory as jest.MockedFunction<typeof startNewStory>;
const mockedLoadStory = loadStory as jest.MockedFunction<typeof loadStory>;
const mockedGetPage = getPage as jest.MockedFunction<typeof getPage>;
const mockedGetStartingPage = getStartingPage as jest.MockedFunction<typeof getStartingPage>;
const mockedListAllStories = listAllStories as jest.MockedFunction<typeof listAllStories>;
const mockedDeleteStory = deleteStory as jest.MockedFunction<typeof deleteStory>;
const mockedGetStoryStats = getStoryStats as jest.MockedFunction<typeof getStoryStats>;
const mockedGetOrGeneratePage = getOrGeneratePage as jest.MockedFunction<typeof getOrGeneratePage>;

const STORY_ID = parseStoryId('550e8400-e29b-41d4-a716-446655440000');
const PAGE_1 = parsePageId(1);
const PAGE_2 = parsePageId(2);

function buildStory(): ReturnType<typeof createStory> {
  return createStory({
    title: 'Test Story',
    characterConcept: 'A detective cataloging impossible crimes in a lighthouse town',
    worldbuilding: 'The sea rewinds every midnight',
    tone: 'mysterious noir',
  });
}

function buildPage(overrides?: Partial<ReturnType<typeof createPage>>): ReturnType<typeof createPage> {
  return createPage({
    id: PAGE_1,
    narrativeText: 'Rain needles the harbor while the bell tower glows blue.',
    sceneSummary: 'Test summary of the scene events and consequences.',
    choices: [createChoice('Inspect the bell tower'), createChoice('Question the harbormaster')],
    isEnding: false,
    parentPageId: null,
    parentChoiceIndex: null,
    ...overrides,
  });
}

describe('story-engine', () => {
  let engine: StoryEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new StoryEngine();
  });

  describe('init', () => {
    it('calls storage.init', () => {
      engine.init();

      expect(mockedStorage.init).toHaveBeenCalledTimes(1);
    });

    it('exports singleton instance', () => {
      expect(storyEngine).toBeInstanceOf(StoryEngine);
    });
  });

  describe('startStory', () => {
    it('delegates to startNewStory', async () => {
      const story = buildStory();
      const page = buildPage();
      const onGenerationStage = jest.fn();
      const options = {
        characterConcept: 'A long enough concept for validation checks.',
        tone: 'tense',
        apiKey: 'test-key',
        onGenerationStage,
      };
      mockedStartNewStory.mockResolvedValue({ story, page });

      await expect(engine.startStory(options)).resolves.toEqual({ story, page });
      expect(mockedStartNewStory).toHaveBeenCalledWith(options);
    });
  });

  describe('makeChoice', () => {
    it('throws STORY_NOT_FOUND when story is missing', async () => {
      mockedLoadStory.mockResolvedValue(null);

      await expect(
        engine.makeChoice({
          storyId: STORY_ID,
          pageId: PAGE_1,
          choiceIndex: 0,
          apiKey: 'test-key',
        }),
      ).rejects.toMatchObject({ code: 'STORY_NOT_FOUND' });

      expect(mockedGetPage).not.toHaveBeenCalled();
      expect(mockedGetOrGeneratePage).not.toHaveBeenCalled();
    });

    it('throws PAGE_NOT_FOUND when current page is missing', async () => {
      const story = buildStory();
      mockedLoadStory.mockResolvedValue(story);
      mockedGetPage.mockResolvedValue(null);

      await expect(
        engine.makeChoice({
          storyId: STORY_ID,
          pageId: PAGE_1,
          choiceIndex: 0,
          apiKey: 'test-key',
        }),
      ).rejects.toMatchObject({ code: 'PAGE_NOT_FOUND' });

      expect(mockedGetOrGeneratePage).not.toHaveBeenCalled();
    });

    it('throws INVALID_CHOICE for out-of-bounds choice index', async () => {
      const story = buildStory();
      const page = buildPage();
      mockedLoadStory.mockResolvedValue(story);
      mockedGetPage.mockResolvedValue(page);

      await expect(
        engine.makeChoice({
          storyId: STORY_ID,
          pageId: PAGE_1,
          choiceIndex: 2,
          apiKey: 'test-key',
        }),
      ).rejects.toMatchObject({ code: 'INVALID_CHOICE' });

      expect(mockedGetOrGeneratePage).not.toHaveBeenCalled();
    });

    it('throws INVALID_CHOICE on ending page', async () => {
      const story = buildStory();
      const endingPage = buildPage({ isEnding: true, choices: [] });
      mockedLoadStory.mockResolvedValue(story);
      mockedGetPage.mockResolvedValue(endingPage);

      await expect(
        engine.makeChoice({
          storyId: STORY_ID,
          pageId: PAGE_1,
          choiceIndex: 0,
          apiKey: 'test-key',
        }),
      ).rejects.toMatchObject({ code: 'INVALID_CHOICE' });

      expect(mockedGetOrGeneratePage).not.toHaveBeenCalled();
    });

    it('delegates to getOrGeneratePage and returns MakeChoiceResult', async () => {
      const story = buildStory();
      const page = buildPage();
      const nextPage = buildPage({
        id: PAGE_2,
        narrativeText: 'The tower machinery churns behind rusted brass doors.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        parentPageId: PAGE_1,
        parentChoiceIndex: 0,
      });

      mockedLoadStory.mockResolvedValue(story);
      mockedGetPage.mockResolvedValue(page);
      mockedGetOrGeneratePage.mockResolvedValue({
        page: nextPage,
        story,
        wasGenerated: true,
      });

      await expect(
        engine.makeChoice({
          storyId: STORY_ID,
          pageId: PAGE_1,
          choiceIndex: 0,
          apiKey: 'test-key',
          onGenerationStage: jest.fn(),
        }),
      ).resolves.toEqual({ page: nextPage, wasGenerated: true });

      expect(mockedGetOrGeneratePage).toHaveBeenCalledWith(
        story,
        page,
        0,
        'test-key',
        expect.any(Function),
      );
    });
  });

  describe('delegation helpers', () => {
    it('delegates loadStory/getPage/getStartingPage', async () => {
      const story = buildStory();
      const page = buildPage();

      mockedLoadStory.mockResolvedValue(story);
      mockedGetPage.mockResolvedValue(page);
      mockedGetStartingPage.mockResolvedValue(page);

      await expect(engine.loadStory(STORY_ID)).resolves.toBe(story);
      await expect(engine.getPage(STORY_ID, PAGE_1)).resolves.toBe(page);
      await expect(engine.getStartingPage(STORY_ID)).resolves.toBe(page);
    });

    it('restartStory returns page 1 and throws PAGE_NOT_FOUND when missing', async () => {
      const page = buildPage();
      mockedGetStartingPage.mockResolvedValueOnce(page).mockResolvedValueOnce(null);

      await expect(engine.restartStory(STORY_ID)).resolves.toBe(page);
      await expect(engine.restartStory(STORY_ID)).rejects.toMatchObject({ code: 'PAGE_NOT_FOUND' });
    });

    it('delegates listStories/deleteStory/getStoryStats', async () => {
      const story = buildStory();
      const metadata: StoryMetadata = {
        id: story.id,
        characterConcept: story.characterConcept,
        tone: story.tone,
        createdAt: story.createdAt,
        pageCount: 3,
        hasEnding: false,
      };
      const stats = {
        pageCount: 3,
        exploredBranches: 1,
        totalBranches: 4,
        hasEnding: false,
      };

      mockedListAllStories.mockResolvedValue([metadata]);
      mockedDeleteStory.mockResolvedValue(undefined);
      mockedGetStoryStats.mockResolvedValue(stats);

      await expect(engine.listStories()).resolves.toEqual([metadata]);
      await expect(engine.deleteStory(STORY_ID)).resolves.toBeUndefined();
      await expect(engine.getStoryStats(STORY_ID)).resolves.toEqual(stats);
    });

    it('storyExists delegates to storage', async () => {
      mockedStorage.storyExists.mockResolvedValue(true);

      await expect(engine.storyExists(STORY_ID)).resolves.toBe(true);
      expect(mockedStorage.storyExists).toHaveBeenCalledWith(STORY_ID);
    });

    it('getFullStory returns null when story is missing', async () => {
      mockedLoadStory.mockResolvedValue(null);

      await expect(engine.getFullStory(STORY_ID)).resolves.toBeNull();
      expect(mockedStorage.loadAllPages).not.toHaveBeenCalled();
    });

    it('getFullStory returns story and pages when present', async () => {
      const story = buildStory();
      const page = buildPage();
      const pages = new Map([[page.id, page]]);

      mockedLoadStory.mockResolvedValue(story);
      mockedStorage.loadAllPages.mockResolvedValue(pages);

      await expect(engine.getFullStory(STORY_ID)).resolves.toEqual({ story, pages });
      expect(mockedStorage.loadAllPages).toHaveBeenCalledWith(STORY_ID);
    });
  });
});
