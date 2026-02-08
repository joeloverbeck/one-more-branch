import { Page, PageId, Story, StoryId, StoryMetadata } from '../models';
import { ensureStoriesDir } from './file-utils';
import {
  deleteStory,
  getPageCount,
  listStories,
  loadStory,
  saveStory,
  storyExists,
  updateStory,
} from './story-repository';
import {
  findEndingPages,
  getMaxPageId,
  loadAllPages,
  loadPage,
  pageExists,
  savePage,
  updateChoiceLink,
  updatePage,
} from './page-repository';

export class Storage {
  init(): void {
    ensureStoriesDir();
  }

  async saveStory(story: Story): Promise<void> {
    return saveStory(story);
  }

  async updateStory(story: Story): Promise<void> {
    return updateStory(story);
  }

  async loadStory(storyId: StoryId): Promise<Story | null> {
    return loadStory(storyId);
  }

  async storyExists(storyId: StoryId): Promise<boolean> {
    return storyExists(storyId);
  }

  async deleteStory(storyId: StoryId): Promise<void> {
    return deleteStory(storyId);
  }

  async listStories(): Promise<StoryMetadata[]> {
    return listStories();
  }

  async getPageCount(storyId: StoryId): Promise<number> {
    return getPageCount(storyId);
  }

  async savePage(storyId: StoryId, page: Page): Promise<void> {
    return savePage(storyId, page);
  }

  async updatePage(storyId: StoryId, page: Page): Promise<void> {
    return updatePage(storyId, page);
  }

  async loadPage(storyId: StoryId, pageId: PageId): Promise<Page | null> {
    return loadPage(storyId, pageId);
  }

  async pageExists(storyId: StoryId, pageId: PageId): Promise<boolean> {
    return pageExists(storyId, pageId);
  }

  async loadAllPages(storyId: StoryId): Promise<Map<PageId, Page>> {
    return loadAllPages(storyId);
  }

  async getMaxPageId(storyId: StoryId): Promise<number> {
    return getMaxPageId(storyId);
  }

  async updateChoiceLink(
    storyId: StoryId,
    pageId: PageId,
    choiceIndex: number,
    nextPageId: PageId
  ): Promise<void> {
    return updateChoiceLink(storyId, pageId, choiceIndex, nextPageId);
  }

  async findEndingPages(storyId: StoryId): Promise<PageId[]> {
    return findEndingPages(storyId);
  }
}

export const storage = new Storage();
