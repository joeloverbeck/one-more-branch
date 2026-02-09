import {
  Story,
  StoryId,
  StoryMetadata,
  StoryStructure,
  VersionedStoryStructure,
  parsePageId,
  parseStoryId,
  parseStructureVersionId,
} from '../models';
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
  title: string;
  characterConcept: string;
  worldbuilding: string;
  tone: string;
  npcs: string | null;
  startingSituation: string | null;
  globalCanon: string[];
  globalCharacterCanon: Record<string, string[]>;
  structure: StoryStructureFileData | null;
  structureVersions?: VersionedStoryStructureFileData[];
  createdAt: string;
  updatedAt: string;
}

interface VersionedStoryStructureFileData {
  id: string;
  structure: StoryStructureFileData;
  previousVersionId: string | null;
  createdAtPageId: number | null;
  rewriteReason: string | null;
  preservedBeatIds: string[];
  createdAt: string;
}

interface StoryStructureFileData {
  acts: Array<{
    id: string;
    name: string;
    objective: string;
    stakes: string;
    entryCondition: string;
    beats: Array<{
      id: string;
      description: string;
      objective: string;
    }>;
  }>;
  overallTheme: string;
  generatedAt: string;
}

function structureToFileData(structure: StoryStructure): StoryStructureFileData {
  return {
    acts: structure.acts.map(act => ({
      id: act.id,
      name: act.name,
      objective: act.objective,
      stakes: act.stakes,
      entryCondition: act.entryCondition,
      beats: act.beats.map(beat => ({
        id: beat.id,
        description: beat.description,
        objective: beat.objective,
      })),
    })),
    overallTheme: structure.overallTheme,
    generatedAt: structure.generatedAt.toISOString(),
  };
}

function fileDataToStructure(data: StoryStructureFileData): StoryStructure {
  return {
    acts: data.acts.map(act => ({
      id: act.id,
      name: act.name,
      objective: act.objective,
      stakes: act.stakes,
      entryCondition: act.entryCondition,
      beats: act.beats.map(beat => ({
        id: beat.id,
        description: beat.description,
        objective: beat.objective,
      })),
    })),
    overallTheme: data.overallTheme,
    generatedAt: new Date(data.generatedAt),
  };
}

function versionedStructureToFileData(
  version: VersionedStoryStructure,
): VersionedStoryStructureFileData {
  return {
    id: version.id,
    structure: structureToFileData(version.structure),
    previousVersionId: version.previousVersionId,
    createdAtPageId: version.createdAtPageId,
    rewriteReason: version.rewriteReason,
    preservedBeatIds: [...version.preservedBeatIds],
    createdAt: version.createdAt.toISOString(),
  };
}

function fileDataToVersionedStructure(
  data: VersionedStoryStructureFileData,
): VersionedStoryStructure {
  return {
    id: parseStructureVersionId(data.id),
    structure: fileDataToStructure(data.structure),
    previousVersionId:
      data.previousVersionId === null
        ? null
        : parseStructureVersionId(data.previousVersionId),
    createdAtPageId: data.createdAtPageId === null ? null : parsePageId(data.createdAtPageId),
    rewriteReason: data.rewriteReason,
    preservedBeatIds: [...data.preservedBeatIds],
    createdAt: new Date(data.createdAt),
  };
}

function storyToFileData(story: Story): StoryFileData {
  const globalCharacterCanon: Record<string, string[]> = {};
  for (const [name, facts] of Object.entries(story.globalCharacterCanon)) {
    globalCharacterCanon[name] = [...facts];
  }

  return {
    id: story.id,
    title: story.title,
    characterConcept: story.characterConcept,
    worldbuilding: story.worldbuilding,
    tone: story.tone,
    npcs: story.npcs ?? null,
    startingSituation: story.startingSituation ?? null,
    globalCanon: [...story.globalCanon],
    globalCharacterCanon,
    structure: story.structure ? structureToFileData(story.structure) : null,
    structureVersions: (story.structureVersions ?? []).map(versionedStructureToFileData),
    createdAt: story.createdAt.toISOString(),
    updatedAt: story.updatedAt.toISOString(),
  };
}

function fileDataToStory(data: StoryFileData): Story {
  const rawData = data as unknown as Record<string, unknown>;
  if (!('npcs' in rawData) || !('startingSituation' in rawData)) {
    throw new Error(
      `Story file ${data.id} is missing required fields: npcs and/or startingSituation. ` +
        'This story was created before these fields were tracked. Please recreate the story.',
    );
  }

  // Migration: handle existing stories without globalCharacterCanon
  const globalCharacterCanon: Record<string, readonly string[]> = {};
  if (data.globalCharacterCanon) {
    for (const [name, facts] of Object.entries(data.globalCharacterCanon)) {
      globalCharacterCanon[name] = [...facts];
    }
  }

  const structureVersions = data.structureVersions
    ? data.structureVersions.map(fileDataToVersionedStructure)
    : [];

  return {
    id: parseStoryId(data.id),
    title: data.title,
    characterConcept: data.characterConcept,
    worldbuilding: data.worldbuilding,
    tone: data.tone,
    ...(data.npcs !== null ? { npcs: data.npcs } : {}),
    ...(data.startingSituation !== null ? { startingSituation: data.startingSituation } : {}),
    globalCanon: [...data.globalCanon],
    globalCharacterCanon,
    structure: data.structure ? fileDataToStructure(data.structure) : null,
    structureVersions,
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
