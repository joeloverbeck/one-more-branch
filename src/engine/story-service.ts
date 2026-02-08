import { generateStoryStructure } from '../llm';
import {
  createStory,
  Page,
  PageId,
  parsePageId,
  Story,
  StoryId,
  StoryMetadata,
  updateStoryStructure,
} from '../models';
import { storage } from '../persistence';
import { generateFirstPage } from './page-service';
import { createStoryStructure } from './structure-factory';
import { EngineError, StartStoryOptions, StartStoryResult } from './types';

export async function startNewStory(options: StartStoryOptions): Promise<StartStoryResult> {
  const title = options.title.trim();
  if (title.length === 0) {
    throw new EngineError('Title is required', 'VALIDATION_FAILED');
  }

  const characterConcept = options.characterConcept.trim();
  if (characterConcept.length < 10) {
    throw new EngineError('Character concept must be at least 10 characters', 'VALIDATION_FAILED');
  }

  if (options.apiKey.trim().length === 0) {
    throw new EngineError('API key is required', 'VALIDATION_FAILED');
  }

  const story = createStory({
    title,
    characterConcept,
    worldbuilding: options.worldbuilding,
    tone: options.tone,
    npcs: options.npcs,
    startingSituation: options.startingSituation,
  });

  try {
    await storage.saveStory(story);

    const structureResult = await generateStoryStructure(
      {
        characterConcept: story.characterConcept,
        worldbuilding: story.worldbuilding,
        tone: story.tone,
        npcs: story.npcs,
        startingSituation: story.startingSituation,
      },
      options.apiKey,
    );
    const structure = createStoryStructure(structureResult);
    const storyWithStructure = updateStoryStructure(story, structure);
    await storage.updateStory(storyWithStructure);

    const { page, updatedStory } = await generateFirstPage(storyWithStructure, options.apiKey);

    await storage.savePage(story.id, page);

    if (updatedStory !== storyWithStructure) {
      await storage.updateStory(updatedStory);
    }

    return { story: updatedStory, page };
  } catch (error) {
    try {
      await storage.deleteStory(story.id);
    } catch {
      // Preserve the original error from creation flow.
    }

    throw error;
  }
}

export async function loadStory(storyId: StoryId): Promise<Story | null> {
  return storage.loadStory(storyId);
}

export async function getPage(storyId: StoryId, pageId: PageId): Promise<Page | null> {
  return storage.loadPage(storyId, pageId);
}

export async function getStartingPage(storyId: StoryId): Promise<Page | null> {
  return storage.loadPage(storyId, parsePageId(1));
}

export async function listAllStories(): Promise<StoryMetadata[]> {
  return storage.listStories();
}

export async function deleteStory(storyId: StoryId): Promise<void> {
  return storage.deleteStory(storyId);
}

export async function getStoryStats(storyId: StoryId): Promise<{
  pageCount: number;
  exploredBranches: number;
  totalBranches: number;
  hasEnding: boolean;
}> {
  const pages = await storage.loadAllPages(storyId);

  let exploredBranches = 0;
  let totalBranches = 0;
  let hasEnding = false;

  for (const page of pages.values()) {
    if (page.isEnding) {
      hasEnding = true;
    }

    for (const choice of page.choices) {
      totalBranches += 1;
      if (choice.nextPageId !== null) {
        exploredBranches += 1;
      }
    }
  }

  return {
    pageCount: pages.size,
    exploredBranches,
    totalBranches,
    hasEnding,
  };
}
