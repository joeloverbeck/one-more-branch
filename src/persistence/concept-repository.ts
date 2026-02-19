import {
  isGeneratedConceptBatch,
  isSavedConcept,
  type GeneratedConceptBatch,
  type SavedConcept,
} from '../models/saved-concept.js';
import {
  ensureConceptGenerationsDir,
  ensureConceptsDir,
  getConceptFilePath,
  getConceptGenerationFilePath,
  getConceptsDir,
} from './file-utils.js';
import { createJsonBatchSaver, createJsonEntityRepository } from './json-entity-repository.js';

const CONCEPT_LOCK_PREFIX = 'concept:';

const conceptRepository = createJsonEntityRepository<SavedConcept>({
  lockPrefix: CONCEPT_LOCK_PREFIX,
  entityLabel: 'SavedConcept',
  notFoundLabel: 'Concept',
  ensureDir: ensureConceptsDir,
  getDir: getConceptsDir,
  getFilePath: getConceptFilePath,
  isEntity: isSavedConcept,
});

const saveConceptBatch = createJsonBatchSaver<GeneratedConceptBatch>({
  lockKeyPrefix: `${CONCEPT_LOCK_PREFIX}generation:`,
  entityLabel: 'GeneratedConceptBatch',
  ensureDir: () => {
    ensureConceptsDir();
    ensureConceptGenerationsDir();
  },
  getFilePath: getConceptGenerationFilePath,
  isBatch: isGeneratedConceptBatch,
});

export async function saveConcept(concept: SavedConcept): Promise<void> {
  return conceptRepository.save(concept);
}

export async function saveConceptGenerationBatch(batch: GeneratedConceptBatch): Promise<void> {
  return saveConceptBatch(batch);
}

export async function loadConcept(conceptId: string): Promise<SavedConcept | null> {
  return conceptRepository.load(conceptId);
}

export async function updateConcept(
  conceptId: string,
  updater: (existing: SavedConcept) => SavedConcept
): Promise<SavedConcept> {
  return conceptRepository.update(conceptId, updater);
}

export async function deleteConcept(conceptId: string): Promise<void> {
  return conceptRepository.remove(conceptId);
}

export async function listConcepts(): Promise<SavedConcept[]> {
  return conceptRepository.list();
}

export async function conceptExists(conceptId: string): Promise<boolean> {
  return conceptRepository.exists(conceptId);
}
