import { randomUUID } from 'crypto';
import type { SavedDevelopedCharacter } from '@/models/saved-developed-character';
import { getDevelopedCharacterFilePath, writeJsonFile } from '@/persistence/file-utils';
import {
  deleteDevelopedCharacter,
  listDevelopedCharacters,
  listDevelopedCharactersByWebId,
  loadDevelopedCharacter,
  saveDevelopedCharacter,
  updateDevelopedCharacter,
} from '@/persistence/developed-character-repository';

const TEST_PREFIX = 'TEST: CHABUIPIP-06';

function createSavedDevelopedCharacter(
  id: string,
  overrides?: Partial<Pick<SavedDevelopedCharacter, 'sourceWebId' | 'updatedAt'>>,
): SavedDevelopedCharacter {
  const now = new Date().toISOString();
  return {
    id,
    characterName: `${TEST_PREFIX} character`,
    createdAt: now,
    updatedAt: overrides?.updatedAt ?? now,
    sourceWebId: overrides?.sourceWebId ?? 'web-default',
    sourceWebName: 'Test Web',
    webContext: {
      assignment: {
        characterName: 'Alice',
        isProtagonist: true,
        storyFunction: 'PROTAGONIST',
        characterDepth: 'DEEP',
        narrativeRole: 'The hero',
        conflictRelationship: 'Faces the antagonist',
      },
      protagonistName: 'Alice',
      relationshipArchetypes: [],
      castDynamicsSummary: 'A tense rivalry.',
    },
    characterKernel: null,
    tridimensionalProfile: null,
    agencyModel: null,
    deepRelationships: null,
    textualPresentation: null,
    completedStages: [],
  };
}

describe('developed-character-repository', () => {
  const createdCharIds = new Set<string>();

  afterEach(async () => {
    for (const charId of createdCharIds) {
      await deleteDevelopedCharacter(charId);
    }
    createdCharIds.clear();
  });

  it('saves and loads a valid developed character', async () => {
    const charId = `${TEST_PREFIX}-${randomUUID()}`;
    createdCharIds.add(charId);
    const char = createSavedDevelopedCharacter(charId);

    await saveDevelopedCharacter(char);

    const loaded = await loadDevelopedCharacter(charId);
    expect(loaded).toEqual(char);
  });

  it('throws for non-existent ID', async () => {
    const charId = `${TEST_PREFIX}-${randomUUID()}`;

    await expect(loadDevelopedCharacter(charId)).rejects.toThrow(
      `Developed character not found: ${charId}`,
    );
  });

  it('updates an existing developed character and persists result', async () => {
    const charId = `${TEST_PREFIX}-${randomUUID()}`;
    createdCharIds.add(charId);

    await saveDevelopedCharacter(createSavedDevelopedCharacter(charId));

    const updated = await updateDevelopedCharacter(charId, (existing) => ({
      ...existing,
      characterName: `${TEST_PREFIX} updated`,
      updatedAt: '2026-03-08T12:00:00.000Z',
    }));

    expect(updated.characterName).toBe(`${TEST_PREFIX} updated`);

    const loaded = await loadDevelopedCharacter(charId);
    expect(loaded.characterName).toBe(`${TEST_PREFIX} updated`);
  });

  it('deletes an existing developed character', async () => {
    const charId = `${TEST_PREFIX}-${randomUUID()}`;
    createdCharIds.add(charId);

    await saveDevelopedCharacter(createSavedDevelopedCharacter(charId));
    await deleteDevelopedCharacter(charId);
    createdCharIds.delete(charId);

    await expect(loadDevelopedCharacter(charId)).rejects.toThrow(
      `Developed character not found: ${charId}`,
    );
  });

  it('lists all saved developed characters', async () => {
    const id1 = `${TEST_PREFIX}-${randomUUID()}`;
    const id2 = `${TEST_PREFIX}-${randomUUID()}`;
    createdCharIds.add(id1);
    createdCharIds.add(id2);

    await saveDevelopedCharacter(createSavedDevelopedCharacter(id1));
    await saveDevelopedCharacter(createSavedDevelopedCharacter(id2));

    const allChars = await listDevelopedCharacters();
    const testIds = allChars
      .filter((c) => c.id === id1 || c.id === id2)
      .map((c) => c.id);

    expect(testIds).toHaveLength(2);
    expect(testIds).toContain(id1);
    expect(testIds).toContain(id2);
  });

  it('listDevelopedCharactersByWebId returns only characters matching the webId', async () => {
    const webA = `web-a-${randomUUID()}`;
    const webB = `web-b-${randomUUID()}`;
    const id1 = `${TEST_PREFIX}-${randomUUID()}`;
    const id2 = `${TEST_PREFIX}-${randomUUID()}`;
    const id3 = `${TEST_PREFIX}-${randomUUID()}`;
    createdCharIds.add(id1);
    createdCharIds.add(id2);
    createdCharIds.add(id3);

    await saveDevelopedCharacter(createSavedDevelopedCharacter(id1, { sourceWebId: webA }));
    await saveDevelopedCharacter(createSavedDevelopedCharacter(id2, { sourceWebId: webA }));
    await saveDevelopedCharacter(createSavedDevelopedCharacter(id3, { sourceWebId: webB }));

    const webAChars = await listDevelopedCharactersByWebId(webA);
    const webAIds = webAChars.map((c) => c.id);

    expect(webAIds).toHaveLength(2);
    expect(webAIds).toContain(id1);
    expect(webAIds).toContain(id2);
  });

  it('listDevelopedCharactersByWebId returns empty array when no matches', async () => {
    const result = await listDevelopedCharactersByWebId(`no-match-${randomUUID()}`);
    expect(result).toEqual([]);
  });

  it('throws when loading a persisted character with invalid shape', async () => {
    const charId = `${TEST_PREFIX}-${randomUUID()}`;
    createdCharIds.add(charId);

    await writeJsonFile(getDevelopedCharacterFilePath(charId), {
      id: charId,
      updatedAt: new Date().toISOString(),
      // Missing required fields
    });

    await expect(loadDevelopedCharacter(charId)).rejects.toThrow(
      `Invalid developed character payload at ${getDevelopedCharacterFilePath(charId)}`,
    );
  });
});
