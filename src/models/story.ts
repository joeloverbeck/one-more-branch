import type { DecomposedCharacter } from './decomposed-character';
import type { DecomposedWorld } from './decomposed-world';
import { StoryId, generateStoryId, isStoryId } from './id';
import { Npc } from './npc';
import { StoryStructure } from './story-arc';
import type { ConceptSpec } from './concept-generator';
import { isConceptSpec } from './concept-generator';
import type { StorySpine } from './story-spine';
import type { StoryKernel } from './story-kernel.js';
import { isStoryKernel } from './story-kernel.js';
import { GlobalCanon, GlobalCharacterCanon } from './state/index.js';
import type { NpcAgenda } from './state/npc-agenda';
import type { NpcRelationship } from './state/npc-relationship';
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
  readonly characterConcept?: string;
  readonly worldbuilding: string;
  readonly tone: StoryTone;
  readonly npcs?: readonly Npc[];
  readonly protagonistCharacterId?: string;
  readonly npcCharacterIds?: readonly string[];
  readonly startingSituation?: string;
  globalCanon: GlobalCanon;
  globalCharacterCanon: GlobalCharacterCanon;
  structure: StoryStructure | null;
  readonly structureVersions?: readonly VersionedStoryStructure[];
  readonly toneFeel?: readonly string[];
  readonly toneAvoid?: readonly string[];
  readonly initialNpcAgendas?: readonly NpcAgenda[];
  readonly initialNpcRelationships?: readonly NpcRelationship[];
  readonly spine?: StorySpine;
  readonly conceptSpec?: ConceptSpec;
  readonly storyKernel?: StoryKernel;
  readonly premisePromises: readonly string[];
  readonly decomposedCharacters?: readonly DecomposedCharacter[];
  readonly decomposedWorld?: DecomposedWorld;
  readonly createdAt: Date;
  updatedAt: Date;
}

export interface CreateStoryData {
  title: string;
  characterConcept?: string;
  worldbuilding?: string;
  tone?: string;
  npcs?: readonly Npc[];
  protagonistCharacterId?: string;
  npcCharacterIds?: readonly string[];
  startingSituation?: string;
  conceptSpec?: ConceptSpec;
  storyKernel?: StoryKernel;
  premisePromises?: readonly string[];
}

export interface StoryMetadata {
  readonly id: StoryId;
  readonly title: string;
  readonly characterConcept?: string;
  readonly tone: StoryTone;
  readonly overallTheme?: string;
  readonly premise?: string;
  readonly createdAt: Date;
  readonly pageCount: number;
  readonly hasEnding: boolean;
}

export function createStory(data: CreateStoryData): Story {
  const title = data.title.trim();
  if (title.length === 0) {
    throw new Error('Title is required');
  }

  const trimmedConcept = data.characterConcept?.trim();
  const characterConcept = trimmedConcept && trimmedConcept.length > 0 ? trimmedConcept : undefined;

  const now = new Date();

  const validNpcs = data.npcs?.filter(
    (npc) => npc.name.trim().length > 0 && npc.description.trim().length > 0
  );
  const npcs = validNpcs && validNpcs.length > 0 ? validNpcs : undefined;
  const startingSituation = data.startingSituation?.trim();
  const npcCharacterIds =
    data.npcCharacterIds && data.npcCharacterIds.length > 0 ? data.npcCharacterIds : undefined;

  return {
    id: generateStoryId(),
    title,
    characterConcept,
    worldbuilding: data.worldbuilding?.trim() ?? '',
    tone: data.tone?.trim() ?? 'fantasy adventure',
    npcs,
    ...(data.protagonistCharacterId ? { protagonistCharacterId: data.protagonistCharacterId } : {}),
    ...(npcCharacterIds ? { npcCharacterIds } : {}),
    startingSituation:
      startingSituation && startingSituation.length > 0 ? startingSituation : undefined,
    conceptSpec: data.conceptSpec,
    ...(data.storyKernel ? { storyKernel: data.storyKernel } : {}),
    premisePromises: data.premisePromises ?? [],
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
    typeof structure['openingImage'] === 'string' &&
    typeof structure['closingImage'] === 'string' &&
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
    if (!arr.every((item) => typeof item === 'string')) {
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
    (characterConcept === undefined || typeof characterConcept === 'string') &&
    typeof obj['worldbuilding'] === 'string' &&
    typeof obj['tone'] === 'string' &&
    Array.isArray(obj['globalCanon']) &&
    (obj['conceptSpec'] === undefined || isConceptSpec(obj['conceptSpec'])) &&
    (obj['storyKernel'] === undefined || isStoryKernel(obj['storyKernel'])) &&
    (Array.isArray(obj['premisePromises']) &&
      (obj['premisePromises'] as unknown[]).every((item) => typeof item === 'string')) &&
    isGlobalCharacterCanon(obj['globalCharacterCanon']) &&
    (structure === null || isStoryStructure(structure)) &&
    (structureVersions === undefined ||
      (Array.isArray(structureVersions) &&
        structureVersions.every((version) => isVersionedStoryStructure(version)))) &&
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
  versionId: StructureVersionId
): VersionedStoryStructure | null {
  const versions = story.structureVersions ?? [];
  return versions.find((version) => version.id === versionId) ?? null;
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
