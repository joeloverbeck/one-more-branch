import type { StandaloneDecomposedCharacter } from '../models/standalone-decomposed-character.js';
import { isStandaloneDecomposedCharacter } from '../models/standalone-decomposed-character.js';
import {
  ensureCharactersDir,
  getCharacterFilePath,
  getCharactersDir,
  listFiles,
  readJsonFile,
  writeJsonFile,
  deleteFile,
} from './file-utils.js';

export async function saveCharacter(character: StandaloneDecomposedCharacter): Promise<void> {
  ensureCharactersDir();
  const filePath = getCharacterFilePath(character.id);
  await writeJsonFile(filePath, character);
}

export async function loadCharacter(characterId: string): Promise<StandaloneDecomposedCharacter | null> {
  const filePath = getCharacterFilePath(characterId);
  const raw = await readJsonFile<unknown>(filePath);
  if (raw === null) {
    return null;
  }
  if (!isStandaloneDecomposedCharacter(raw)) {
    return null;
  }
  return raw;
}

export async function listCharacters(): Promise<StandaloneDecomposedCharacter[]> {
  ensureCharactersDir();
  const files = await listFiles(getCharactersDir(), /\.json$/);
  const characters: StandaloneDecomposedCharacter[] = [];

  for (const file of files) {
    const id = file.replace(/\.json$/, '');
    const character = await loadCharacter(id);
    if (character) {
      characters.push(character);
    }
  }

  return characters;
}

export async function deleteCharacter(characterId: string): Promise<void> {
  const filePath = getCharacterFilePath(characterId);
  await deleteFile(filePath);
}
