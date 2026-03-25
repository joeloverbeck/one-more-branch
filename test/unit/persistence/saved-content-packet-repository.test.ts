import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { rm } from 'fs/promises';
import { tmpdir } from 'os';
import * as path from 'path';
import type { SavedContentPacket } from '@/models/saved-content-packet';
import {
  getContentPacketFilePath,
  getContentPacketsDir,
  writeJsonFile,
} from '@/persistence/file-utils';
import {
  deleteSavedContentPacket,
  listSavedContentPackets,
  loadSavedContentPacket,
  saveSavedContentPacket,
  savedContentPacketExists,
  updateSavedContentPacket,
} from '@/persistence/saved-content-packet-repository';

const TEST_PREFIX = 'TEST: WILCONPIP-02-CP';
const TEST_CONTENT_PACKETS_DIR = path.join(
  tmpdir(),
  'one-more-branch-saved-content-packet-repository-tests'
);

jest.mock('@/persistence/file-utils', () => {
  const actual = jest.requireActual<typeof import('@/persistence/file-utils')>(
    '@/persistence/file-utils'
  );

  return {
    ...actual,
    ensureContentPacketsDir: (): void => {
      mkdirSync(TEST_CONTENT_PACKETS_DIR, { recursive: true });
    },
    getContentPacketsDir: (): string => TEST_CONTENT_PACKETS_DIR,
    getContentPacketFilePath: (contentPacketId: string): string =>
      path.join(TEST_CONTENT_PACKETS_DIR, `${contentPacketId}.json`),
  };
});

function createSavedContentPacket(id: string, updatedAt?: string): SavedContentPacket {
  const now = new Date().toISOString();
  return {
    id,
    createdAt: now,
    updatedAt: updatedAt ?? now,
    pinned: false,
    assetVersion: 2,
    packet: {
      contentId: 'pkt-01',
      contentKind: 'ENTITY',
      coreAnomaly: 'A sentient building that rearranges its rooms based on occupant emotions',
      humanAnchor: 'The janitor who has worked there for 40 years and remembers every layout',
      socialEngine: 'Tenants form alliances based on whose emotions dominate the architecture',
      choicePressure: 'Stay and adapt or leave and lose the community',
      signatureImage: 'Hallways that breathe like living tissue',
      escalationPath: 'The building starts reflecting collective trauma',
      wildnessInvariant: 'Architecture is emotional expression made physical',
      dullCollapse: 'Just a weird building with moving walls',
      interactionVerbs: ['inhabit', 'reshape', 'negotiate', 'adapt'],
    },
    context: {
      premiseSummary: 'A sentient building rewrites itself around tenant emotions.',
      situationFrame: 'A longtime janitor is the only person who remembers every prior layout.',
      worldState: 'Residents already treat architectural shifts as part of ordinary life.',
      playerPosition:
        'You are the janitor whose memory makes you the only reliable witness to the building.',
    },
    origin: {
      generationMode: 'quick',
      sourceArtifacts: [
        {
          artifactType: 'EXEMPLAR',
          sourceId: 'exemplar-01',
          contentKind: 'ENTITY',
          summary: 'A building whose rooms rearrange around emotional conflict',
        },
      ],
    },
  };
}

function createLegacyPacketOnlyPayload(id: string): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    id,
    createdAt: now,
    updatedAt: now,
    pinned: false,
    packet: {
      contentId: 'pkt-01',
      contentKind: 'ENTITY',
      coreAnomaly: 'Legacy payload',
      humanAnchor: 'Legacy anchor',
      socialEngine: 'Legacy engine',
      choicePressure: 'Legacy pressure',
      signatureImage: 'Legacy image',
      escalationPath: 'Legacy escalation',
      wildnessInvariant: 'Legacy invariant',
      dullCollapse: 'Legacy collapse',
      interactionVerbs: ['observe', 'adapt'],
    },
    provenance: {
      generationMode: 'quick',
    },
  };
}

describe('saved-content-packet-repository', () => {
  const createdIds = new Set<string>();

  beforeEach(async () => {
    await rm(getContentPacketsDir(), { recursive: true, force: true });
  });

  afterEach(async () => {
    for (const id of createdIds) {
      await deleteSavedContentPacket(id);
    }
    createdIds.clear();
    await rm(getContentPacketsDir(), { recursive: true, force: true });
  });

  it('saves and loads a valid content packet', async () => {
    const id = `${TEST_PREFIX}-${randomUUID()}`;
    createdIds.add(id);
    const packet = createSavedContentPacket(id);

    await saveSavedContentPacket(packet);

    const loaded = await loadSavedContentPacket(id);
    expect(loaded).toEqual(packet);
    await expect(savedContentPacketExists(id)).resolves.toBe(true);
  });

  it('returns null for nonexistent ID', async () => {
    const id = `${TEST_PREFIX}-${randomUUID()}`;

    await expect(loadSavedContentPacket(id)).resolves.toBeNull();
    await expect(savedContentPacketExists(id)).resolves.toBe(false);
  });

  it('updates an existing content packet', async () => {
    const id = `${TEST_PREFIX}-${randomUUID()}`;
    createdIds.add(id);

    await saveSavedContentPacket(createSavedContentPacket(id));

    const updated = await updateSavedContentPacket(id, (existing) => ({
      ...existing,
      packet: {
        ...existing.packet,
        coreAnomaly: `${TEST_PREFIX} updated`,
      },
      updatedAt: '2026-03-07T12:00:00.000Z',
    }));

    expect(updated.packet.coreAnomaly).toBe(`${TEST_PREFIX} updated`);

    const loaded = await loadSavedContentPacket(id);
    expect(loaded?.packet.coreAnomaly).toBe(`${TEST_PREFIX} updated`);
  });

  it('deletes an existing content packet', async () => {
    const id = `${TEST_PREFIX}-${randomUUID()}`;
    createdIds.add(id);

    await saveSavedContentPacket(createSavedContentPacket(id));

    await deleteSavedContentPacket(id);
    await deleteSavedContentPacket(id);
    createdIds.delete(id);

    await expect(savedContentPacketExists(id)).resolves.toBe(false);
  });

  it('lists content packets sorted by updatedAt descending', async () => {
    const newerId = `${TEST_PREFIX}-${randomUUID()}`;
    const olderId = `${TEST_PREFIX}-${randomUUID()}`;
    createdIds.add(newerId);
    createdIds.add(olderId);

    await saveSavedContentPacket(createSavedContentPacket(olderId, '2026-03-06T00:00:00.000Z'));
    await saveSavedContentPacket(createSavedContentPacket(newerId, '2026-03-07T00:00:00.000Z'));

    const packets = await listSavedContentPackets();
    const orderedIds = packets.filter((p) => p.id === newerId || p.id === olderId).map((p) => p.id);

    expect(orderedIds).toEqual([newerId, olderId]);
  });

  it('throws when loading a persisted packet with invalid shape', async () => {
    const id = `${TEST_PREFIX}-${randomUUID()}`;
    createdIds.add(id);

    mkdirSync(getContentPacketsDir(), { recursive: true });
    await writeJsonFile(getContentPacketFilePath(id), createLegacyPacketOnlyPayload(id));

    await expect(loadSavedContentPacket(id)).rejects.toThrow(
      `Invalid SavedContentPacket payload at ${getContentPacketFilePath(id)}`
    );
  });

  it('upcasts legacy viewpointPressure to playerPosition when loading', async () => {
    const id = `${TEST_PREFIX}-${randomUUID()}`;
    createdIds.add(id);
    const packet = createSavedContentPacket(id);
    const legacyPayload = {
      ...packet,
      context: {
        premiseSummary: packet.context.premiseSummary,
        situationFrame: packet.context.situationFrame,
        worldState: packet.context.worldState,
        viewpointPressure: 'Legacy protagonist pressure',
      },
    };

    mkdirSync(getContentPacketsDir(), { recursive: true });
    await writeJsonFile(getContentPacketFilePath(id), legacyPayload);

    await expect(loadSavedContentPacket(id)).resolves.toMatchObject({
      context: {
        premiseSummary: packet.context.premiseSummary,
        situationFrame: packet.context.situationFrame,
        worldState: packet.context.worldState,
        playerPosition: 'Legacy protagonist pressure',
      },
    });
  });

  it('defaults missing legacy playerPosition during load', async () => {
    const id = `${TEST_PREFIX}-${randomUUID()}`;
    createdIds.add(id);
    const packet = createSavedContentPacket(id);
    const legacyPayload = {
      ...packet,
      context: {
        premiseSummary: packet.context.premiseSummary,
        situationFrame: packet.context.situationFrame,
        worldState: packet.context.worldState,
      },
    };

    mkdirSync(getContentPacketsDir(), { recursive: true });
    await writeJsonFile(getContentPacketFilePath(id), legacyPayload);

    await expect(loadSavedContentPacket(id)).resolves.toMatchObject({
      context: {
        premiseSummary: packet.context.premiseSummary,
        situationFrame: packet.context.situationFrame,
        worldState: packet.context.worldState,
        playerPosition: 'Unspecified protagonist position',
      },
    });
  });

  it('throws when listing persisted packets if a legacy packet-only file is present', async () => {
    const validId = `${TEST_PREFIX}-${randomUUID()}`;
    const legacyId = `${TEST_PREFIX}-${randomUUID()}`;
    createdIds.add(validId);
    createdIds.add(legacyId);

    await saveSavedContentPacket(createSavedContentPacket(validId));
    mkdirSync(getContentPacketsDir(), { recursive: true });
    await writeJsonFile(
      getContentPacketFilePath(legacyId),
      createLegacyPacketOnlyPayload(legacyId)
    );

    await expect(listSavedContentPackets()).rejects.toThrow(
      `Invalid SavedContentPacket payload at ${getContentPacketFilePath(legacyId)}`
    );
  });
});
