import { createChoice, createPage, createStory, parsePageId, Story, StoryMetadata } from '../../../src/models';
import * as models from '../../../src/models';
import { generateStoryStructure } from '../../../src/llm';
import { storage } from '../../../src/persistence';
import { generateFirstPage } from '../../../src/engine/page-service';
import {
  deleteStory,
  getPage,
  getStartingPage,
  getStoryStats,
  listAllStories,
  loadStory,
  startNewStory,
} from '../../../src/engine/story-service';

jest.mock('../../../src/persistence', () => ({
  storage: {
    saveStory: jest.fn(),
    savePage: jest.fn(),
    updateStory: jest.fn(),
    deleteStory: jest.fn(),
    loadStory: jest.fn(),
    loadPage: jest.fn(),
    listStories: jest.fn(),
    loadAllPages: jest.fn(),
  },
}));

jest.mock('../../../src/engine/page-service', () => ({
  generateFirstPage: jest.fn(),
}));

jest.mock('../../../src/llm', () => ({
  generateStoryStructure: jest.fn(),
}));

const mockedStorage = storage as {
  saveStory: jest.Mock;
  savePage: jest.Mock;
  updateStory: jest.Mock;
  deleteStory: jest.Mock;
  loadStory: jest.Mock;
  loadPage: jest.Mock;
  listStories: jest.Mock;
  loadAllPages: jest.Mock;
};

const mockedGenerateFirstPage = generateFirstPage as jest.MockedFunction<typeof generateFirstPage>;
const mockedGenerateStoryStructure = generateStoryStructure as jest.MockedFunction<
  typeof generateStoryStructure
>;

function buildStory(overrides?: Partial<Story>): Story {
  return {
    ...createStory({
      title: 'The Forbidden Roads',
      characterConcept: 'A cartographer tracing forbidden roads through the north.',
      worldbuilding: 'A region where maps are treated as dangerous artifacts.',
      tone: 'grim mystery',
    }),
    ...overrides,
  };
}

function buildStructureGenerationResult(): Awaited<ReturnType<typeof generateStoryStructure>> {
  return {
    overallTheme: 'Expose the city tribunal and reclaim your name.',
    acts: [
      {
        name: 'Act I',
        objective: 'Get pulled into the conspiracy.',
        stakes: 'Failure means imprisonment.',
        entryCondition: 'A witness vanishes.',
        beats: [
          { description: 'Meet an informant', objective: 'Gain first evidence.' },
          { description: 'Break into records office', objective: 'Recover sealed files.' },
        ],
      },
      {
        name: 'Act II',
        objective: 'Survive while gathering allies.',
        stakes: 'Failure lets the tribunal lock down the city.',
        entryCondition: 'The files identify corrupt officials.',
        beats: [
          { description: 'Confront rival house', objective: 'Secure temporary alliance.' },
          { description: 'Escape an ambush', objective: 'Keep evidence intact.' },
        ],
      },
      {
        name: 'Act III',
        objective: 'Expose the tribunal publicly.',
        stakes: 'Failure cements authoritarian rule.',
        entryCondition: 'Public hearing is announced.',
        beats: [
          { description: 'Force open testimony', objective: 'Reveal the conspiracy.' },
          { description: 'Decide final justice', objective: 'Settle the conflict.' },
        ],
      },
    ],
    rawResponse: '{"overallTheme":"..."}',
  };
}

describe('story-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startNewStory', () => {
    it('throws VALIDATION_FAILED for empty title', async () => {
      await expect(
        startNewStory({
          title: '   ',
          characterConcept: 'A valid character concept for this test case.',
          apiKey: 'test-key',
        }),
      ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });

      expect(mockedStorage.saveStory).not.toHaveBeenCalled();
      expect(mockedGenerateFirstPage).not.toHaveBeenCalled();
    });

    it('throws VALIDATION_FAILED for short characterConcept', async () => {
      await expect(
        startNewStory({
          title: 'Test Title',
          characterConcept: 'too short',
          apiKey: 'test-key',
        }),
      ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });

      expect(mockedStorage.saveStory).not.toHaveBeenCalled();
      expect(mockedGenerateFirstPage).not.toHaveBeenCalled();
    });

    it('throws VALIDATION_FAILED for missing apiKey', async () => {
      await expect(
        startNewStory({
          title: 'Test Title',
          characterConcept: 'A valid character concept for this test case.',
          apiKey: '   ',
        }),
      ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });

      expect(mockedStorage.saveStory).not.toHaveBeenCalled();
      expect(mockedGenerateFirstPage).not.toHaveBeenCalled();
    });

    it('generates structure before first page and passes structured story forward', async () => {
      const createStorySpy = jest.spyOn(models, 'createStory');
      const story = buildStory();
      const structureResult = buildStructureGenerationResult();
      const page = createPage({
        id: parsePageId(1),
        narrativeText: 'The lantern light flickers as the first route is revealed.',
        choices: [createChoice('Enter the archive'), createChoice('Follow the patrol road')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const updatedStory = { ...story, globalCanon: ['Maps are restricted by law'] };

      createStorySpy.mockReturnValueOnce(story);
      mockedStorage.saveStory.mockResolvedValue(undefined);
      mockedGenerateStoryStructure.mockResolvedValue(structureResult);
      mockedGenerateFirstPage.mockResolvedValue({ page, updatedStory });
      mockedStorage.savePage.mockResolvedValue(undefined);
      mockedStorage.updateStory.mockResolvedValue(undefined);

      const result = await startNewStory({
        title: '  Mountain Passes  ',
        characterConcept: '  A courier charting hidden mountain passes.  ',
        worldbuilding: 'High valleys controlled by signal towers',
        tone: 'tense exploration',
        apiKey: 'test-key',
      });

      expect(createStorySpy).toHaveBeenCalledWith({
        title: 'Mountain Passes',
        characterConcept: 'A courier charting hidden mountain passes.',
        worldbuilding: 'High valleys controlled by signal towers',
        tone: 'tense exploration',
      });
      expect(mockedStorage.saveStory).toHaveBeenCalledWith(story);
      expect(mockedGenerateStoryStructure).toHaveBeenCalledWith(
        {
          characterConcept: story.characterConcept,
          worldbuilding: story.worldbuilding,
          tone: story.tone,
        },
        'test-key',
      );
      expect(mockedStorage.updateStory).toHaveBeenCalled();
      const firstPageCall = mockedGenerateFirstPage.mock.calls[0];
      expect(firstPageCall?.[1]).toBe('test-key');
      const structuredStory = firstPageCall?.[0];
      expect(structuredStory).toBeDefined();
      expect(structuredStory?.structure).not.toBeNull();
      expect(mockedStorage.savePage).toHaveBeenCalledWith(story.id, page);
      expect(mockedStorage.updateStory).toHaveBeenCalledWith(updatedStory);
      expect(result).toEqual({ story: updatedStory, page });

      const structureCallOrder = mockedGenerateStoryStructure.mock.invocationCallOrder[0] ?? Infinity;
      const firstPageCallOrder = mockedGenerateFirstPage.mock.invocationCallOrder[0] ?? -Infinity;
      expect(structureCallOrder).toBeLessThan(firstPageCallOrder);
    });

    it('deletes story directory when page generation fails and rethrows original error', async () => {
      const story = buildStory();
      const structureResult = buildStructureGenerationResult();
      const generationError = new Error('Generation failed');

      jest.spyOn(models, 'createStory').mockReturnValueOnce(story);
      mockedStorage.saveStory.mockResolvedValue(undefined);
      mockedGenerateStoryStructure.mockResolvedValue(structureResult);
      mockedGenerateFirstPage.mockRejectedValue(generationError);
      mockedStorage.deleteStory.mockResolvedValue(undefined);

      await expect(
        startNewStory({
          title: 'Test Title',
          characterConcept: 'A valid concept that is definitely long enough.',
          apiKey: 'test-key',
        }),
      ).rejects.toBe(generationError);

      expect(mockedStorage.deleteStory).toHaveBeenCalledWith(story.id);
      expect(mockedStorage.savePage).not.toHaveBeenCalled();
    });

    it('deletes story when structure generation fails and rethrows original error', async () => {
      const story = buildStory();
      const structureError = new Error('Structure generation failed');

      jest.spyOn(models, 'createStory').mockReturnValueOnce(story);
      mockedStorage.saveStory.mockResolvedValue(undefined);
      mockedGenerateStoryStructure.mockRejectedValue(structureError);
      mockedStorage.deleteStory.mockResolvedValue(undefined);

      await expect(
        startNewStory({
          title: 'Test Title',
          characterConcept: 'A valid concept that is definitely long enough.',
          apiKey: 'test-key',
        }),
      ).rejects.toBe(structureError);

      expect(mockedGenerateFirstPage).not.toHaveBeenCalled();
      expect(mockedStorage.deleteStory).toHaveBeenCalledWith(story.id);
    });

    it('keeps original creation error if cleanup also fails', async () => {
      const story = buildStory();
      const structureResult = buildStructureGenerationResult();
      const generationError = new Error('LLM timeout');

      jest.spyOn(models, 'createStory').mockReturnValueOnce(story);
      mockedStorage.saveStory.mockResolvedValue(undefined);
      mockedGenerateStoryStructure.mockResolvedValue(structureResult);
      mockedGenerateFirstPage.mockRejectedValue(generationError);
      mockedStorage.deleteStory.mockRejectedValue(new Error('cleanup failed'));

      await expect(
        startNewStory({
          title: 'Test Title',
          characterConcept: 'A valid concept that is definitely long enough.',
          apiKey: 'test-key',
        }),
      ).rejects.toBe(generationError);
    });
  });

  describe('delegation helpers', () => {
    it('loadStory returns story when found and null when missing', async () => {
      const story = buildStory();

      mockedStorage.loadStory.mockResolvedValueOnce(story);
      await expect(loadStory(story.id)).resolves.toBe(story);

      mockedStorage.loadStory.mockResolvedValueOnce(null);
      await expect(loadStory(story.id)).resolves.toBeNull();
    });

    it('getPage delegates to storage.loadPage', async () => {
      const story = buildStory();
      const page = createPage({
        id: parsePageId(2),
        narrativeText: 'Page content for delegation coverage in getPage.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedActiveState: { changes: ['Accepted mission'] },
      });
      mockedStorage.loadPage.mockResolvedValue(page);

      await expect(getPage(story.id, parsePageId(2))).resolves.toBe(page);
      expect(mockedStorage.loadPage).toHaveBeenCalledWith(story.id, parsePageId(2));
    });

    it('getStartingPage loads page 1', async () => {
      const story = buildStory();
      mockedStorage.loadPage.mockResolvedValue(null);

      await expect(getStartingPage(story.id)).resolves.toBeNull();
      expect(mockedStorage.loadPage).toHaveBeenCalledWith(story.id, parsePageId(1));
    });

    it('listAllStories delegates to storage.listStories', async () => {
      const story = buildStory();
      const metadata: StoryMetadata = {
        id: story.id,
        title: story.title,
        characterConcept: story.characterConcept,
        tone: story.tone,
        createdAt: story.createdAt,
        pageCount: 1,
        hasEnding: false,
      };
      mockedStorage.listStories.mockResolvedValue([metadata]);

      await expect(listAllStories()).resolves.toEqual([metadata]);
    });

    it('deleteStory delegates to storage.deleteStory', async () => {
      const story = buildStory();
      mockedStorage.deleteStory.mockResolvedValue(undefined);

      await expect(deleteStory(story.id)).resolves.toBeUndefined();
      expect(mockedStorage.deleteStory).toHaveBeenCalledWith(story.id);
    });
  });

  describe('getStoryStats', () => {
    it('counts pages, branches, and endings correctly', async () => {
      const story = buildStory();
      const page1 = createPage({
        id: parsePageId(1),
        narrativeText: 'Page one opens with two diverging routes to test counts cleanly.',
        choices: [createChoice('Scout east', parsePageId(2)), createChoice('Scout west')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const page2 = createPage({
        id: parsePageId(2),
        narrativeText: 'Page two closes the branch to represent an ending node in stats.',
        choices: [],
        isEnding: true,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedActiveState: page1.accumulatedActiveState,
      });
      const page3 = createPage({
        id: parsePageId(3),
        narrativeText: 'Page three remains open with one explored and one unexplored choice.',
        choices: [createChoice('Investigate beacon', parsePageId(4)), createChoice('Retreat')],
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 1,
        parentAccumulatedActiveState: page1.accumulatedActiveState,
      });

      mockedStorage.loadAllPages.mockResolvedValue(
        new Map([
          [page1.id, page1],
          [page2.id, page2],
          [page3.id, page3],
        ]),
      );

      await expect(getStoryStats(story.id)).resolves.toEqual({
        pageCount: 3,
        exploredBranches: 2,
        totalBranches: 4,
        hasEnding: true,
      });
    });

    it('returns zeroed stats for empty page maps', async () => {
      const story = buildStory();
      mockedStorage.loadAllPages.mockResolvedValue(new Map());

      await expect(getStoryStats(story.id)).resolves.toEqual({
        pageCount: 0,
        exploredBranches: 0,
        totalBranches: 0,
        hasEnding: false,
      });
    });
  });
});
