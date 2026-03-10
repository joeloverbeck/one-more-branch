import type { SavedDevelopedCharacter } from '../models/saved-developed-character.js';
import { isSavedDevelopedCharacter } from '../models/saved-developed-character.js';
import {
  ensureDevelopedCharactersDir,
  getDevelopedCharacterFilePath,
  getDevelopedCharactersDir,
} from './file-utils.js';
import { createJsonEntityRepository } from './json-entity-repository.js';

function parseDevelopedCharacterEntity(value: unknown): SavedDevelopedCharacter {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Invalid developed character data');
  }

  const record = value as Record<string, unknown>;
  // Strip legacy fields that are no longer part of the persisted model
  const { sourceWebName: _, webContext: __, ...rest } = record;
  void _;
  void __;

  if (!isSavedDevelopedCharacter(rest)) {
    throw new Error('Invalid developed character after legacy field removal');
  }

  return rest;
}

const developedCharacterRepository = createJsonEntityRepository<SavedDevelopedCharacter>({
  lockPrefix: 'developed-character',
  entityLabel: 'developed character',
  notFoundLabel: 'Developed character',
  ensureDir: ensureDevelopedCharactersDir,
  getDir: getDevelopedCharactersDir,
  getFilePath: getDevelopedCharacterFilePath,
  isEntity: isSavedDevelopedCharacter,
  parseEntity: parseDevelopedCharacterEntity,
});

export async function saveDevelopedCharacter(char: SavedDevelopedCharacter): Promise<void> {
  return developedCharacterRepository.save(char);
}

export async function loadDevelopedCharacter(id: string): Promise<SavedDevelopedCharacter> {
  const char = await developedCharacterRepository.load(id);
  if (char === null) {
    throw new Error(`Developed character not found: ${id}`);
  }
  return char;
}

export async function updateDevelopedCharacter(
  id: string,
  updater: (char: SavedDevelopedCharacter) => SavedDevelopedCharacter,
): Promise<SavedDevelopedCharacter> {
  return developedCharacterRepository.update(id, updater);
}

export async function deleteDevelopedCharacter(id: string): Promise<void> {
  return developedCharacterRepository.remove(id);
}

export async function listDevelopedCharacters(): Promise<SavedDevelopedCharacter[]> {
  return developedCharacterRepository.list();
}

export async function listDevelopedCharactersByWebId(
  webId: string,
): Promise<SavedDevelopedCharacter[]> {
  const allCharacters = await developedCharacterRepository.list();
  return allCharacters.filter((char) => char.sourceWebId === webId);
}
