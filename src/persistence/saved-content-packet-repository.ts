import { isSavedContentPacket, type SavedContentPacket } from '../models/saved-content-packet.js';
import {
  ensureContentPacketsDir,
  getContentPacketFilePath,
  getContentPacketsDir,
} from './file-utils.js';
import { createJsonEntityRepository } from './json-entity-repository.js';

const CONTENT_PACKET_LOCK_PREFIX = 'content-packet:';

function parseSavedContentPacket(value: unknown, sourcePath: string): SavedContentPacket {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid SavedContentPacket payload at ${sourcePath}`);
  }

  const candidate = value as Record<string, unknown>;
  const contextValue = candidate['context'];

  if (typeof contextValue === 'object' && contextValue !== null && !Array.isArray(contextValue)) {
    const context = { ...(contextValue as Record<string, unknown>) };

    if (
      typeof context['viewpointPressure'] === 'string' &&
      typeof context['playerPosition'] !== 'string'
    ) {
      context['playerPosition'] = context['viewpointPressure'];
    }

    if (typeof context['playerPosition'] !== 'string' || context['playerPosition'].trim().length === 0) {
      context['playerPosition'] = 'Unspecified protagonist position';
    }

    delete context['viewpointPressure'];
    candidate['context'] = context;
  }

  const evaluationValue = candidate['evaluation'];
  if (
    typeof evaluationValue === 'object' &&
    evaluationValue !== null &&
    !Array.isArray(evaluationValue)
  ) {
    const evaluation = { ...(evaluationValue as Record<string, unknown>) };
    const scoresValue = evaluation['scores'];

    if (typeof scoresValue === 'object' && scoresValue !== null && !Array.isArray(scoresValue)) {
      const scores = scoresValue as Record<string, unknown>;
      if ('antiGenericity' in scores || 'conceptUtility' in scores) {
        candidate['evaluation'] = undefined;
      }
    }
  }

  if (!isSavedContentPacket(candidate)) {
    throw new Error(`Invalid SavedContentPacket payload at ${sourcePath}`);
  }

  return candidate;
}

const contentPacketRepository = createJsonEntityRepository<SavedContentPacket>({
  lockPrefix: CONTENT_PACKET_LOCK_PREFIX,
  entityLabel: 'SavedContentPacket',
  notFoundLabel: 'Content packet',
  ensureDir: ensureContentPacketsDir,
  getDir: getContentPacketsDir,
  getFilePath: getContentPacketFilePath,
  isEntity: isSavedContentPacket,
  parseEntity: parseSavedContentPacket,
});

export async function saveSavedContentPacket(packet: SavedContentPacket): Promise<void> {
  return contentPacketRepository.save(packet);
}

export async function loadSavedContentPacket(id: string): Promise<SavedContentPacket | null> {
  return contentPacketRepository.load(id);
}

export async function updateSavedContentPacket(
  id: string,
  updater: (existing: SavedContentPacket) => SavedContentPacket
): Promise<SavedContentPacket> {
  return contentPacketRepository.update(id, updater);
}

export async function deleteSavedContentPacket(id: string): Promise<void> {
  return contentPacketRepository.remove(id);
}

export async function listSavedContentPackets(): Promise<SavedContentPacket[]> {
  return contentPacketRepository.list();
}

export async function savedContentPacketExists(id: string): Promise<boolean> {
  return contentPacketRepository.exists(id);
}
