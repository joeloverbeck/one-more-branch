import { randomBytes } from 'crypto';
import { PageId, isPageId } from './id';
import { StoryStructure } from './story-arc';

export type StructureVersionId = string & { readonly __brand: 'StructureVersionId' };

export interface VersionedStoryStructure {
  readonly id: StructureVersionId;
  readonly structure: StoryStructure;
  readonly previousVersionId: StructureVersionId | null;
  readonly createdAtPageId: PageId | null;
  readonly rewriteReason: string | null;
  readonly preservedBeatIds: readonly string[];
  readonly createdAt: Date;
}

const STRUCTURE_VERSION_ID_PATTERN = /^sv-\d{13}-[0-9a-f]{4}$/;
let lastVersionTimestamp = 0;
let versionSequence = randomBytes(2).readUInt16BE(0);

export function createStructureVersionId(): StructureVersionId {
  const now = Date.now();
  if (now === lastVersionTimestamp) {
    versionSequence = (versionSequence + 1) & 0xffff;
  } else {
    lastVersionTimestamp = now;
    versionSequence = randomBytes(2).readUInt16BE(0);
  }

  return `sv-${now}-${versionSequence.toString(16).padStart(4, '0')}` as StructureVersionId;
}

export function isStructureVersionId(value: unknown): value is StructureVersionId {
  return typeof value === 'string' && STRUCTURE_VERSION_ID_PATTERN.test(value);
}

export function parseStructureVersionId(value: string): StructureVersionId {
  if (!isStructureVersionId(value)) {
    throw new Error(`Invalid StructureVersionId format: ${value}`);
  }

  return value;
}

export function createInitialVersionedStructure(
  structure: StoryStructure
): VersionedStoryStructure {
  return {
    id: createStructureVersionId(),
    structure,
    previousVersionId: null,
    createdAtPageId: null,
    rewriteReason: null,
    preservedBeatIds: [],
    createdAt: new Date(),
  };
}

export function createRewrittenVersionedStructure(
  previousVersion: VersionedStoryStructure,
  newStructure: StoryStructure,
  preservedBeatIds: readonly string[],
  rewriteReason: string,
  createdAtPageId: PageId
): VersionedStoryStructure {
  return {
    id: createStructureVersionId(),
    structure: newStructure,
    previousVersionId: previousVersion.id,
    createdAtPageId,
    rewriteReason,
    preservedBeatIds: [...preservedBeatIds],
    createdAt: new Date(),
  };
}

function isStoryStructure(value: unknown): value is StoryStructure {
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

export function isVersionedStoryStructure(value: unknown): value is VersionedStoryStructure {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const versioned = value as Record<string, unknown>;
  const previousVersionId = versioned['previousVersionId'];
  const createdAtPageId = versioned['createdAtPageId'];
  const rewriteReason = versioned['rewriteReason'];
  const preservedBeatIds = versioned['preservedBeatIds'];

  return (
    isStructureVersionId(versioned['id']) &&
    isStoryStructure(versioned['structure']) &&
    (previousVersionId === null || isStructureVersionId(previousVersionId)) &&
    (createdAtPageId === null || isPageId(createdAtPageId)) &&
    (rewriteReason === null || typeof rewriteReason === 'string') &&
    Array.isArray(preservedBeatIds) &&
    preservedBeatIds.every((beatId) => typeof beatId === 'string') &&
    versioned['createdAt'] instanceof Date
  );
}
