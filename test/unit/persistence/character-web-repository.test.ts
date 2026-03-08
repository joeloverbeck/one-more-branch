import { randomUUID } from 'crypto';
import type { SavedCharacterWeb } from '@/models/saved-character-web';
import { getCharacterWebFilePath, writeJsonFile } from '@/persistence/file-utils';
import {
  characterWebExists,
  deleteCharacterWeb,
  listCharacterWebs,
  loadCharacterWeb,
  saveCharacterWeb,
  updateCharacterWeb,
} from '@/persistence/character-web-repository';

const TEST_PREFIX = 'TEST: CHABUIPIP-05';

function createSavedCharacterWeb(id: string, updatedAt?: string): SavedCharacterWeb {
  const now = new Date().toISOString();
  return {
    id,
    name: `${TEST_PREFIX} web`,
    createdAt: now,
    updatedAt: updatedAt ?? now,
    inputs: {
      kernelSummary: 'A test kernel summary',
      conceptSummary: 'A test concept summary',
    },
    assignments: [
      {
        characterName: 'Alice',
        isProtagonist: true,
        storyFunction: 'PROTAGONIST',
        characterDepth: 'DEEP',
        narrativeRole: 'The hero',
        conflictRelationship: 'Faces the antagonist',
      },
    ],
    relationshipArchetypes: [
      {
        fromCharacter: 'Alice',
        toCharacter: 'Bob',
        relationshipType: 'RIVAL',
        valence: 'NEGATIVE',
        essentialTension: 'They compete for the same goal',
      },
    ],
    castDynamicsSummary: 'A tense rivalry between Alice and Bob.',
  };
}

describe('character-web-repository persisted payload validation', () => {
  const createdWebIds = new Set<string>();

  afterEach(async () => {
    for (const webId of createdWebIds) {
      await deleteCharacterWeb(webId);
    }
    createdWebIds.clear();
  });

  it('saves and loads a valid character web', async () => {
    const webId = `${TEST_PREFIX}-${randomUUID()}`;
    createdWebIds.add(webId);
    const web = createSavedCharacterWeb(webId);

    await saveCharacterWeb(web);

    const loaded = await loadCharacterWeb(webId);
    expect(loaded).toEqual(web);
    await expect(characterWebExists(webId)).resolves.toBe(true);
  });

  it('returns null for non-existent ID and false for exists check', async () => {
    const webId = `${TEST_PREFIX}-${randomUUID()}`;

    await expect(loadCharacterWeb(webId)).resolves.toBeNull();
    await expect(characterWebExists(webId)).resolves.toBe(false);
  });

  it('updates an existing character web under lock and persists result', async () => {
    const webId = `${TEST_PREFIX}-${randomUUID()}`;
    createdWebIds.add(webId);

    await saveCharacterWeb(createSavedCharacterWeb(webId));

    const updated = await updateCharacterWeb(webId, (existing) => ({
      ...existing,
      name: `${TEST_PREFIX} updated`,
      updatedAt: '2026-03-08T12:00:00.000Z',
    }));

    expect(updated.name).toBe(`${TEST_PREFIX} updated`);

    const loaded = await loadCharacterWeb(webId);
    expect(loaded?.name).toBe(`${TEST_PREFIX} updated`);
  });

  it('deletes an existing character web without throwing for repeated deletes', async () => {
    const webId = `${TEST_PREFIX}-${randomUUID()}`;
    createdWebIds.add(webId);

    await saveCharacterWeb(createSavedCharacterWeb(webId));

    await deleteCharacterWeb(webId);
    await deleteCharacterWeb(webId);
    createdWebIds.delete(webId);

    await expect(characterWebExists(webId)).resolves.toBe(false);
  });

  it('lists character webs sorted by updatedAt descending', async () => {
    const newerId = `${TEST_PREFIX}-${randomUUID()}`;
    const olderId = `${TEST_PREFIX}-${randomUUID()}`;
    createdWebIds.add(newerId);
    createdWebIds.add(olderId);

    await saveCharacterWeb(createSavedCharacterWeb(olderId, '2026-03-07T00:00:00.000Z'));
    await saveCharacterWeb(createSavedCharacterWeb(newerId, '2026-03-08T00:00:00.000Z'));

    const webs = await listCharacterWebs();
    const orderedIds = webs
      .filter((web) => web.id === newerId || web.id === olderId)
      .map((web) => web.id);

    expect(orderedIds).toEqual([newerId, olderId]);
  });

  it('characterWebExists returns true for existing and false for missing', async () => {
    const webId = `${TEST_PREFIX}-${randomUUID()}`;
    createdWebIds.add(webId);

    await expect(characterWebExists(webId)).resolves.toBe(false);

    await saveCharacterWeb(createSavedCharacterWeb(webId));

    await expect(characterWebExists(webId)).resolves.toBe(true);
  });

  it('throws when loading a persisted web with invalid shape', async () => {
    const webId = `${TEST_PREFIX}-${randomUUID()}`;
    createdWebIds.add(webId);

    await writeJsonFile(getCharacterWebFilePath(webId), {
      id: webId,
      name: `${TEST_PREFIX} invalid`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Missing required fields: inputs, assignments, relationshipArchetypes, castDynamicsSummary
    });

    await expect(loadCharacterWeb(webId)).rejects.toThrow(
      `Invalid character web payload at ${getCharacterWebFilePath(webId)}`
    );
  });
});
