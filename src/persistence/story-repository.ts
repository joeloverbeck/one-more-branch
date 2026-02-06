import { Story, StoryId, StoryMetadata, parseStoryId } from '../models';
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
  readJsonFile,
  writeJsonFile,
} from './file-utils';
import { withLock } from './lock-manager';

interface StoryFileData {
  id: string;
  characterConcept: string;
  worldbuilding: string;
  tone: string;
  globalCanon: string[];
  storyArc: string | null;
  createdAt: string;
  updatedAt: string;
}

function storyToFileData(story: Story): StoryFileData {
  return {
    id: story.id,
    characterConcept: story.characterConcept,
    worldbuilding: story.worldbuilding,
    tone: story.tone,
    globalCanon: [...story.globalCanon],
    storyArc: story.storyArc,
    createdAt: story.createdAt.toISOString(),
    updatedAt: story.updatedAt.toISOString(),
  };
}

function fileDataToStory(data: StoryFileData): Story {
  return {
    id: parseStoryId(data.id),
    characterConcept: data.characterConcept,
    worldbuilding: data.worldbuilding,
    tone: data.tone,
    globalCanon: [...data.globalCanon],
    storyArc: data.storyArc,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

export async function saveStory(story: Story): Promise<void> {
  ensureStoriesDir();

  await withLock(story.id, async () => {
    const storyDir = getStoryDir(story.id);
    await ensureDirectory(storyDir);
    await writeJsonFile(getStoryFilePath(story.id), storyToFileData(story));
  });
}

export async function updateStory(story: Story): Promise<void> {
  await withLock(story.id, async () => {
    const exists = await directoryExists(getStoryDir(story.id));
    if (!exists) {
      throw new Error(`Story ${story.id} does not exist`);
    }

    await writeJsonFile(getStoryFilePath(story.id), storyToFileData(story));
  });
}

export async function loadStory(storyId: StoryId): Promise<Story | null> {
  const data = await readJsonFile<StoryFileData>(getStoryFilePath(storyId));

  if (!data) {
    return null;
  }

  if (data.id !== storyId) {
    throw new Error(`Story ID mismatch: expected ${storyId}, found ${data.id}`);
  }

  return fileDataToStory(data);
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
    const story = await loadStory(storyId as StoryId);

    if (!story) {
      continue;
    }

    const pageCount = await getPageCount(story.id);

    stories.push({
      id: story.id,
      characterConcept: story.characterConcept,
      tone: story.tone,
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
