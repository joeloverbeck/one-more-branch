import { StoryId, generateStoryId, isStoryId } from './id';
import { GlobalCanon, GlobalCharacterCanon } from './state';

export type StoryTone = string;

export interface Story {
  readonly id: StoryId;
  readonly title: string;
  readonly characterConcept: string;
  readonly worldbuilding: string;
  readonly tone: StoryTone;
  globalCanon: GlobalCanon;
  globalCharacterCanon: GlobalCharacterCanon;
  storyArc: string | null;
  readonly createdAt: Date;
  updatedAt: Date;
}

export interface CreateStoryData {
  title: string;
  characterConcept: string;
  worldbuilding?: string;
  tone?: string;
}

export interface StoryMetadata {
  readonly id: StoryId;
  readonly title: string;
  readonly characterConcept: string;
  readonly tone: StoryTone;
  readonly createdAt: Date;
  readonly pageCount: number;
  readonly hasEnding: boolean;
}

export function createStory(data: CreateStoryData): Story {
  const title = data.title.trim();
  if (title.length === 0) {
    throw new Error('Title is required');
  }

  const characterConcept = data.characterConcept.trim();
  if (characterConcept.length === 0) {
    throw new Error('Character concept is required');
  }

  const now = new Date();

  return {
    id: generateStoryId(),
    title,
    characterConcept,
    worldbuilding: data.worldbuilding?.trim() ?? '',
    tone: data.tone?.trim() ?? 'fantasy adventure',
    globalCanon: [],
    globalCharacterCanon: {},
    storyArc: null,
    createdAt: now,
    updatedAt: now,
  };
}

function isGlobalCharacterCanon(value: unknown): value is GlobalCharacterCanon {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!Array.isArray(obj[key])) {
      return false;
    }
    const arr = obj[key] as unknown[];
    if (!arr.every(item => typeof item === 'string')) {
      return false;
    }
  }

  return true;
}

export function isStory(value: unknown): value is Story {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  const title = obj['title'];
  const characterConcept = obj['characterConcept'];
  const storyArc = obj['storyArc'];

  return (
    isStoryId(obj['id']) &&
    typeof title === 'string' &&
    title.trim().length > 0 &&
    typeof characterConcept === 'string' &&
    characterConcept.trim().length > 0 &&
    typeof obj['worldbuilding'] === 'string' &&
    typeof obj['tone'] === 'string' &&
    Array.isArray(obj['globalCanon']) &&
    isGlobalCharacterCanon(obj['globalCharacterCanon']) &&
    (typeof storyArc === 'string' || storyArc === null) &&
    obj['createdAt'] instanceof Date &&
    obj['updatedAt'] instanceof Date
  );
}

export function updateStoryCanon(story: Story, newCanon: GlobalCanon): Story {
  return {
    ...story,
    globalCanon: newCanon,
    updatedAt: new Date(),
  };
}

export function updateStoryArc(story: Story, arc: string): Story {
  return {
    ...story,
    storyArc: arc.trim(),
    updatedAt: new Date(),
  };
}
