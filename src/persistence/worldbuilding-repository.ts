import type { SavedWorldbuilding } from '../models/saved-worldbuilding.js';
import { isSavedWorldbuilding } from '../models/saved-worldbuilding.js';
import {
  ensureWorldbuildingDir,
  getWorldbuildingDir,
  getWorldbuildingFilePath,
} from './file-utils.js';
import { createJsonEntityRepository } from './json-entity-repository.js';

const worldbuildingRepository = createJsonEntityRepository<SavedWorldbuilding>({
  lockPrefix: 'worldbuilding',
  entityLabel: 'worldbuilding',
  notFoundLabel: 'Worldbuilding',
  ensureDir: ensureWorldbuildingDir,
  getDir: getWorldbuildingDir,
  getFilePath: getWorldbuildingFilePath,
  isEntity: isSavedWorldbuilding,
});

export async function saveWorldbuilding(wb: SavedWorldbuilding): Promise<void> {
  return worldbuildingRepository.save(wb);
}

export async function loadWorldbuilding(id: string): Promise<SavedWorldbuilding | null> {
  return worldbuildingRepository.load(id);
}

export async function updateWorldbuilding(
  id: string,
  updater: (wb: SavedWorldbuilding) => SavedWorldbuilding,
): Promise<SavedWorldbuilding> {
  return worldbuildingRepository.update(id, updater);
}

export async function deleteWorldbuilding(id: string): Promise<void> {
  return worldbuildingRepository.remove(id);
}

export async function listWorldbuildings(): Promise<SavedWorldbuilding[]> {
  return worldbuildingRepository.list();
}

export async function worldbuildingExists(id: string): Promise<boolean> {
  return worldbuildingRepository.exists(id);
}
