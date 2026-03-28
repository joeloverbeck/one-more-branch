import type { ChatPipelineResult } from '@/llm';
import type { GenerationStageCallback } from '@/engine/types';
import type {
  ChatDomainError,
  ChatLeadInContext,
  ChatPhysicalContext,
  ChatSession,
  ChatSessionSummary,
  ChatTurn,
} from '@/models/chat';
import type { StandaloneDecomposedCharacter } from '@/models/standalone-decomposed-character';
import type { SavedWorldbuilding } from '@/models/saved-worldbuilding';
import { ChatDomainError as ChatDomainErrorClass } from '@/models/chat';
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
    worldbuildingId: 'world-1',
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

function createWorldbuilding(
  overrides: Partial<SavedWorldbuilding> = {}
): SavedWorldbuilding {
  return {
    id: 'world-1',
    name: 'The Salt Archive',
    sourceKind: 'RAW_DECOMPOSED',
    createdAt: '2026-03-27T08:00:00.000Z',
    updatedAt: '2026-03-27T08:00:00.000Z',
    inputs: {},
    worldSeed: null,
    rawWorldMarkdown: null,
    rawSourceText: 'A city built into a flooded archive.',
    decomposedWorld: {
      facts: [],
      openQuestions: [],
      rawWorldbuilding: 'A city built into a flooded archive.',
    },
    completedStages: [],
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
    loadWorldbuildingById: jest.fn().mockResolvedValue(createWorldbuilding()),
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
        worldbuildingId: 'world-1',
        targetCharacterId: 'target-1',
        interlocutorCharacterId: 'target-1',
        physicalContext: createPhysicalContext(),
        leadInContext: createLeadInContext(),
      })
    ).rejects.toMatchObject<Partial<ChatDomainError>>({
      name: 'ChatDomainError',
      code: 'VALIDATION_FAILED',
      message: 'Target and interlocutor must be different characters',
    });
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
        worldbuildingId: 'world-1',
        targetCharacterId: 'target-1',
        interlocutorCharacterId: 'interlocutor-1',
        physicalContext: createPhysicalContext(),
        leadInContext: createLeadInContext(),
      })
    ).rejects.toBeInstanceOf(ChatDomainErrorClass);

    await expect(
      service.createChat({
        worldbuildingId: 'world-1',
        targetCharacterId: 'target-1',
        interlocutorCharacterId: 'interlocutor-1',
        physicalContext: createPhysicalContext(),
        leadInContext: createLeadInContext(),
      })
    ).rejects.toMatchObject<Partial<ChatDomainError>>({
      code: 'RESOURCE_NOT_FOUND',
      message: 'Target character not found: target-1',
    });
  });

  it('creates and saves a chat with canonical initial state', async () => {
    const deps = createDeps();
    const service = createChatService(deps);

    const session = await service.createChat({
      worldbuildingId: 'world-1',
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

  it('rejects chat creation when the worldbuilding is missing', async () => {
    const service = createChatService(
      createDeps({
        loadWorldbuildingById: jest.fn().mockResolvedValue(null),
      })
    );

    await expect(
      service.createChat({
        worldbuildingId: 'world-404',
        targetCharacterId: 'target-1',
        interlocutorCharacterId: 'interlocutor-1',
        physicalContext: createPhysicalContext(),
        leadInContext: createLeadInContext(),
      })
    ).rejects.toMatchObject<Partial<ChatDomainError>>({
      code: 'RESOURCE_NOT_FOUND',
      message: 'Worldbuilding not found: world-404',
    });
  });

  it('rejects chat creation when the worldbuilding has not been decomposed', async () => {
    const service = createChatService(
      createDeps({
        loadWorldbuildingById: jest
          .fn()
          .mockResolvedValue(createWorldbuilding({ decomposedWorld: null })),
      })
    );

    await expect(
      service.createChat({
        worldbuildingId: 'world-1',
        targetCharacterId: 'target-1',
        interlocutorCharacterId: 'interlocutor-1',
        physicalContext: createPhysicalContext(),
        leadInContext: createLeadInContext(),
      })
    ).rejects.toMatchObject<Partial<ChatDomainError>>({
      code: 'VALIDATION_FAILED',
      message: 'Worldbuilding must be decomposed before chat creation: world-1',
    });
  });

  it('runs the pipeline before persisting either turn', async () => {
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

    expect(callOrder).toEqual(['pipeline', 'saveTurn:USER', 'saveTurn:CHARACTER']);
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

    expect(result).toEqual({
      userTurn: createUserTurn({ timestamp: '2026-03-27T09:01:00.000Z' }),
      ...pipelineResult,
    });
    expect(deps.saveTurn).toHaveBeenNthCalledWith(
      1,
      'chat-1',
      createUserTurn({ timestamp: '2026-03-27T09:01:00.000Z' })
    );
    expect(deps.saveTurn).toHaveBeenNthCalledWith(2, 'chat-1', pipelineResult.characterTurn);
    expect(deps.saveChat).toHaveBeenCalledWith(pipelineResult.updatedSession);
  });

  it('does not persist turns or session when the pipeline fails', async () => {
    const deps = createDeps({
      runChatPipeline: jest.fn().mockRejectedValue(new Error('pipeline failed')),
      now: jest.fn().mockReturnValue('2026-03-27T09:01:00.000Z'),
    });
    const service = createChatService(deps);

    await expect(
      service.sendTurn({
        chatId: 'chat-1',
        userMessage: 'Tell me what happened.',
        apiKey: 'test-key',
      })
    ).rejects.toThrow('pipeline failed');

    expect(deps.saveTurn).not.toHaveBeenCalled();
    expect(deps.saveChat).not.toHaveBeenCalled();
  });

  it('reconstructs recentTurns and allTurns in memory before invoking the pipeline', async () => {
    const priorUserTurn = createUserTurn({
      turnNumber: 1,
      timestamp: '2026-03-27T08:59:00.000Z',
    });
    const priorCharacterTurn = createCharacterTurn({
      turnNumber: 2,
      timestamp: '2026-03-27T09:00:00.000Z',
    });
    const nextUserTurn = createUserTurn({
      turnNumber: 3,
      rawText: 'Tell me what happened.',
      timestamp: '2026-03-27T09:01:00.000Z',
    });
    const pipelineResult = createPipelineResult({
      characterTurn: createCharacterTurn({
        turnNumber: 4,
        timestamp: '2026-03-27T09:02:00.000Z',
      }),
      updatedSession: createSession({
        turnCount: 4,
        updatedAt: '2026-03-27T09:02:00.000Z',
      }),
    });
    const deps = createDeps({
      loadChat: jest.fn().mockResolvedValue(createSession({ turnCount: 2 })),
      loadTurns: jest.fn().mockResolvedValue([priorUserTurn, priorCharacterTurn]),
      getRecentTurns: jest.fn().mockResolvedValue([priorUserTurn, priorCharacterTurn]),
      runChatPipeline: jest.fn().mockResolvedValue(pipelineResult),
      now: jest.fn().mockReturnValue('2026-03-27T09:01:00.000Z'),
    });
    const service = createChatService(deps);

    await service.sendTurn({
      chatId: 'chat-1',
      userMessage: 'Tell me what happened.',
      apiKey: 'test-key',
    });

    expect(deps.runChatPipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        latestUserTurn: nextUserTurn,
        recentTurns: [priorUserTurn, priorCharacterTurn, nextUserTurn],
        allTurns: [priorUserTurn, priorCharacterTurn, nextUserTurn],
      }),
      'test-key',
      undefined
    );
  });

  it('returns the canonical saved user turn so callers do not duplicate parsing logic', async () => {
    const deps = createDeps({
      parseChatInput: jest.fn().mockReturnValue([
        { type: 'ACTION', text: 'I close the ledger.' },
        { type: 'SPEECH', text: 'Tell me what happened.' },
      ]),
      now: jest.fn().mockReturnValue('2026-03-27T09:01:00.000Z'),
    });
    const service = createChatService(deps);

    const result = await service.sendTurn({
      chatId: 'chat-1',
      userMessage: '*I close the ledger.* Tell me what happened.',
      apiKey: 'test-key',
    });

    expect(result.userTurn).toEqual({
      turnNumber: 1,
      speaker: 'USER',
      blocks: [
        { type: 'ACTION', text: 'I close the ledger.' },
        { type: 'SPEECH', text: 'Tell me what happened.' },
      ],
      rawText: '*I close the ledger.* Tell me what happened.',
      timestamp: '2026-03-27T09:01:00.000Z',
    });
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
    ).rejects.toMatchObject<Partial<ChatDomainError>>({
      code: 'RESOURCE_NOT_FOUND',
      message: 'Chat not found: missing-chat',
    });
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
    ).rejects.toMatchObject<Partial<ChatDomainError>>({
      code: 'VALIDATION_FAILED',
      message: 'User message is required',
    });

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
    ).rejects.toMatchObject<Partial<ChatDomainError>>({
      code: 'VALIDATION_FAILED',
      message: 'User message is required',
    });

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
      expect.objectContaining({
        isSessionResume: true,
        decomposedWorld: createWorldbuilding().decomposedWorld,
      }),
      'test-key',
      undefined
    );

    await service.sendTurn({
      chatId: 'chat-1',
      userMessage: 'Tell me what happened.',
      apiKey: 'test-key',
    });

    expect(deps.runChatPipeline).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isSessionResume: false,
        decomposedWorld: createWorldbuilding().decomposedWorld,
      }),
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
      expect.objectContaining({
        isSessionResume: false,
        decomposedWorld: createWorldbuilding().decomposedWorld,
      }),
      'test-key',
      onGenerationStage
    );
  });

  it('rejects sendTurn when the session worldbuilding is missing', async () => {
    const deps = createDeps({
      loadWorldbuildingById: jest.fn().mockResolvedValue(null),
    });
    const service = createChatService(deps);

    await expect(
      service.sendTurn({
        chatId: 'chat-1',
        userMessage: 'Tell me what happened.',
        apiKey: 'test-key',
      })
    ).rejects.toMatchObject<Partial<ChatDomainError>>({
      code: 'RESOURCE_NOT_FOUND',
      message: 'Worldbuilding not found: world-1',
    });

    expect(deps.runChatPipeline).not.toHaveBeenCalled();
  });

  it('rejects sendTurn when the session worldbuilding is no longer decomposed', async () => {
    const deps = createDeps({
      loadWorldbuildingById: jest
        .fn()
        .mockResolvedValue(createWorldbuilding({ decomposedWorld: null })),
    });
    const service = createChatService(deps);

    await expect(
      service.sendTurn({
        chatId: 'chat-1',
        userMessage: 'Tell me what happened.',
        apiKey: 'test-key',
      })
    ).rejects.toMatchObject<Partial<ChatDomainError>>({
      code: 'VALIDATION_FAILED',
      message: 'Worldbuilding must be decomposed before chat turn generation: world-1',
    });

    expect(deps.runChatPipeline).not.toHaveBeenCalled();
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
    await expect(service.resumeChat('missing-chat')).rejects.toMatchObject<Partial<ChatDomainError>>({
      code: 'RESOURCE_NOT_FOUND',
      message: 'Chat not found: missing-chat',
    });
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
