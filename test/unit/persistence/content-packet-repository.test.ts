import { randomUUID } from 'crypto';
import type { SavedContentPacket } from '@/models/saved-content-packet';
import { getContentPacketFilePath, writeJsonFile } from '@/persistence/file-utils';
import {
  contentPacketExists,
  deleteContentPacket,
  listContentPackets,
  loadContentPacket,
  saveContentPacket,
  updateContentPacket,
} from '@/persistence/content-packet-repository';

const TEST_PREFIX = 'TEST: WILCONPIP-02-CP';

function createSavedContentPacket(id: string, updatedAt?: string): SavedContentPacket {
  const now = new Date().toISOString();
  return {
    id,
    name: `${TEST_PREFIX} packet`,
    createdAt: now,
    updatedAt: updatedAt ?? now,
    contentKind: 'ENTITY',
    coreAnomaly: 'A sentient building that rearranges its rooms based on occupant emotions',
    humanAnchor: 'The janitor who has worked there for 40 years and remembers every layout',
    socialEngine: 'Tenants form alliances based on whose emotions dominate the architecture',
    choicePressure: 'Stay and adapt or leave and lose the community',
    signatureImage: 'Hallways that breathe like living tissue',
    escalationPath: 'The building starts reflecting collective trauma',
    wildnessInvariant: 'Architecture is emotional expression made physical',
    dullCollapse: 'Just a weird building with moving walls',
    interactionVerbs: ['inhabit', 'reshape', 'negotiate'],
    pinned: false,
    recommendedRole: 'PRIMARY_SEED',
  };
}

describe('content-packet-repository', () => {
  const createdIds = new Set<string>();

  afterEach(async () => {
    for (const id of createdIds) {
      await deleteContentPacket(id);
    }
    createdIds.clear();
  });

  it('saves and loads a valid content packet', async () => {
    const id = `${TEST_PREFIX}-${randomUUID()}`;
    createdIds.add(id);
    const packet = createSavedContentPacket(id);

    await saveContentPacket(packet);

    const loaded = await loadContentPacket(id);
    expect(loaded).toEqual(packet);
    await expect(contentPacketExists(id)).resolves.toBe(true);
  });

  it('returns null for nonexistent ID', async () => {
    const id = `${TEST_PREFIX}-${randomUUID()}`;

    await expect(loadContentPacket(id)).resolves.toBeNull();
    await expect(contentPacketExists(id)).resolves.toBe(false);
  });

  it('updates an existing content packet', async () => {
    const id = `${TEST_PREFIX}-${randomUUID()}`;
    createdIds.add(id);

    await saveContentPacket(createSavedContentPacket(id));

    const updated = await updateContentPacket(id, (existing) => ({
      ...existing,
      name: `${TEST_PREFIX} updated`,
      updatedAt: '2026-03-07T12:00:00.000Z',
    }));

    expect(updated.name).toBe(`${TEST_PREFIX} updated`);

    const loaded = await loadContentPacket(id);
    expect(loaded?.name).toBe(`${TEST_PREFIX} updated`);
  });

  it('deletes an existing content packet', async () => {
    const id = `${TEST_PREFIX}-${randomUUID()}`;
    createdIds.add(id);

    await saveContentPacket(createSavedContentPacket(id));

    await deleteContentPacket(id);
    await deleteContentPacket(id);
    createdIds.delete(id);

    await expect(contentPacketExists(id)).resolves.toBe(false);
  });

  it('lists content packets sorted by updatedAt descending', async () => {
    const newerId = `${TEST_PREFIX}-${randomUUID()}`;
    const olderId = `${TEST_PREFIX}-${randomUUID()}`;
    createdIds.add(newerId);
    createdIds.add(olderId);

    await saveContentPacket(createSavedContentPacket(olderId, '2026-03-06T00:00:00.000Z'));
    await saveContentPacket(createSavedContentPacket(newerId, '2026-03-07T00:00:00.000Z'));

    const packets = await listContentPackets();
    const orderedIds = packets
      .filter((p) => p.id === newerId || p.id === olderId)
      .map((p) => p.id);

    expect(orderedIds).toEqual([newerId, olderId]);
  });

  it('throws when loading a persisted packet with invalid shape', async () => {
    const id = `${TEST_PREFIX}-${randomUUID()}`;
    createdIds.add(id);

    await writeJsonFile(getContentPacketFilePath(id), {
      id,
      name: `${TEST_PREFIX} invalid`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      contentKind: 'ENTITY',
    });

    await expect(loadContentPacket(id)).rejects.toThrow(
      `Invalid SavedContentPacket payload at ${getContentPacketFilePath(id)}`
    );
  });
});
