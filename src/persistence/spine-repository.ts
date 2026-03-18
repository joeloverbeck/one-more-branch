import { isSavedSpine } from '../models/saved-spine.js';
import type { SavedSpine } from '../models/saved-spine.js';
import { ensureSpinesDir, getSpineFilePath, getSpinesDir } from './file-utils.js';
import { createJsonEntityRepository } from './json-entity-repository.js';

const SPINE_LOCK_PREFIX = 'spine:';

const spineRepository = createJsonEntityRepository<SavedSpine>({
  lockPrefix: SPINE_LOCK_PREFIX,
  entityLabel: 'SavedSpine',
  notFoundLabel: 'Spine',
  ensureDir: ensureSpinesDir,
  getDir: getSpinesDir,
  getFilePath: getSpineFilePath,
  isEntity: isSavedSpine,
});

export async function saveSpine(spine: SavedSpine): Promise<void> {
  return spineRepository.save(spine);
}

export async function loadSpine(spineId: string): Promise<SavedSpine | null> {
  return spineRepository.load(spineId);
}

export async function updateSpine(
  spineId: string,
  updater: (existing: SavedSpine) => SavedSpine
): Promise<SavedSpine> {
  return spineRepository.update(spineId, updater);
}

export async function deleteSpine(spineId: string): Promise<void> {
  return spineRepository.remove(spineId);
}

export async function listSpines(): Promise<SavedSpine[]> {
  return spineRepository.list();
}

export async function spineExists(spineId: string): Promise<boolean> {
  return spineRepository.exists(spineId);
}
