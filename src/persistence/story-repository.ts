import { Story, StoryId, StoryMetadata } from '../models';
import {
  deleteDirectory,
  directoryExists,
  ensureDirectory,
  ensureStoriesDir,
  getStoriesDir,
  getStoryDir,
  getStoryFilePath,
  listDirectories,
  listFiles,
  writeJsonFile,
} from './file-utils';
import { createJsonFileStore } from './json-file-store';
import { withLock } from './lock-manager';
import { serializeStory, deserializeStory } from './story-serializer';
import type { StoryFileData } from './story-serializer-types';

const storyFileStore = createJsonFileStore<StoryId, StoryFileData>({
  getFilePath: getStoryFilePath,
  getLockKey: (storyId) => storyId,
  ensureWriteTarget: async (storyId) => {
    ensureStoriesDir();
    await ensureDirectory(getStoryDir(storyId));
  },
});

export async function saveStory(story: Story): Promise<void> {
  await storyFileStore.write(story.id, serializeStory(story));
}

export async function updateStory(story: Story): Promise<void> {
  await withLock(story.id, async () => {
    const exists = await directoryExists(getStoryDir(story.id));
    if (!exists) {
      throw new Error(`Story ${story.id} does not exist`);
    }

    await writeJsonFile(getStoryFilePath(story.id), serializeStory(story));
  });
}

export async function loadStory(storyId: StoryId): Promise<Story | null> {
  const data = await storyFileStore.read(storyId);

  if (!data) {
    return null;
  }

  if (data.id !== storyId) {
    throw new Error(`Story ID mismatch: expected ${storyId}, found ${data.id}`);
  }

  return deserializeStory(data);
}

export async function storyExists(storyId: StoryId): Promise<boolean> {
  return directoryExists(getStoryDir(storyId));
}

export async function deleteStory(storyId: StoryId): Promise<void> {
  await withLock(storyId, async () => {
    await deleteDirectory(getStoryDir(storyId));
  });
}

export async function listStories(): Promise<StoryMetadata[]> {
  ensureStoriesDir();

  const storyIds = await listDirectories(getStoriesDir());
  const stories: StoryMetadata[] = [];

  for (const storyId of storyIds) {
    let story: Story | null;
    try {
      story = await loadStory(storyId as StoryId);
    } catch {
      continue;
    }

    if (!story) {
      continue;
    }

    const pageCount = await getPageCount(story.id);

    stories.push({
      id: story.id,
      title: story.title,
      characterConcept: story.characterConcept,
      tone: story.tone,
      overallTheme: story.structure?.overallTheme,
      premise: story.structure?.premise,
      createdAt: story.createdAt,
      pageCount,
      hasEnding: false,
    });
  }

  stories.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return stories;
}

export async function getPageCount(storyId: StoryId): Promise<number> {
  const pageFiles = await listFiles(getStoryDir(storyId), /^page_\d+\.json$/);
  return pageFiles.length;
}
