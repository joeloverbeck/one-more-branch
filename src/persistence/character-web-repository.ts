import type { SavedCharacterWeb } from '../models/saved-character-web.js';
import { isSavedCharacterWeb } from '../models/saved-character-web.js';
import {
  ensureCharacterWebsDir,
  getCharacterWebFilePath,
  getCharacterWebsDir,
} from './file-utils.js';
import { createJsonEntityRepository } from './json-entity-repository.js';

const characterWebRepository = createJsonEntityRepository<SavedCharacterWeb>({
  lockPrefix: 'character-web',
  entityLabel: 'character web',
  notFoundLabel: 'Character web',
  ensureDir: ensureCharacterWebsDir,
  getDir: getCharacterWebsDir,
  getFilePath: getCharacterWebFilePath,
  isEntity: isSavedCharacterWeb,
});

export async function saveCharacterWeb(web: SavedCharacterWeb): Promise<void> {
  return characterWebRepository.save(web);
}

export async function loadCharacterWeb(id: string): Promise<SavedCharacterWeb | null> {
  return characterWebRepository.load(id);
}

export async function updateCharacterWeb(
  id: string,
  updater: (web: SavedCharacterWeb) => SavedCharacterWeb
): Promise<SavedCharacterWeb> {
  return characterWebRepository.update(id, updater);
}

export async function deleteCharacterWeb(id: string): Promise<void> {
  return characterWebRepository.remove(id);
}

export async function listCharacterWebs(): Promise<SavedCharacterWeb[]> {
  return characterWebRepository.list();
}

export async function characterWebExists(id: string): Promise<boolean> {
  return characterWebRepository.exists(id);
}
