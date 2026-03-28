import { ChatDomainError, type ChatSession, type ChatSessionSummary, type ChatTurn } from '../models/chat/index.js';
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
  getChatStateFilePath,
  getChatsDir,
  listDirectories,
  readJsonFile,
  writeJsonFile,
} from './file-utils.js';
import { withLock } from './lock-manager.js';

const CHAT_LOCK_PREFIX = 'chat:';

interface ChatAggregate {
  readonly session: ChatSession;
  readonly turns: ChatTurn[];
}

export interface CommitChatTurnParams {
  readonly userTurn: ChatTurn;
  readonly characterTurn: ChatTurn;
  readonly updatedSession: ChatSession;
}

function getChatLockKey(chatId: string): string {
  return `${CHAT_LOCK_PREFIX}${chatId}`;
}

async function ensureChatWriteTarget(chatId: string): Promise<void> {
  ensureChatsDir();
  await ensureDirectory(getChatDir(chatId));
}

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

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseChatAggregate(value: unknown, sourcePath: string): ChatAggregate {
  if (!isObjectRecord(value)) {
    throw new ChatDomainError(
      `Invalid chat aggregate payload at ${sourcePath}`,
      'INVALID_PERSISTED_DATA'
    );
  }

  return {
    session: parseChatSession(value['session'], sourcePath),
    turns: parseChatTurns(value['turns'], sourcePath),
  };
}

async function loadChatAggregate(chatId: string): Promise<ChatAggregate | null> {
  const filePath = getChatStateFilePath(chatId);
  const payload = await readJsonFile<unknown>(filePath);
  if (payload === null) {
    return null;
  }

  const aggregate = parseChatAggregate(payload, filePath);
  if (aggregate.session.id !== chatId) {
    throw new ChatDomainError(
      `Chat ID mismatch in persisted aggregate: expected ${chatId}, received ${aggregate.session.id}`,
      'RESOURCE_CONFLICT'
    );
  }

  return aggregate;
}

async function requireChatAggregate(chatId: string): Promise<ChatAggregate> {
  const aggregate = await loadChatAggregate(chatId);
  if (aggregate === null) {
    throw new ChatDomainError(`Chat not found: ${chatId}`, 'RESOURCE_NOT_FOUND');
  }

  return aggregate;
}

async function writeChatAggregate(chatId: string, aggregate: ChatAggregate): Promise<void> {
  const filePath = getChatStateFilePath(chatId);
  await ensureChatWriteTarget(chatId);
  await writeJsonFile(filePath, aggregate);
}

function validateCommitTurns(chatId: string, params: CommitChatTurnParams): {
  readonly userTurn: ChatTurn;
  readonly characterTurn: ChatTurn;
  readonly updatedSession: ChatSession;
} {
  const filePath = getChatStateFilePath(chatId);
  const userTurn = parseChatTurn(params.userTurn, filePath);
  const characterTurn = parseChatTurn(params.characterTurn, filePath);
  const updatedSession = parseChatSession(params.updatedSession, filePath);

  if (updatedSession.id !== chatId) {
    throw new ChatDomainError(
      `Chat ID mismatch for commit: expected ${chatId}, received ${updatedSession.id}`,
      'RESOURCE_CONFLICT'
    );
  }

  if (userTurn.speaker !== 'USER') {
    throw new ChatDomainError('Atomic chat commit requires userTurn speaker USER', 'INVARIANT_VIOLATION');
  }

  if (characterTurn.speaker !== 'CHARACTER') {
    throw new ChatDomainError(
      'Atomic chat commit requires characterTurn speaker CHARACTER',
      'INVARIANT_VIOLATION'
    );
  }

  if (characterTurn.turnNumber !== userTurn.turnNumber + 1) {
    throw new ChatDomainError(
      `Atomic chat commit requires consecutive turn numbers, received ${userTurn.turnNumber} and ${characterTurn.turnNumber}`,
      'INVARIANT_VIOLATION'
    );
  }

  return {
    userTurn,
    characterTurn,
    updatedSession,
  };
}

export async function saveChat(session: ChatSession): Promise<void> {
  await withLock(getChatLockKey(session.id), async () => {
    const filePath = getChatStateFilePath(session.id);
    const validatedSession = parseChatSession(session, filePath);
    const existing = await loadChatAggregate(session.id);

    await writeChatAggregate(session.id, {
      session: validatedSession,
      turns: existing?.turns ?? [],
    });
  });
}

export async function loadChat(chatId: string): Promise<ChatSession | null> {
  const aggregate = await loadChatAggregate(chatId);
  return aggregate?.session ?? null;
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
  return withLock(getChatLockKey(chatId), async () => {
    const aggregate = await requireChatAggregate(chatId);
    const filePath = getChatStateFilePath(chatId);
    const updated = parseChatSession(updater(aggregate.session), filePath);

    if (updated.id !== chatId) {
      throw new ChatDomainError(
        `Chat ID mismatch for update: expected ${chatId}, received ${updated.id}`,
        'RESOURCE_CONFLICT'
      );
    }

    await writeChatAggregate(chatId, {
      session: updated,
      turns: aggregate.turns,
    });

    return updated;
  });
}

export async function deleteChat(chatId: string): Promise<void> {
  await withLock(getChatLockKey(chatId), async () => {
    await deleteDirectory(getChatDir(chatId));
  });
}

export async function saveTurn(chatId: string, turn: ChatTurn): Promise<void> {
  await withLock(getChatLockKey(chatId), async () => {
    const aggregate = await requireChatAggregate(chatId);
    const filePath = getChatStateFilePath(chatId);
    const validatedTurn = parseChatTurn(turn, filePath);

    await writeChatAggregate(chatId, {
      session: aggregate.session,
      turns: [...aggregate.turns, validatedTurn],
    });
  });
}

export async function commitChatTurn(
  chatId: string,
  params: CommitChatTurnParams
): Promise<ChatSession> {
  return withLock(getChatLockKey(chatId), async () => {
    const aggregate = await requireChatAggregate(chatId);
    const { userTurn, characterTurn, updatedSession } = validateCommitTurns(chatId, params);

    await writeChatAggregate(chatId, {
      session: updatedSession,
      turns: [...aggregate.turns, userTurn, characterTurn],
    });

    return updatedSession;
  });
}

export async function loadTurns(chatId: string): Promise<ChatTurn[]> {
  const aggregate = await loadChatAggregate(chatId);
  return aggregate?.turns ?? [];
}

export async function getRecentTurns(chatId: string, count: number): Promise<ChatTurn[]> {
  if (count <= 0) {
    return [];
  }

  const turns = await loadTurns(chatId);
  return turns.slice(-count);
}
