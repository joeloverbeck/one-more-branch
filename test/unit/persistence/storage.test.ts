import {
  StoryMetadata,
  createChoice,
  createPage,
  createStory,
  parsePageId,
} from '@/models';

jest.mock('@/persistence/file-utils', (): { ensureStoriesDir: jest.Mock } => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const actual = jest.requireActual('@/persistence/file-utils');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    ...actual,
    ensureStoriesDir: jest.fn(),
  };
});

jest.mock('@/persistence/story-repository', () => ({
  saveStory: jest.fn(),
  updateStory: jest.fn(),
  loadStory: jest.fn(),
  storyExists: jest.fn(),
  deleteStory: jest.fn(),
  listStories: jest.fn(),
  getPageCount: jest.fn(),
}));

jest.mock('@/persistence/page-repository', () => ({
  savePage: jest.fn(),
  updatePage: jest.fn(),
  loadPage: jest.fn(),
  pageExists: jest.fn(),
  loadAllPages: jest.fn(),
  getMaxPageId: jest.fn(),
  updateChoiceLink: jest.fn(),
  findEndingPages: jest.fn(),
}));

jest.mock('@/persistence/page-state-service', () => ({
  computeAccumulatedState: jest.fn(),
}));

import * as persistence from '@/persistence';
import { ensureStoriesDir } from '@/persistence/file-utils';
import * as pageRepository from '@/persistence/page-repository';
import * as pageStateService from '@/persistence/page-state-service';
import { Storage, storage } from '@/persistence/storage';
import * as storyRepository from '@/persistence/story-repository';

describe('storage facade', () => {
  const story = createStory({
    characterConcept: 'TEST: PERLAY-005 story',
    worldbuilding: 'world',
    tone: 'tone',
  });
  const page = createPage({
    id: parsePageId(1),
    narrativeText: 'page',
    choices: [createChoice('c1'), createChoice('c2')],
    stateChanges: ['s1'],
    isEnding: false,
    parentPageId: null,
    parentChoiceIndex: null,
  });
  const storyId = story.id;
  const pageId = page.id;
  const nextPageId = parsePageId(2);
  const storyList: StoryMetadata[] = [];
  const loadedPages = new Map([[pageId, page]]);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates instances and exposes a stable singleton', () => {
    const anotherStorage = new Storage();

    expect(anotherStorage).toBeInstanceOf(Storage);
    expect(storage).toBeInstanceOf(Storage);
    expect(storage).toBe(persistence.storage);
  });

  it('init delegates to ensureStoriesDir', () => {
    const facade = new Storage();

    facade.init();

    expect(ensureStoriesDir).toHaveBeenCalledTimes(1);
  });

  it('delegates story operations to story-repository', async () => {
    const facade = new Storage();

    (storyRepository.loadStory as jest.MockedFunction<typeof storyRepository.loadStory>).mockResolvedValue(
      story
    );
    (
      storyRepository.storyExists as jest.MockedFunction<typeof storyRepository.storyExists>
    ).mockResolvedValue(true);
    (
      storyRepository.listStories as jest.MockedFunction<typeof storyRepository.listStories>
    ).mockResolvedValue(storyList);
    (
      storyRepository.getPageCount as jest.MockedFunction<typeof storyRepository.getPageCount>
    ).mockResolvedValue(3);

    await facade.saveStory(story);
    await facade.updateStory(story);
    await expect(facade.loadStory(storyId)).resolves.toBe(story);
    await expect(facade.storyExists(storyId)).resolves.toBe(true);
    await facade.deleteStory(storyId);
    await expect(facade.listStories()).resolves.toBe(storyList);
    await expect(facade.getPageCount(storyId)).resolves.toBe(3);

    expect(storyRepository.saveStory).toHaveBeenCalledWith(story);
    expect(storyRepository.updateStory).toHaveBeenCalledWith(story);
    expect(storyRepository.loadStory).toHaveBeenCalledWith(storyId);
    expect(storyRepository.storyExists).toHaveBeenCalledWith(storyId);
    expect(storyRepository.deleteStory).toHaveBeenCalledWith(storyId);
    expect(storyRepository.listStories).toHaveBeenCalledTimes(1);
    expect(storyRepository.getPageCount).toHaveBeenCalledWith(storyId);
  });

  it('delegates page operations to page-repository', async () => {
    const facade = new Storage();

    (pageRepository.loadPage as jest.MockedFunction<typeof pageRepository.loadPage>).mockResolvedValue(
      page
    );
    (pageRepository.pageExists as jest.MockedFunction<typeof pageRepository.pageExists>).mockResolvedValue(
      true
    );
    (
      pageRepository.loadAllPages as jest.MockedFunction<typeof pageRepository.loadAllPages>
    ).mockResolvedValue(loadedPages);
    (
      pageRepository.getMaxPageId as jest.MockedFunction<typeof pageRepository.getMaxPageId>
    ).mockResolvedValue(2);
    (
      pageRepository.findEndingPages as jest.MockedFunction<typeof pageRepository.findEndingPages>
    ).mockResolvedValue([nextPageId]);
    (
      pageStateService.computeAccumulatedState as jest.MockedFunction<
        typeof pageStateService.computeAccumulatedState
      >
    ).mockResolvedValue({ changes: ['a', 'b'] });

    await facade.savePage(storyId, page);
    await facade.updatePage(storyId, page);
    await expect(facade.loadPage(storyId, pageId)).resolves.toBe(page);
    await expect(facade.pageExists(storyId, pageId)).resolves.toBe(true);
    await expect(facade.loadAllPages(storyId)).resolves.toBe(loadedPages);
    await expect(facade.getMaxPageId(storyId)).resolves.toBe(2);
    await facade.updateChoiceLink(storyId, pageId, 0, nextPageId);
    await expect(facade.findEndingPages(storyId)).resolves.toEqual([nextPageId]);
    await expect(facade.computeAccumulatedState(storyId, pageId)).resolves.toEqual({
      changes: ['a', 'b'],
    });

    expect(pageRepository.savePage).toHaveBeenCalledWith(storyId, page);
    expect(pageRepository.updatePage).toHaveBeenCalledWith(storyId, page);
    expect(pageRepository.loadPage).toHaveBeenCalledWith(storyId, pageId);
    expect(pageRepository.pageExists).toHaveBeenCalledWith(storyId, pageId);
    expect(pageRepository.loadAllPages).toHaveBeenCalledWith(storyId);
    expect(pageRepository.getMaxPageId).toHaveBeenCalledWith(storyId);
    expect(pageRepository.updateChoiceLink).toHaveBeenCalledWith(storyId, pageId, 0, nextPageId);
    expect(pageRepository.findEndingPages).toHaveBeenCalledWith(storyId);
    expect(pageStateService.computeAccumulatedState).toHaveBeenCalledWith(storyId, pageId);
  });
});

describe('persistence index exports', () => {
  it('re-exports storage facade symbols', () => {
    expect(persistence.Storage).toBe(Storage);
    expect(persistence.storage).toBe(storage);
  });

  it('re-exports file utils, lock utilities, and repository functions', () => {
    expect(persistence.ensureStoriesDir).toBe(ensureStoriesDir);
    expect(persistence.saveStory).toBe(storyRepository.saveStory);
    expect(persistence.updateStory).toBe(storyRepository.updateStory);
    expect(persistence.loadStory).toBe(storyRepository.loadStory);
    expect(persistence.storyExists).toBe(storyRepository.storyExists);
    expect(persistence.deleteStory).toBe(storyRepository.deleteStory);
    expect(persistence.listStories).toBe(storyRepository.listStories);
    expect(persistence.getPageCount).toBe(storyRepository.getPageCount);
    expect(persistence.savePage).toBe(pageRepository.savePage);
    expect(persistence.updatePage).toBe(pageRepository.updatePage);
    expect(persistence.loadPage).toBe(pageRepository.loadPage);
    expect(persistence.pageExists).toBe(pageRepository.pageExists);
    expect(persistence.loadAllPages).toBe(pageRepository.loadAllPages);
    expect(persistence.getMaxPageId).toBe(pageRepository.getMaxPageId);
    expect(persistence.updateChoiceLink).toBe(pageRepository.updateChoiceLink);
    expect(persistence.findEndingPages).toBe(pageRepository.findEndingPages);
    expect(persistence.computeAccumulatedState).toBe(pageStateService.computeAccumulatedState);
  });
});
