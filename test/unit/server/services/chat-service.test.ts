import type { ChatPipelineResult } from '@/llm';
import type { GenerationStageCallback } from '@/engine/types';
import type {
  ChatLeadInContext,
  ChatPhysicalContext,
  ChatSession,
  ChatSessionSummary,
  ChatTurn,
} from '@/models/chat';
import type { StandaloneDecomposedCharacter } from '@/models/standalone-decomposed-character';
import { createChatService } from '@/server/services/chat-service';

type ChatServiceDeps = NonNullable<Parameters<typeof createChatService>[0]>;

function createCharacter(
  id: string,
  name: string
): StandaloneDecomposedCharacter {
  return {
    id,
    name,
    rawDescription: `${name} in one sentence.`,
    speechFingerprint: {
      catchphrases: [],
      vocabularyProfile: 'Precise',
      sentencePatterns: 'Short statements.',
      verbalTics: [],
      dialogueSamples: [],
      metaphorFrames: '',
      antiExamples: [],
      discourseMarkers: [],
      registerShifts: '',
    },
    coreTraits: ['guarded'],
    knowledgeBoundaries: 'Knows enough.',
    decisionPattern: 'Acts quickly.',
    coreBeliefs: ['Trust is expensive.'],
    conflictPriority: 'Maintain leverage.',
    appearance: 'Impeccably dressed.',
    createdAt: '2026-03-27T09:00:00.000Z',
  };
}

function createPhysicalContext(): ChatPhysicalContext {
  return {
    location: 'Archive',
    microLocation: 'Reading alcove',
    timeOfDay: 'EVENING',
    privacy: 'PRIVATE',
    distanceBand: 'CONVERSATIONAL',
    characterActivity: 'Cataloguing ledgers',
    interactableObjects: ['ledger', 'lamp'],
    ambientConditions: ['rain', 'dust'],
  };
}

function createLeadInContext(): ChatLeadInContext {
  return {
    leadInSummary: 'They agreed to meet after the raid.',
    recentEvents: ['A witness disappeared.'],
    whyNow: 'The ledger has to be found before dawn.',
  };
}

function createSession(overrides: Partial<ChatSession> = {}): ChatSession {
  return {
    id: 'chat-1',
    createdAt: '2026-03-27T09:00:00.000Z',
    updatedAt: '2026-03-27T09:00:00.000Z',
    targetCharacterId: 'target-1',
    interlocutorCharacterId: 'interlocutor-1',
    targetCharacterName: 'Mara',
    interlocutorCharacterName: 'Iven',
    physicalContext: createPhysicalContext(),
    leadInContext: createLeadInContext(),
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
    ...overrides,
  };
}

function createUserTurn(overrides: Partial<ChatTurn> = {}): ChatTurn {
  return {
    turnNumber: 1,
    speaker: 'USER',
    blocks: [{ type: 'SPEECH', text: 'Tell me what happened.' }],
    rawText: 'Tell me what happened.',
    timestamp: '2026-03-27T09:01:00.000Z',
    ...overrides,
  };
}

function createCharacterTurn(overrides: Partial<ChatTurn> = {}): ChatTurn {
  return {
    turnNumber: 2,
    speaker: 'CHARACTER',
    blocks: [{ type: 'SPEECH', text: 'You already know enough.' }],
    turnMeta: {
      expectsReply: true,
      endsWithQuestion: false,
      visibleEmotion: 'controlled suspicion',
      finalPressure: null,
    },
    plannerOutput: {
      internalSelfCheck: {
        whatDoIWant: 'Keep control.',
        whatDoIKnow: 'The ledger moved before dawn.',
        whatAmIHiding: 'I took a copy.',
        howHonestAmI: 'Only enough to test him.',
      },
      responseGoal: 'Deflect and probe.',
      speechAct: 'DEFLECT',
      honestyMode: 'PARTIAL',
      surfaceEmotion: 'calm',
      suppressedEmotion: 'fear',
      subtext: 'I am not the only one lying.',
      mustAddress: ['the ledger'],
      mustAvoid: ['the copy'],
      blockPlan: ['SPEECH'],
      actionPlan: [],
      questionBack: null,
      targetLength: 'SHORT',
      expectedImpact: {
        relationshipDeltaHint: 0,
        tensionDeltaHint: 1,
        revealsSecret: false,
      },
    },
    stateUpdate: {
      summaryDelta: 'The conversation hardens into suspicion.',
      relationshipShifts: [],
      knowledgeChanges: {
        newKnownFacts: [],
        newSuspicions: ['He is testing her.'],
        falseBeliefsCorrected: [],
        secretsRevealed: [],
      },
      conversationUpdate: {
        commitmentsMade: [],
        threatsMade: [],
        questionsOpened: ['Who moved the ledger?'],
        questionsResolved: [],
      },
      physicalStateUpdate: {
        locationChanged: false,
        newLocation: null,
        newMicroLocation: null,
        newDistanceBand: 'CONVERSATIONAL',
        objectStateChanges: [],
      },
      shouldRefreshChatBible: false,
      shouldTriggerSummary: false,
    },
    timestamp: '2026-03-27T09:02:00.000Z',
    ...overrides,
  };
}

function createPipelineResult(overrides: Partial<ChatPipelineResult> = {}): ChatPipelineResult {
  return {
    characterTurn: createCharacterTurn(),
    updatedSession: createSession({
      turnCount: 2,
      updatedAt: '2026-03-27T09:02:00.000Z',
    }),
    bibleWasRefreshed: false,
    summaryWasGenerated: false,
    ...overrides,
  };
}

function createSummary(): ChatSessionSummary {
  return {
    id: 'chat-1',
    targetCharacterName: 'Mara',
    interlocutorCharacterName: 'Iven',
    turnCount: 2,
    updatedAt: '2026-03-27T09:02:00.000Z',
    location: 'Archive',
  };
}

function createDeps(overrides: Partial<ChatServiceDeps> = {}): ChatServiceDeps {
  return {
    loadCharacter: jest.fn((characterId: string) => {
      if (characterId === 'target-1') {
        return Promise.resolve(createCharacter('target-1', 'Mara'));
      }
      if (characterId === 'interlocutor-1') {
        return Promise.resolve(createCharacter('interlocutor-1', 'Iven'));
      }
      return Promise.resolve(null);
    }),
    saveChat: jest.fn().mockResolvedValue(undefined),
    loadChat: jest.fn().mockResolvedValue(createSession()),
    listChats: jest.fn().mockResolvedValue([createSummary()]),
    deleteChat: jest.fn().mockResolvedValue(undefined),
    saveTurn: jest.fn().mockResolvedValue(undefined),
    loadTurns: jest.fn().mockResolvedValue([createUserTurn()]),
    getRecentTurns: jest.fn().mockResolvedValue([createUserTurn()]),
    parseChatInput: jest.fn().mockReturnValue([{ type: 'SPEECH', text: 'Tell me what happened.' }]),
    runChatPipeline: jest.fn().mockResolvedValue(createPipelineResult()),
    createId: jest.fn().mockReturnValue('chat-created'),
    now: jest.fn().mockReturnValue('2026-03-27T09:00:00.000Z'),
    ...overrides,
  };
}

describe('chat-service', () => {
  it('rejects chat creation when target and interlocutor are the same', async () => {
    const service = createChatService(createDeps());

    await expect(
      service.createChat({
        targetCharacterId: 'target-1',
        interlocutorCharacterId: 'target-1',
        physicalContext: createPhysicalContext(),
        leadInContext: createLeadInContext(),
      })
    ).rejects.toThrow('Target and interlocutor must be different characters');
  });

  it('rejects chat creation when the target character is missing', async () => {
    const deps = createDeps({
      loadCharacter: jest.fn((characterId: string) => {
        if (characterId === 'target-1') {
          return null;
        }
        return createCharacter(characterId, 'Iven');
      }),
    });
    const service = createChatService(deps);

    await expect(
      service.createChat({
        targetCharacterId: 'target-1',
        interlocutorCharacterId: 'interlocutor-1',
        physicalContext: createPhysicalContext(),
        leadInContext: createLeadInContext(),
      })
    ).rejects.toThrow('Target character not found: target-1');
  });

  it('creates and saves a chat with canonical initial state', async () => {
    const deps = createDeps();
    const service = createChatService(deps);

    const session = await service.createChat({
      targetCharacterId: 'target-1',
      interlocutorCharacterId: 'interlocutor-1',
      physicalContext: createPhysicalContext(),
      leadInContext: createLeadInContext(),
    });

    expect(session).toEqual(createSession({
      id: 'chat-created',
      createdAt: '2026-03-27T09:00:00.000Z',
      updatedAt: '2026-03-27T09:00:00.000Z',
    }));
    expect(deps.saveChat).toHaveBeenCalledWith(session);
  });

  it('saves the user turn before calling the pipeline', async () => {
    const callOrder: string[] = [];
    const deps = createDeps({
      saveTurn: jest.fn((_chatId: string, turn: ChatTurn) => {
        callOrder.push(`saveTurn:${turn.speaker}`);
        return Promise.resolve();
      }),
      runChatPipeline: jest.fn(() => {
        callOrder.push('pipeline');
        return createPipelineResult();
      }),
      now: jest.fn()
        .mockReturnValueOnce('2026-03-27T09:01:00.000Z')
        .mockReturnValue('2026-03-27T09:01:00.000Z'),
    });
    const service = createChatService(deps);

    await service.sendTurn({
      chatId: 'chat-1',
      userMessage: '  Tell me what happened.  ',
      apiKey: 'test-key',
    });

    expect(callOrder).toEqual(['saveTurn:USER', 'pipeline', 'saveTurn:CHARACTER']);
  });

  it('saves the character turn after the pipeline and persists the updated session', async () => {
    const pipelineResult = createPipelineResult();
    const deps = createDeps({
      runChatPipeline: jest.fn().mockResolvedValue(pipelineResult),
      now: jest.fn().mockReturnValue('2026-03-27T09:01:00.000Z'),
    });
    const service = createChatService(deps);

    const result = await service.sendTurn({
      chatId: 'chat-1',
      userMessage: 'Tell me what happened.',
      apiKey: 'test-key',
    });

    expect(result).toBe(pipelineResult);
    expect(deps.saveTurn).toHaveBeenNthCalledWith(
      1,
      'chat-1',
      createUserTurn({ timestamp: '2026-03-27T09:01:00.000Z' })
    );
    expect(deps.saveTurn).toHaveBeenNthCalledWith(2, 'chat-1', pipelineResult.characterTurn);
    expect(deps.saveChat).toHaveBeenCalledWith(pipelineResult.updatedSession);
  });

  it('rejects sendTurn when the chat session is missing', async () => {
    const service = createChatService(
      createDeps({
        loadChat: jest.fn().mockResolvedValue(null),
      })
    );

    await expect(
      service.sendTurn({
        chatId: 'missing-chat',
        userMessage: 'Tell me what happened.',
        apiKey: 'test-key',
      })
    ).rejects.toThrow('Chat not found: missing-chat');
  });

  it('rejects empty user input before persistence', async () => {
    const deps = createDeps();
    const service = createChatService(deps);

    await expect(
      service.sendTurn({
        chatId: 'chat-1',
        userMessage: '   ',
        apiKey: 'test-key',
      })
    ).rejects.toThrow('User message is required');

    expect(deps.saveTurn).not.toHaveBeenCalled();
    expect(deps.runChatPipeline).not.toHaveBeenCalled();
  });

  it('rejects parsed-empty user input before persistence', async () => {
    const deps = createDeps({
      parseChatInput: jest.fn().mockReturnValue([]),
    });
    const service = createChatService(deps);

    await expect(
      service.sendTurn({
        chatId: 'chat-1',
        userMessage: '*  *',
        apiKey: 'test-key',
      })
    ).rejects.toThrow('User message is required');

    expect(deps.saveTurn).not.toHaveBeenCalled();
    expect(deps.runChatPipeline).not.toHaveBeenCalled();
  });

  it('forwards explicit resume intent to the pipeline and defaults it to false', async () => {
    const deps = createDeps({
      now: jest.fn().mockReturnValue('2026-03-27T09:01:00.000Z'),
    });
    const service = createChatService(deps);

    await service.sendTurn({
      chatId: 'chat-1',
      userMessage: 'Tell me what happened.',
      apiKey: 'test-key',
      isSessionResume: true,
    });

    expect(deps.runChatPipeline).toHaveBeenLastCalledWith(
      expect.objectContaining({ isSessionResume: true }),
      'test-key',
      undefined
    );

    await service.sendTurn({
      chatId: 'chat-1',
      userMessage: 'Tell me what happened.',
      apiKey: 'test-key',
    });

    expect(deps.runChatPipeline).toHaveBeenLastCalledWith(
      expect.objectContaining({ isSessionResume: false }),
      'test-key',
      undefined
    );
  });

  it('forwards route progress callbacks into the chat pipeline when provided', async () => {
    const onGenerationStage: GenerationStageCallback = jest.fn();
    const deps = createDeps({
      now: jest.fn().mockReturnValue('2026-03-27T09:01:00.000Z'),
    });
    const service = createChatService(deps);

    await service.sendTurn({
      chatId: 'chat-1',
      userMessage: 'Tell me what happened.',
      apiKey: 'test-key',
      onGenerationStage,
    });

    expect(deps.runChatPipeline).toHaveBeenLastCalledWith(
      expect.objectContaining({ isSessionResume: false }),
      'test-key',
      onGenerationStage
    );
  });

  it('returns a chat session and all turns when resuming', async () => {
    const turns = [createUserTurn(), createCharacterTurn()];
    const service = createChatService(
      createDeps({
        loadTurns: jest.fn().mockResolvedValue(turns),
      })
    );

    await expect(service.resumeChat('chat-1')).resolves.toEqual({
      session: createSession(),
      turns,
    });
  });

  it('rejects resumeChat when the session is missing', async () => {
    const service = createChatService(
      createDeps({
        loadChat: jest.fn().mockResolvedValue(null),
      })
    );

    await expect(service.resumeChat('missing-chat')).rejects.toThrow('Chat not found: missing-chat');
  });

  it('delegates deleteChat and listChats to the repository', async () => {
    const deps = createDeps();
    const service = createChatService(deps);

    await service.deleteChat('chat-1');
    await expect(service.listChats()).resolves.toEqual([createSummary()]);

    expect(deps.deleteChat).toHaveBeenCalledWith('chat-1');
    expect(deps.listChats).toHaveBeenCalled();
  });
});
