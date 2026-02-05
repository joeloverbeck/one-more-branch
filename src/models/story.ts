import { StoryId, generateStoryId, isStoryId } from './id';
import { GlobalCanon } from './state';

export type StoryTone = string;

export interface Story {
  readonly id: StoryId;
  readonly characterConcept: string;
  readonly worldbuilding: string;
  readonly tone: StoryTone;
  globalCanon: GlobalCanon;
  storyArc: string | null;
  readonly createdAt: Date;
  updatedAt: Date;
}

export interface CreateStoryData {
  characterConcept: string;
  worldbuilding?: string;
  tone?: string;
}

export interface StoryMetadata {
  readonly id: StoryId;
  readonly characterConcept: string;
  readonly tone: StoryTone;
  readonly createdAt: Date;
  readonly pageCount: number;
  readonly hasEnding: boolean;
}

export function createStory(data: CreateStoryData): Story {
  const characterConcept = data.characterConcept.trim();
  if (characterConcept.length === 0) {
    throw new Error('Character concept is required');
  }

  const now = new Date();

  return {
    id: generateStoryId(),
    characterConcept,
    worldbuilding: data.worldbuilding?.trim() ?? '',
    tone: data.tone?.trim() ?? 'fantasy adventure',
    globalCanon: [],
    storyArc: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function isStory(value: unknown): value is Story {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  const characterConcept = obj['characterConcept'];
  const storyArc = obj['storyArc'];

  return (
    isStoryId(obj['id']) &&
    typeof characterConcept === 'string' &&
    characterConcept.trim().length > 0 &&
    typeof obj['worldbuilding'] === 'string' &&
    typeof obj['tone'] === 'string' &&
    Array.isArray(obj['globalCanon']) &&
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
