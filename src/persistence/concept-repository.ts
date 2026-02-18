import type { SavedConcept } from '../models/saved-concept.js';
import {
  deleteFile,
  ensureConceptsDir,
  fileExists,
  getConceptFilePath,
  getConceptsDir,
  listFiles,
  readJsonFile,
  writeJsonFile,
} from './file-utils.js';
import { withLock } from './lock-manager.js';

const CONCEPT_LOCK_PREFIX = 'concept:';

export async function saveConcept(concept: SavedConcept): Promise<void> {
  await withLock(`${CONCEPT_LOCK_PREFIX}${concept.id}`, async () => {
    ensureConceptsDir();
    const filePath = getConceptFilePath(concept.id);
    await writeJsonFile(filePath, concept);
  });
}

export async function loadConcept(conceptId: string): Promise<SavedConcept | null> {
  const filePath = getConceptFilePath(conceptId);
  return readJsonFile<SavedConcept>(filePath);
}

export async function updateConcept(
  conceptId: string,
  updater: (existing: SavedConcept) => SavedConcept
): Promise<SavedConcept> {
  return withLock(`${CONCEPT_LOCK_PREFIX}${conceptId}`, async () => {
    const filePath = getConceptFilePath(conceptId);
    const existing = await readJsonFile<SavedConcept>(filePath);

    if (!existing) {
      throw new Error(`Concept not found: ${conceptId}`);
    }

    const updated = updater(existing);
    await writeJsonFile(filePath, updated);
    return updated;
  });
}

export async function deleteConcept(conceptId: string): Promise<void> {
  await withLock(`${CONCEPT_LOCK_PREFIX}${conceptId}`, async () => {
    const filePath = getConceptFilePath(conceptId);
    await deleteFile(filePath);
  });
}

export async function listConcepts(): Promise<SavedConcept[]> {
  const conceptsDir = getConceptsDir();
  const files = await listFiles(conceptsDir, /\.json$/);

  const concepts: SavedConcept[] = [];
  for (const file of files) {
    const filePath = `${conceptsDir}/${file}`;
    const concept = await readJsonFile<SavedConcept>(filePath);
    if (concept) {
      concepts.push(concept);
    }
  }

  concepts.sort((a, b) => {
    const dateA = new Date(b.updatedAt).getTime();
    const dateB = new Date(a.updatedAt).getTime();
    return dateA - dateB;
  });

  return concepts;
}

export async function conceptExists(conceptId: string): Promise<boolean> {
  const filePath = getConceptFilePath(conceptId);
  return fileExists(filePath);
}
