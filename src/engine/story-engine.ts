import { Page, PageId, Story, StoryId, StoryMetadata } from '../models';
import { storage } from '../persistence';
import { getOrGeneratePage } from './page-service';
import {
  deleteStory,
  getPage,
  getStartingPage,
  getStoryStats,
  listAllStories,
  loadStory,
  startNewStory,
} from './story-service';
import { EngineError, MakeChoiceOptions, MakeChoiceResult, StartStoryOptions, StartStoryResult } from './types';

export class StoryEngine {
  init(): void {
    storage.init();
  }

  async startStory(options: StartStoryOptions): Promise<StartStoryResult> {
    return startNewStory(options);
  }

  async makeChoice(options: MakeChoiceOptions): Promise<MakeChoiceResult> {
    const story = await loadStory(options.storyId);
    if (!story) {
      throw new EngineError(`Story ${options.storyId} not found`, 'STORY_NOT_FOUND');
    }

    const currentPage = await getPage(options.storyId, options.pageId);
    if (!currentPage) {
      throw new EngineError(
        `Page ${options.pageId} not found in story ${options.storyId}`,
        'PAGE_NOT_FOUND',
      );
    }

    if (currentPage.isEnding) {
      throw new EngineError('Cannot make a choice on an ending page', 'INVALID_CHOICE');
    }

    if (options.choiceIndex < 0 || options.choiceIndex >= currentPage.choices.length) {
      throw new EngineError(
        `Invalid choice index ${options.choiceIndex}. Page has ${currentPage.choices.length} choices.`,
        'INVALID_CHOICE',
      );
    }

    const { page, wasGenerated, deviationInfo } = await getOrGeneratePage(
      story,
      currentPage,
      options.choiceIndex,
      options.apiKey,
      options.onGenerationStage,
      options.suggestedProtagonistSpeech,
    );

    return { page, wasGenerated, deviationInfo };
  }

  async loadStory(storyId: StoryId): Promise<Story | null> {
    return loadStory(storyId);
  }

  async getPage(storyId: StoryId, pageId: PageId): Promise<Page | null> {
    return getPage(storyId, pageId);
  }

  async getStartingPage(storyId: StoryId): Promise<Page | null> {
    return getStartingPage(storyId);
  }

  async restartStory(storyId: StoryId): Promise<Page> {
    const page = await getStartingPage(storyId);
    if (!page) {
      throw new EngineError(`Story ${storyId} has no starting page`, 'PAGE_NOT_FOUND');
    }

    return page;
  }

  async listStories(): Promise<StoryMetadata[]> {
    return listAllStories();
  }

  async deleteStory(storyId: StoryId): Promise<void> {
    return deleteStory(storyId);
  }

  async getStoryStats(storyId: StoryId): Promise<{
    pageCount: number;
    exploredBranches: number;
    totalBranches: number;
    hasEnding: boolean;
  }> {
    return getStoryStats(storyId);
  }

  async storyExists(storyId: StoryId): Promise<boolean> {
    return storage.storyExists(storyId);
  }

  async getFullStory(storyId: StoryId): Promise<{ story: Story; pages: Map<PageId, Page> } | null> {
    const story = await loadStory(storyId);
    if (!story) {
      return null;
    }

    const pages = await storage.loadAllPages(storyId);

    return {
      story,
      pages,
    };
  }
}

export const storyEngine = new StoryEngine();
