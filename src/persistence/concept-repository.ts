import {
  isSavedConcept,
  type GeneratedConceptBatch,
  type SavedConcept,
} from '../models/saved-concept.js';
import {
  deleteFile,
  ensureConceptGenerationsDir,
  ensureConceptsDir,
  fileExists,
  getConceptFilePath,
  getConceptGenerationFilePath,
  getConceptsDir,
  listFiles,
  readJsonFile,
  writeJsonFile,
} from './file-utils.js';
import { withLock } from './lock-manager.js';

const CONCEPT_LOCK_PREFIX = 'concept:';

function assertSavedConcept(value: unknown, sourcePath: string): SavedConcept {
  if (!isSavedConcept(value)) {
    throw new Error(`Invalid SavedConcept payload at ${sourcePath}`);
  }

  return value;
}

export async function saveConcept(concept: SavedConcept): Promise<void> {
  await withLock(`${CONCEPT_LOCK_PREFIX}${concept.id}`, async () => {
    ensureConceptsDir();
    const filePath = getConceptFilePath(concept.id);
    await writeJsonFile(filePath, concept);
  });
}

export async function saveConceptGenerationBatch(batch: GeneratedConceptBatch): Promise<void> {
  await withLock(`${CONCEPT_LOCK_PREFIX}generation:${batch.id}`, async () => {
    ensureConceptsDir();
    ensureConceptGenerationsDir();
    const filePath = getConceptGenerationFilePath(batch.id);
    await writeJsonFile(filePath, batch);
  });
}

export async function loadConcept(conceptId: string): Promise<SavedConcept | null> {
  const filePath = getConceptFilePath(conceptId);
  const concept = await readJsonFile<unknown>(filePath);
  if (concept === null) {
    return null;
  }

  return assertSavedConcept(concept, filePath);
}

export async function updateConcept(
  conceptId: string,
  updater: (existing: SavedConcept) => SavedConcept
): Promise<SavedConcept> {
  return withLock(`${CONCEPT_LOCK_PREFIX}${conceptId}`, async () => {
    const filePath = getConceptFilePath(conceptId);
    const existing = await readJsonFile<unknown>(filePath);

    if (!existing) {
      throw new Error(`Concept not found: ${conceptId}`);
    }

    const validatedExisting = assertSavedConcept(existing, filePath);
    const updated = updater(validatedExisting);
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
    const concept = await readJsonFile<unknown>(filePath);
    if (concept) {
      concepts.push(assertSavedConcept(concept, filePath));
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
