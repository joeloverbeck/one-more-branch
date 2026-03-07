import { isSavedTasteProfile, type SavedTasteProfile } from '../models/saved-content-packet.js';
import {
  ensureTasteProfilesDir,
  getTasteProfileFilePath,
  getTasteProfilesDir,
} from './file-utils.js';
import { createJsonEntityRepository } from './json-entity-repository.js';

const TASTE_PROFILE_LOCK_PREFIX = 'taste-profile:';

const tasteProfileRepository = createJsonEntityRepository<SavedTasteProfile>({
  lockPrefix: TASTE_PROFILE_LOCK_PREFIX,
  entityLabel: 'SavedTasteProfile',
  notFoundLabel: 'Taste profile',
  ensureDir: ensureTasteProfilesDir,
  getDir: getTasteProfilesDir,
  getFilePath: getTasteProfileFilePath,
  isEntity: isSavedTasteProfile,
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
