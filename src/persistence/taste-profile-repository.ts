import { isSavedTasteProfile, type SavedTasteProfile } from '../models/saved-content-packet.js';
import {
  ensureTasteProfilesDir,
  getTasteProfileFilePath,
  getTasteProfilesDir,
} from './file-utils.js';
import { createJsonEntityRepository } from './json-entity-repository.js';

const TASTE_PROFILE_LOCK_PREFIX = 'taste-profile:';

const TASTE_PROFILE_ARRAY_DEFAULTS: ReadonlyArray<
  keyof Pick<SavedTasteProfile, 'engagementModes' | 'valueTensions' | 'deepPatterns'>
> = ['engagementModes', 'valueTensions', 'deepPatterns'];

function parseTasteProfileEntity(value: unknown, sourcePath: string): SavedTasteProfile {
  const record = value as Record<string, unknown>;
  for (const field of TASTE_PROFILE_ARRAY_DEFAULTS) {
    if (!Array.isArray(record[field])) {
      record[field] = [];
    }
  }

  if (isSavedTasteProfile(record)) {
    return record;
  }

  throw new Error(`Invalid SavedTasteProfile payload at ${sourcePath}`);
}

const tasteProfileRepository = createJsonEntityRepository<SavedTasteProfile>({
  lockPrefix: TASTE_PROFILE_LOCK_PREFIX,
  entityLabel: 'SavedTasteProfile',
  notFoundLabel: 'Taste profile',
  ensureDir: ensureTasteProfilesDir,
  getDir: getTasteProfilesDir,
  getFilePath: getTasteProfileFilePath,
  isEntity: isSavedTasteProfile,
  parseEntity: parseTasteProfileEntity,
});

export async function saveTasteProfile(profile: SavedTasteProfile): Promise<void> {
  return tasteProfileRepository.save(profile);
}

export async function loadTasteProfile(id: string): Promise<SavedTasteProfile | null> {
  return tasteProfileRepository.load(id);
}

export async function deleteTasteProfile(id: string): Promise<void> {
  return tasteProfileRepository.remove(id);
}

export async function listTasteProfiles(): Promise<SavedTasteProfile[]> {
  return tasteProfileRepository.list();
}
