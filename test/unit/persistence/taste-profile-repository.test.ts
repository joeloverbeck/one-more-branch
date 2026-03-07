import { randomUUID } from 'crypto';
import type { SavedTasteProfile } from '@/models/saved-content-packet';
import { getTasteProfileFilePath, writeJsonFile } from '@/persistence/file-utils';
import {
  deleteTasteProfile,
  listTasteProfiles,
  loadTasteProfile,
  saveTasteProfile,
} from '@/persistence/taste-profile-repository';

const TEST_PREFIX = 'TEST: WILCONPIP-02-TP';

function createSavedTasteProfile(id: string, updatedAt?: string): SavedTasteProfile {
  const now = new Date().toISOString();
  return {
    id,
    name: `${TEST_PREFIX} profile`,
    createdAt: now,
    updatedAt: updatedAt ?? now,
    collisionPatterns: ['bureaucracy meets body horror'],
    favoredMechanisms: ['slow corruption', 'institutional decay'],
    humanAnchors: ['parental guilt', 'professional shame'],
    socialEngines: ['workplace hierarchies', 'neighborhood gossip'],
    toneBlend: ['darkly comic', 'unsettling warmth'],
    sceneAppetites: ['confrontation', 'quiet dread'],
    antiPatterns: ['chosen one narratives', 'redemption through violence'],
    surfaceDoNotRepeat: [],
    riskAppetite: 'HIGH',
  };
}

describe('taste-profile-repository', () => {
  const createdIds = new Set<string>();

  afterEach(async () => {
    for (const id of createdIds) {
      await deleteTasteProfile(id);
    }
    createdIds.clear();
  });

  it('saves and loads a valid taste profile', async () => {
    const id = `${TEST_PREFIX}-${randomUUID()}`;
    createdIds.add(id);
    const profile = createSavedTasteProfile(id);

    await saveTasteProfile(profile);

    const loaded = await loadTasteProfile(id);
    expect(loaded).toEqual(profile);
  });

  it('returns null for nonexistent ID', async () => {
    const id = `${TEST_PREFIX}-${randomUUID()}`;

    await expect(loadTasteProfile(id)).resolves.toBeNull();
  });

  it('deletes an existing taste profile', async () => {
    const id = `${TEST_PREFIX}-${randomUUID()}`;
    createdIds.add(id);

    await saveTasteProfile(createSavedTasteProfile(id));

    await deleteTasteProfile(id);
    createdIds.delete(id);

    await expect(loadTasteProfile(id)).resolves.toBeNull();
  });

  it('lists taste profiles sorted by updatedAt descending', async () => {
    const newerId = `${TEST_PREFIX}-${randomUUID()}`;
    const olderId = `${TEST_PREFIX}-${randomUUID()}`;
    createdIds.add(newerId);
    createdIds.add(olderId);

    await saveTasteProfile(createSavedTasteProfile(olderId, '2026-03-06T00:00:00.000Z'));
    await saveTasteProfile(createSavedTasteProfile(newerId, '2026-03-07T00:00:00.000Z'));

    const profiles = await listTasteProfiles();
    const orderedIds = profiles
      .filter((p) => p.id === newerId || p.id === olderId)
      .map((p) => p.id);

    expect(orderedIds).toEqual([newerId, olderId]);
  });

  it('throws when loading a persisted profile with invalid shape', async () => {
    const id = `${TEST_PREFIX}-${randomUUID()}`;
    createdIds.add(id);

    await writeJsonFile(getTasteProfileFilePath(id), {
      id,
      name: `${TEST_PREFIX} invalid`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      riskAppetite: 'HIGH',
    });

    await expect(loadTasteProfile(id)).rejects.toThrow(
      `Invalid SavedTasteProfile payload at ${getTasteProfileFilePath(id)}`
    );
  });
});
