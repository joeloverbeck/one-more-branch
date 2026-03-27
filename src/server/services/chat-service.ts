import { randomUUID } from 'crypto';
import type { GenerationStageCallback } from '../../engine/types.js';
import { runChatPipeline, type ChatPipelineResult } from '../../llm/index.js';
import type {
  ChatLeadInContext,
  ChatPhysicalContext,
  ChatSession,
  ChatSessionSummary,
  ChatTurn,
} from '../../models/chat/index.js';
import { ChatDomainError, parseChatInput } from '../../models/chat/index.js';
import type { StandaloneDecomposedCharacter } from '../../models/standalone-decomposed-character.js';
import { loadCharacter } from '../../persistence/character-repository.js';
import { loadWorldbuildingById } from '../../services/worldbuilding-service.js';
import {
  deleteChat,
  getRecentTurns,
  listChats,
  loadChat,
  loadTurns,
  saveChat,
  saveTurn,
} from '../../persistence/chat-repository.js';

export interface CreateChatParams {
  readonly worldbuildingId: string;
  readonly targetCharacterId: string;
  readonly interlocutorCharacterId: string;
  readonly physicalContext: ChatPhysicalContext;
  readonly leadInContext: ChatLeadInContext;
}

export interface SendTurnParams {
  readonly chatId: string;
  readonly userMessage: string;
  readonly apiKey: string;
  readonly isSessionResume?: boolean;
  readonly onGenerationStage?: GenerationStageCallback;
}

export interface SendTurnResult extends ChatPipelineResult {
  readonly userTurn: ChatTurn;
}

interface ChatServiceDeps {
  readonly loadCharacter: typeof loadCharacter;
  readonly loadWorldbuildingById: typeof loadWorldbuildingById;
  readonly saveChat: typeof saveChat;
  readonly loadChat: typeof loadChat;
  readonly listChats: typeof listChats;
  readonly deleteChat: typeof deleteChat;
  readonly saveTurn: typeof saveTurn;
  readonly loadTurns: typeof loadTurns;
  readonly getRecentTurns: typeof getRecentTurns;
  readonly parseChatInput: typeof parseChatInput;
  readonly runChatPipeline: typeof runChatPipeline;
  readonly createId: () => string;
  readonly now: () => string;
}

export interface ChatService {
  createChat(params: CreateChatParams): Promise<ChatSession>;
  sendTurn(params: SendTurnParams): Promise<SendTurnResult>;
  resumeChat(chatId: string): Promise<{ session: ChatSession; turns: ChatTurn[] }>;
  deleteChat(chatId: string): Promise<void>;
  listChats(): Promise<ChatSessionSummary[]>;
}

const defaultDeps: ChatServiceDeps = {
  loadCharacter,
  loadWorldbuildingById,
  saveChat,
  loadChat,
  listChats,
  deleteChat,
  saveTurn,
  loadTurns,
  getRecentTurns,
  parseChatInput,
  runChatPipeline,
  createId: () => randomUUID(),
  now: () => new Date().toISOString(),
};

function requireDistinctCharacterIds(params: CreateChatParams): void {
  if (params.targetCharacterId === params.interlocutorCharacterId) {
    throw new ChatDomainError(
      'Target and interlocutor must be different characters',
      'VALIDATION_FAILED'
    );
  }
}

function createMissingResourceError(
  role: 'Target' | 'Interlocutor' | 'Chat',
  id: string
): ChatDomainError {
  const message =
    role === 'Chat' ? `Chat not found: ${id}` : `${role} character not found: ${id}`;
  return new ChatDomainError(message, 'RESOURCE_NOT_FOUND');
}

async function requireCharacter(
  deps: ChatServiceDeps,
  role: 'Target' | 'Interlocutor',
  characterId: string
): Promise<StandaloneDecomposedCharacter> {
  const character = await deps.loadCharacter(characterId);
  if (character === null) {
    throw createMissingResourceError(role, characterId);
  }

  return character;
}

async function requireWorldbuilding(
  deps: ChatServiceDeps,
  worldbuildingId: string
): Promise<void> {
  const worldbuilding = await deps.loadWorldbuildingById(worldbuildingId);
  if (worldbuilding === null) {
    throw new ChatDomainError(`Worldbuilding not found: ${worldbuildingId}`, 'RESOURCE_NOT_FOUND');
  }

  if (worldbuilding.decomposedWorld === null) {
    throw new ChatDomainError(
      `Worldbuilding must be decomposed before chat creation: ${worldbuildingId}`,
      'VALIDATION_FAILED'
    );
  }
}

async function requireChatSession(deps: ChatServiceDeps, chatId: string): Promise<ChatSession> {
  const session = await deps.loadChat(chatId);
  if (session === null) {
    throw createMissingResourceError('Chat', chatId);
  }

  return session;
}

function requireParsedBlocks(
  deps: ChatServiceDeps,
  userMessage: string
): { trimmedMessage: string; blocks: ReturnType<typeof parseChatInput> } {
  const trimmedMessage = userMessage.trim();
  if (trimmedMessage.length === 0) {
    throw new ChatDomainError('User message is required', 'VALIDATION_FAILED');
  }

  const blocks = deps.parseChatInput(trimmedMessage);
  if (blocks.length === 0) {
    throw new ChatDomainError('User message is required', 'VALIDATION_FAILED');
  }

  return { trimmedMessage, blocks };
}

export function createChatService(deps: ChatServiceDeps = defaultDeps): ChatService {
  return {
    async createChat(params: CreateChatParams): Promise<ChatSession> {
      requireDistinctCharacterIds(params);

      const [targetCharacter, interlocutorCharacter] = await Promise.all([
        requireCharacter(deps, 'Target', params.targetCharacterId),
        requireCharacter(deps, 'Interlocutor', params.interlocutorCharacterId),
        requireWorldbuilding(deps, params.worldbuildingId),
      ]);

      const timestamp = deps.now();
      const session: ChatSession = {
        id: deps.createId(),
        createdAt: timestamp,
        updatedAt: timestamp,
        worldbuildingId: params.worldbuildingId,
        targetCharacterId: targetCharacter.id,
        interlocutorCharacterId: interlocutorCharacter.id,
        targetCharacterName: targetCharacter.name,
        interlocutorCharacterName: interlocutorCharacter.name,
        physicalContext: params.physicalContext,
        leadInContext: params.leadInContext,
        chatBible: null,
        turnCount: 0,
        rollingSummary: null,
        relationshipState: {
          dynamic: '',
          valence: 0,
          tension: 0,
          leverage: '',
        },
        knowledgeState: {
          knownFacts: [],
          suspicions: [],
          falseBeliefs: [],
          secretsRevealed: [],
        },
      };

      await deps.saveChat(session);
      return session;
    },

    async sendTurn(params: SendTurnParams): Promise<SendTurnResult> {
      const { trimmedMessage, blocks } = requireParsedBlocks(deps, params.userMessage);
      const session = await requireChatSession(deps, params.chatId);
      const userTurnTimestamp = deps.now();
      const userTurn: ChatTurn = {
        turnNumber: session.turnCount + 1,
        speaker: 'USER',
        blocks,
        rawText: trimmedMessage,
        timestamp: userTurnTimestamp,
      };

      await deps.saveTurn(params.chatId, userTurn);

      const [targetCharacter, interlocutorCharacter, recentTurns, allTurns] = await Promise.all([
        requireCharacter(deps, 'Target', session.targetCharacterId),
        requireCharacter(deps, 'Interlocutor', session.interlocutorCharacterId),
        deps.getRecentTurns(params.chatId, 12),
        deps.loadTurns(params.chatId),
      ]);

      const pipelineResult = await deps.runChatPipeline(
        {
          chatSession: session,
          targetCharacter,
          interlocutorCharacter,
          recentTurns,
          allTurns,
          latestUserTurn: userTurn,
          isSessionResume: params.isSessionResume ?? false,
        },
        params.apiKey,
        params.onGenerationStage
      );

      await deps.saveTurn(params.chatId, pipelineResult.characterTurn);
      await deps.saveChat(pipelineResult.updatedSession);
      return {
        userTurn,
        ...pipelineResult,
      };
    },

    async resumeChat(chatId: string): Promise<{ session: ChatSession; turns: ChatTurn[] }> {
      const session = await requireChatSession(deps, chatId);
      const turns = await deps.loadTurns(chatId);
      return { session, turns };
    },

    async deleteChat(chatId: string): Promise<void> {
      await deps.deleteChat(chatId);
    },

    async listChats(): Promise<ChatSessionSummary[]> {
      return deps.listChats();
    },
  };
}

export const chatService = createChatService();
