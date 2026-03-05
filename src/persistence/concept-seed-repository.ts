import { isConceptSeed, parseConceptSeedEntity } from '../models/concept-seed.js';
import type { ConceptSeed } from '../models/concept-seed.js';
import {
  ensureConceptSeedsDir,
  ensureConceptsDir,
  getConceptSeedFilePath,
  getConceptSeedsDir,
} from './file-utils.js';
import { createJsonEntityRepository } from './json-entity-repository.js';

const SEED_LOCK_PREFIX = 'concept-seed:';

const seedRepository = createJsonEntityRepository<ConceptSeed>({
  lockPrefix: SEED_LOCK_PREFIX,
  entityLabel: 'ConceptSeed',
  notFoundLabel: 'Concept seed',
  ensureDir: () => {
    ensureConceptsDir();
    ensureConceptSeedsDir();
  },
  getDir: getConceptSeedsDir,
  getFilePath: getConceptSeedFilePath,
  isEntity: isConceptSeed,
  parseEntity: parseConceptSeedEntity,
});

export async function saveSeed(seed: ConceptSeed): Promise<void> {
  return seedRepository.save(seed);
}

export async function loadSeed(seedId: string): Promise<ConceptSeed | null> {
  return seedRepository.load(seedId);
}

export async function updateSeed(
  seedId: string,
  updater: (existing: ConceptSeed) => ConceptSeed,
): Promise<ConceptSeed> {
  return seedRepository.update(seedId, updater);
}

export async function deleteSeed(seedId: string): Promise<void> {
  return seedRepository.remove(seedId);
}

export async function listSeeds(): Promise<ConceptSeed[]> {
  return seedRepository.list();
}

export async function seedExists(seedId: string): Promise<boolean> {
  return seedRepository.exists(seedId);
}
