import { isSavedContentPacket, type SavedContentPacket } from '../models/saved-content-packet.js';
import {
  ensureContentPacketsDir,
  getContentPacketFilePath,
  getContentPacketsDir,
} from './file-utils.js';
import { createJsonEntityRepository } from './json-entity-repository.js';

const CONTENT_PACKET_LOCK_PREFIX = 'content-packet:';

const contentPacketRepository = createJsonEntityRepository<SavedContentPacket>({
  lockPrefix: CONTENT_PACKET_LOCK_PREFIX,
  entityLabel: 'SavedContentPacket',
  notFoundLabel: 'Content packet',
  ensureDir: ensureContentPacketsDir,
  getDir: getContentPacketsDir,
  getFilePath: getContentPacketFilePath,
  isEntity: isSavedContentPacket,
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
