import { StoryId, generateStoryId, isStoryId } from './id';
import { Npc } from './npc';
import { StoryStructure } from './story-arc';
import { GlobalCanon, GlobalCharacterCanon } from './state/index.js';
import type { NpcAgenda } from './state/npc-agenda';
import {
  StructureVersionId,
  VersionedStoryStructure,
  createInitialVersionedStructure,
  isVersionedStoryStructure,
} from './structure-version';

export type StoryTone = string;

export interface Story {
  readonly id: StoryId;
  readonly title: string;
  readonly characterConcept: string;
  readonly worldbuilding: string;
  readonly tone: StoryTone;
  readonly npcs?: readonly Npc[];
  readonly startingSituation?: string;
  globalCanon: GlobalCanon;
  globalCharacterCanon: GlobalCharacterCanon;
  structure: StoryStructure | null;
  readonly structureVersions?: readonly VersionedStoryStructure[];
  readonly initialNpcAgendas?: readonly NpcAgenda[];
  readonly createdAt: Date;
  updatedAt: Date;
}

export interface CreateStoryData {
  title: string;
  characterConcept: string;
  worldbuilding?: string;
  tone?: string;
  npcs?: readonly Npc[];
  startingSituation?: string;
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

  const validNpcs = data.npcs?.filter(
    npc => npc.name.trim().length > 0 && npc.description.trim().length > 0,
  );
  const npcs = validNpcs && validNpcs.length > 0 ? validNpcs : undefined;
  const startingSituation = data.startingSituation?.trim();

  return {
    id: generateStoryId(),
    title,
    characterConcept,
    worldbuilding: data.worldbuilding?.trim() ?? '',
    tone: data.tone?.trim() ?? 'fantasy adventure',
    npcs,
    startingSituation: startingSituation && startingSituation.length > 0 ? startingSituation : undefined,
    globalCanon: [],
    globalCharacterCanon: {},
    structure: null,
    structureVersions: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function isStoryStructure(value: unknown): value is StoryStructure {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const structure = value as Record<string, unknown>;
  return (
    Array.isArray(structure['acts']) &&
    typeof structure['overallTheme'] === 'string' &&
    structure['generatedAt'] instanceof Date
  );
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
  const structure = obj['structure'];
  const structureVersions = obj['structureVersions'];

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
    (structure === null || isStoryStructure(structure)) &&
    (structureVersions === undefined ||
      (Array.isArray(structureVersions) &&
        structureVersions.every(version => isVersionedStoryStructure(version)))) &&
    obj['createdAt'] instanceof Date &&
    obj['updatedAt'] instanceof Date
  );
}

export function getLatestStructureVersion(story: Story): VersionedStoryStructure | null {
  const versions = story.structureVersions ?? [];
  if (versions.length === 0) {
    return null;
  }

  return versions[versions.length - 1] ?? null;
}

export function getStructureVersion(
  story: Story,
  versionId: StructureVersionId,
): VersionedStoryStructure | null {
  const versions = story.structureVersions ?? [];
  return versions.find(version => version.id === versionId) ?? null;
}

export function addStructureVersion(story: Story, version: VersionedStoryStructure): Story {
  const versions = story.structureVersions ?? [];
  return {
    ...story,
    structure: version.structure,
    structureVersions: [...versions, version],
    updatedAt: new Date(),
  };
}

export function updateStoryCanon(story: Story, newCanon: GlobalCanon): Story {
  return {
    ...story,
    globalCanon: newCanon,
    updatedAt: new Date(),
  };
}

export function updateStoryStructure(story: Story, structure: StoryStructure): Story {
  const versions = story.structureVersions ?? [];
  if (versions.length === 0) {
    const initialVersion = createInitialVersionedStructure(structure);
    return addStructureVersion(story, initialVersion);
  }

  return {
    ...story,
    structure,
    updatedAt: new Date(),
  };
}
