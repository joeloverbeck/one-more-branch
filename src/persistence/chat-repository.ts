import type { ChatSession, ChatSessionSummary, ChatTurn } from '../models/chat/index.js';
import {
  parseChatSession,
  parseChatTurn,
  parseChatTurns,
} from '../models/chat/chat-validation.js';
import {
  deleteDirectory,
  ensureChatsDir,
  ensureDirectory,
  getChatDir,
  getChatSessionFilePath,
  getChatTurnsFilePath,
  getChatsDir,
  listDirectories,
  writeJsonFile,
} from './file-utils.js';
import { createJsonFileStore } from './json-file-store.js';
import { withLock } from './lock-manager.js';

const CHAT_LOCK_PREFIX = 'chat:';

function getChatLockKey(chatId: string): string {
  return `${CHAT_LOCK_PREFIX}${chatId}`;
}

async function ensureChatWriteTarget(chatId: string): Promise<void> {
  ensureChatsDir();
  await ensureDirectory(getChatDir(chatId));
}

const chatSessionStore = createJsonFileStore<string, unknown>({
  getFilePath: getChatSessionFilePath,
  getLockKey: getChatLockKey,
  ensureWriteTarget: ensureChatWriteTarget,
});

const chatTurnsStore = createJsonFileStore<string, unknown>({
  getFilePath: getChatTurnsFilePath,
  getLockKey: getChatLockKey,
  ensureWriteTarget: ensureChatWriteTarget,
});

function toChatSessionSummary(session: ChatSession): ChatSessionSummary {
  return {
    id: session.id,
    targetCharacterName: session.targetCharacterName,
    interlocutorCharacterName: session.interlocutorCharacterName,
    turnCount: session.turnCount,
    updatedAt: session.updatedAt,
    location: session.physicalContext.location,
  };
}

export async function saveChat(session: ChatSession): Promise<void> {
  const filePath = getChatSessionFilePath(session.id);
  const validated = parseChatSession(session, filePath);
  await chatSessionStore.write(session.id, validated);
}

export async function loadChat(chatId: string): Promise<ChatSession | null> {
  const filePath = getChatSessionFilePath(chatId);
  const payload = await chatSessionStore.read(chatId);
  if (payload === null) {
    return null;
  }

  return parseChatSession(payload, filePath);
}

export async function listChats(): Promise<ChatSessionSummary[]> {
  const chatIds = await listDirectories(getChatsDir());
  const summaries: ChatSessionSummary[] = [];

  for (const chatId of chatIds) {
    const session = await loadChat(chatId);
    if (session !== null) {
      summaries.push(toChatSessionSummary(session));
    }
  }

  summaries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return summaries;
}

export async function updateChat(
  chatId: string,
  updater: (session: ChatSession) => ChatSession
): Promise<ChatSession> {
  return chatSessionStore.runWithLock(chatId, async () => {
    const filePath = getChatSessionFilePath(chatId);
    const existing = await chatSessionStore.read(chatId);

    if (existing === null) {
      throw new Error(`Chat not found: ${chatId}`);
    }

    const parsedExisting = parseChatSession(existing, filePath);
    const updated = parseChatSession(updater(parsedExisting), filePath);

    if (updated.id !== chatId) {
      throw new Error(`Chat ID mismatch for update: expected ${chatId}, received ${updated.id}`);
    }

    await ensureChatWriteTarget(chatId);
    await writeJsonFile(filePath, updated);
    return updated;
  });
}

export async function deleteChat(chatId: string): Promise<void> {
  await withLock(getChatLockKey(chatId), async () => {
    await deleteDirectory(getChatDir(chatId));
  });
}

export async function saveTurn(chatId: string, turn: ChatTurn): Promise<void> {
  await chatTurnsStore.runWithLock(chatId, async () => {
    const filePath = getChatTurnsFilePath(chatId);
    const existing = await chatTurnsStore.read(chatId);
    const turns = existing === null ? [] : parseChatTurns(existing, filePath);
    const validatedTurn = parseChatTurn(turn, filePath);

    turns.push(validatedTurn);
    await ensureChatWriteTarget(chatId);
    await writeJsonFile(filePath, turns);
  });
}

export async function loadTurns(chatId: string): Promise<ChatTurn[]> {
  const filePath = getChatTurnsFilePath(chatId);
  const payload = await chatTurnsStore.read(chatId);
  if (payload === null) {
    return [];
  }

  return parseChatTurns(payload, filePath);
}

export async function getRecentTurns(chatId: string, count: number): Promise<ChatTurn[]> {
  if (count <= 0) {
    return [];
  }

  const turns = await loadTurns(chatId);
  return turns.slice(-count);
}
