import { randomUUID } from 'crypto';
import type { ChatSession, ChatTurn } from '@/models/chat';
import {
  deleteChat,
  getRecentTurns,
  listChats,
  loadChat,
  loadTurns,
  saveChat,
  saveTurn,
  updateChat,
} from '@/persistence/chat-repository';
import {
  directoryExists,
  ensureDirectory,
  getChatDir,
  getChatSessionFilePath,
  getChatTurnsFilePath,
  writeJsonFile,
} from '@/persistence/file-utils';

const TEST_PREFIX = 'TEST: CHACHASYS-002';

function createChatSession(id: string, updatedAt = '2026-03-27T09:05:00.000Z'): ChatSession {
  return {
    id,
    createdAt: '2026-03-27T09:00:00.000Z',
    updatedAt,
    targetCharacterId: 'target-1',
    interlocutorCharacterId: 'interlocutor-1',
    targetCharacterName: 'Mara',
    interlocutorCharacterName: 'Iven',
    physicalContext: {
      location: 'Archive',
      microLocation: 'Lamp-lit table',
      timeOfDay: 'EVENING',
      privacy: 'PRIVATE',
      distanceBand: 'CONVERSATIONAL',
      characterActivity: 'Sorting ledgers',
      interactableObjects: ['ledger', 'lamp'],
      ambientConditions: ['rain', 'ink smell'],
    },
    leadInContext: {
      leadInSummary: 'They arrive separately after the raid.',
      recentEvents: ['A guard vanished.'],
      whyNow: 'The ledger cannot stay missing until dawn.',
    },
    chatBible: null,
    turnCount: 0,
    rollingSummary: null,
    relationshipState: {
      dynamic: 'strained allies',
      valence: -1,
      tension: 7,
      leverage: 'Shared culpability',
    },
    knowledgeState: {
      knownFacts: ['The ledger is gone.'],
      suspicions: ['Someone inside helped.'],
      falseBeliefs: ['He thinks she came alone.'],
      secretsRevealed: [],
    },
  };
}

function createChatTurn(turnNumber: number, speaker: ChatTurn['speaker']): ChatTurn {
  return {
    turnNumber,
    speaker,
    blocks:
      speaker === 'USER'
        ? [{ type: 'SPEECH', text: 'Tell me what you hid.' }]
        : [
            { type: 'ACTION', text: 'She steadies the lamp with two fingers.' },
            { type: 'SPEECH', delivery: 'low', text: 'You knew it would be missing.' },
          ],
    ...(speaker === 'USER'
      ? { rawText: 'Tell me what you hid.' }
      : {
          turnMeta: {
            expectsReply: true,
            endsWithQuestion: false,
            visibleEmotion: 'controlled suspicion',
            finalPressure: 'She refuses to let him redirect.',
          },
          plannerOutput: {
            internalSelfCheck: {
              whatDoIWant: 'An admission I can use later.',
              whatDoIKnow: 'He reached the vault before the alarm.',
              whatAmIHiding: 'I copied the ledger already.',
              howHonestAmI: 'Only as honest as leverage requires.',
            },
            responseGoal: 'Corner him without losing composure.',
            speechAct: 'CHALLENGE',
            honestyMode: 'PARTIAL',
            surfaceEmotion: 'cold focus',
            suppressedEmotion: 'fear',
            subtext: 'I already know enough to hurt you.',
            mustAddress: ['the missing ledger'],
            mustAvoid: ['the copied ledger'],
            blockPlan: ['ACTION', 'SPEECH'],
            actionPlan: [
              {
                kind: 'GESTURE',
                text: 'She taps the table once.',
                changesPhysicalState: false,
              },
            ],
            questionBack: null,
            targetLength: 'SHORT',
            expectedImpact: {
              relationshipDeltaHint: -1,
              tensionDeltaHint: 1,
              revealsSecret: false,
            },
          },
          stateUpdate: {
            summaryDelta: 'The exchange sharpens into a veiled accusation.',
            relationshipShifts: [
              {
                shiftDescription: 'Trust drops after the evasive answer.',
                suggestedValenceChange: -1,
                suggestedTensionChange: 2,
                suggestedNewDynamic: 'mutual suspicion',
              },
            ],
            knowledgeChanges: {
              newKnownFacts: ['The ledger is missing.'],
              newSuspicions: ['He may have hidden it on purpose.'],
              falseBeliefsCorrected: [],
              secretsRevealed: ['She knows about the second key.'],
            },
            conversationUpdate: {
              commitmentsMade: ['They will meet again at dawn.'],
              threatsMade: ['She warns him not to run.'],
              questionsOpened: ['Who moved the ledger?'],
              questionsResolved: [],
            },
            physicalStateUpdate: {
              locationChanged: false,
              newLocation: null,
              newMicroLocation: null,
              newDistanceBand: 'ARM_REACH',
              objectStateChanges: ['The ledger drawer remains open.'],
            },
            shouldRefreshChatBible: true,
            shouldTriggerSummary: false,
          },
        }),
    timestamp: `2026-03-27T09:0${turnNumber}:00.000Z`,
  };
}

describe('chat-repository', () => {
  const createdChatIds = new Set<string>();

  afterEach(async () => {
    for (const chatId of createdChatIds) {
      await deleteChat(chatId);
    }
    createdChatIds.clear();
  });

  it('saves and loads a chat session', async () => {
    const chatId = `${TEST_PREFIX}-${randomUUID()}`;
    createdChatIds.add(chatId);
    const session = createChatSession(chatId);

    await saveChat(session);

    await expect(loadChat(chatId)).resolves.toEqual(session);
  });

  it('returns null for a missing chat session', async () => {
    await expect(loadChat(`${TEST_PREFIX}-${randomUUID()}`)).resolves.toBeNull();
  });

  it('saves and loads turns, appending without losing earlier turns', async () => {
    const chatId = `${TEST_PREFIX}-${randomUUID()}`;
    createdChatIds.add(chatId);

    const firstTurn = createChatTurn(1, 'USER');
    const secondTurn = createChatTurn(2, 'CHARACTER');

    await saveTurn(chatId, firstTurn);
    await saveTurn(chatId, secondTurn);

    await expect(loadTurns(chatId)).resolves.toEqual([firstTurn, secondTurn]);
  });

  it('returns recent turns from the end of the transcript', async () => {
    const chatId = `${TEST_PREFIX}-${randomUUID()}`;
    createdChatIds.add(chatId);

    await saveTurn(chatId, createChatTurn(1, 'USER'));
    await saveTurn(chatId, createChatTurn(2, 'CHARACTER'));
    await saveTurn(chatId, createChatTurn(3, 'USER'));

    await expect(getRecentTurns(chatId, 2)).resolves.toEqual([
      createChatTurn(2, 'CHARACTER'),
      createChatTurn(3, 'USER'),
    ]);
    await expect(getRecentTurns(chatId, 0)).resolves.toEqual([]);
  });

  it('lists chats as summaries sorted by updatedAt descending', async () => {
    const olderId = `${TEST_PREFIX}-${randomUUID()}`;
    const newerId = `${TEST_PREFIX}-${randomUUID()}`;
    createdChatIds.add(olderId);
    createdChatIds.add(newerId);

    await saveChat(createChatSession(olderId, '2026-03-27T08:00:00.000Z'));
    await saveChat(createChatSession(newerId, '2026-03-27T10:00:00.000Z'));

    const listed = await listChats();
    const orderedIds = listed
      .filter((chat) => chat.id === olderId || chat.id === newerId)
      .map((chat) => chat.id);

    expect(orderedIds).toEqual([newerId, olderId]);
    expect(listed.find((chat) => chat.id === newerId)).toEqual({
      id: newerId,
      targetCharacterName: 'Mara',
      interlocutorCharacterName: 'Iven',
      turnCount: 0,
      updatedAt: '2026-03-27T10:00:00.000Z',
      location: 'Archive',
    });
  });

  it('updates an existing chat and persists the result', async () => {
    const chatId = `${TEST_PREFIX}-${randomUUID()}`;
    createdChatIds.add(chatId);
    await saveChat(createChatSession(chatId));

    const updated = await updateChat(chatId, (existing) => ({
      ...existing,
      updatedAt: '2026-03-27T11:00:00.000Z',
      turnCount: existing.turnCount + 1,
    }));

    expect(updated.turnCount).toBe(1);
    await expect(loadChat(chatId)).resolves.toEqual(updated);
  });

  it('deletes a chat directory and remains safe on repeated deletes', async () => {
    const chatId = `${TEST_PREFIX}-${randomUUID()}`;
    createdChatIds.add(chatId);
    await saveChat(createChatSession(chatId));

    await expect(directoryExists(getChatDir(chatId))).resolves.toBe(true);

    await deleteChat(chatId);
    await deleteChat(chatId);
    createdChatIds.delete(chatId);

    await expect(directoryExists(getChatDir(chatId))).resolves.toBe(false);
  });

  it('throws for malformed persisted chat sessions', async () => {
    const chatId = `${TEST_PREFIX}-${randomUUID()}`;
    createdChatIds.add(chatId);
    await ensureDirectory(getChatDir(chatId));
    await writeJsonFile(getChatSessionFilePath(chatId), {
      id: chatId,
      updatedAt: '2026-03-27T09:05:00.000Z',
    });

    await expect(loadChat(chatId)).rejects.toThrow(
      `Invalid chat session payload at ${getChatSessionFilePath(chatId)}`
    );
  });

  it('throws for malformed persisted turns', async () => {
    const chatId = `${TEST_PREFIX}-${randomUUID()}`;
    createdChatIds.add(chatId);
    await ensureDirectory(getChatDir(chatId));
    await writeJsonFile(getChatTurnsFilePath(chatId), [{ turnNumber: 1, speaker: 'USER' }]);

    await expect(loadTurns(chatId)).rejects.toThrow(
      `Invalid chat turns payload at ${getChatTurnsFilePath(chatId)}`
    );
  });
});
