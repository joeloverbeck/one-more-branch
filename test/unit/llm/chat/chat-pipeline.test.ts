const mockGenerateChatSceneContext = jest.fn();
const mockGenerateChatCharacterContext = jest.fn();
const mockGenerateChatTurnPlan = jest.fn();
const mockGenerateChatWriterTurn = jest.fn();
const mockGenerateChatStateUpdate = jest.fn();
const mockGenerateChatSummary = jest.fn();

jest.mock('../../../../src/llm/chat/chat-scene-context-generation', () => ({
  get generateChatSceneContext(): typeof mockGenerateChatSceneContext {
    return mockGenerateChatSceneContext;
  },
}));

jest.mock('../../../../src/llm/chat/chat-character-context-generation', () => ({
  get generateChatCharacterContext(): typeof mockGenerateChatCharacterContext {
    return mockGenerateChatCharacterContext;
  },
}));

jest.mock('../../../../src/llm/chat/chat-planner-generation', () => ({
  get generateChatTurnPlan(): typeof mockGenerateChatTurnPlan {
    return mockGenerateChatTurnPlan;
  },
}));

jest.mock('../../../../src/llm/chat/chat-writer-generation', () => ({
  get generateChatWriterTurn(): typeof mockGenerateChatWriterTurn {
    return mockGenerateChatWriterTurn;
  },
}));

jest.mock('../../../../src/llm/chat/chat-state-updater-generation', () => ({
  get generateChatStateUpdate(): typeof mockGenerateChatStateUpdate {
    return mockGenerateChatStateUpdate;
  },
}));

jest.mock('../../../../src/llm/chat/chat-summary-generation', () => ({
  get generateChatSummary(): typeof mockGenerateChatSummary {
    return mockGenerateChatSummary;
  },
}));

import {
  assembleChatBible,
  ChatDomainError,
  type ChatCharacterContext,
  type ChatSceneContext,
} from '../../../../src/models/chat';
import { runChatPipeline, type ChatPipelineContext } from '../../../../src/llm/chat/chat-pipeline';
import type { GenerationStageEvent } from '../../../../src/engine/types';
import type { DecomposedWorld } from '../../../../src/models/decomposed-world';
import type { StandaloneDecomposedCharacter } from '../../../../src/models/standalone-decomposed-character';

const DECOMPOSED_WORLD: DecomposedWorld = {
  worldLogline: 'A city of archives slowly sinking into saltwater.',
  facts: [
    {
      id: 'wf-1',
      domain: 'culture',
      fact: 'Speaking a true name in public is taboo among archivists.',
      scope: 'citywide',
      factType: 'TABOO',
      narrativeWeight: 'HIGH',
      sensoryHook: 'Conversations hitch whenever a name is almost spoken.',
    },
  ],
  openQuestions: ['Who first broke the archive seals?'],
  rawWorldbuilding: 'A city of archives slowly sinking into saltwater.',
};

function makeCharacter(id: string, name: string): StandaloneDecomposedCharacter {
  return {
    id,
    name,
    rawDescription: `${name} description`,
    speechFingerprint: {
      catchphrases: [],
      vocabularyProfile: 'precise',
      sentencePatterns: 'measured',
      verbalTics: [],
      dialogueSamples: [],
      metaphorFrames: '',
      antiExamples: [],
      discourseMarkers: [],
      registerShifts: '',
    },
    coreTraits: ['guarded'],
    knowledgeBoundaries: 'limited',
    decisionPattern: 'deliberate',
    coreBeliefs: ['truth matters'],
    conflictPriority: 'control',
    appearance: 'severe',
    createdAt: '2026-03-01T00:00:00.000Z',
  };
}

function makeContext(overrides: Partial<ChatPipelineContext> = {}): ChatPipelineContext {
  const latestUserTurn = {
    turnNumber: 3,
    speaker: 'USER' as const,
    rawText: 'Tell me what you hid.',
    blocks: [{ type: 'SPEECH' as const, text: 'Tell me what you hid.' }],
    timestamp: '2026-03-27T09:06:00.000Z',
  };

  const priorCharacterTurn = {
    turnNumber: 2,
    speaker: 'CHARACTER' as const,
    blocks: [{ type: 'SPEECH' as const, text: 'Careful.' }],
    turnMeta: {
      expectsReply: true,
      endsWithQuestion: false,
      visibleEmotion: 'guarded',
      finalPressure: null,
    },
    plannerOutput: {
      internalSelfCheck: {
        whatDoIWant: 'Stall.',
        whatDoIKnow: 'Enough.',
        whatAmIHiding: 'The seal.',
        howHonestAmI: 'Not very.',
      },
      responseGoal: 'Deflect.',
      speechAct: 'DEFLECT',
      honestyMode: 'EVASIVE',
      surfaceEmotion: 'cool',
      suppressedEmotion: 'fear',
      subtext: 'Back off.',
      mustAddress: ['The accusation'],
      mustAvoid: ['The seal'],
      blockPlan: ['SPEECH'] as const,
      actionPlan: [],
      questionBack: null,
      targetLength: 'SHORT' as const,
      expectedImpact: {
        relationshipDeltaHint: -1,
        tensionDeltaHint: 1,
        revealsSecret: false,
      },
    },
    stateUpdate: {
      summaryDelta: 'The pressure increases.',
      relationshipShifts: [],
      knowledgeChanges: {
        newKnownFacts: [],
        newSuspicions: [],
        falseBeliefsCorrected: [],
        secretsRevealed: [],
      },
      conversationUpdate: {
        commitmentsMade: [],
        threatsMade: [],
        questionsOpened: [],
        questionsResolved: [],
      },
      physicalStateUpdate: {
        locationChanged: false,
        newLocation: null,
        newMicroLocation: null,
        newDistanceBand: null,
        objectStateChanges: [],
      },
      shouldRefreshChatBible: false,
      shouldTriggerSummary: false,
    },
    timestamp: '2026-03-27T09:05:00.000Z',
  };

  return {
    chatSession: {
      id: 'chat-1',
      createdAt: '2026-03-27T09:00:00.000Z',
      updatedAt: '2026-03-27T09:05:00.000Z',
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
      chatBible: {
        sessionPremise: 'Two allies test whether trust is still possible.',
        physicalReality: {
          location: 'Archive',
          microLocation: 'Lamp-lit table',
          timeOfDay: 'EVENING',
          privacy: 'PRIVATE',
          distanceBand: 'CONVERSATIONAL',
          characterActivity: 'Sorting ledgers',
          interactableObjects: ['ledger', 'lamp'],
          ambientConditions: ['rain', 'ink smell'],
        },
        preChatMomentum: {
          leadInSummary: 'They arrive separately after the raid.',
          recentEvents: ['A guard vanished.'],
          whyNow: 'The ledger cannot stay missing until dawn.',
          stakesNow: ['Mutual ruin if exposed'],
          unresolvedPressures: ['Neither trusts the other'],
        },
        characterNow: {
          currentObjective: 'Force the truth out first.',
          immediateNeedFromConversation: 'Keep leverage.',
          emotionalState: 'contained anger',
          willingnessToEngage: 'GUARDED',
          topicsToAdvance: ['the ledger'],
          topicsToProtect: ['the duplicate seal'],
        },
        relationshipNow: {
          dynamic: 'strained allies',
          valence: -1,
          tension: 7,
          leverage: 'Shared culpability',
          whatCharacterBelievesAboutInterlocutor: ['He is stalling.'],
        },
        knowledgeNow: {
          knownFacts: ['The ledger is gone.'],
          suspicions: ['He moved it.'],
          falseBeliefs: ['He thinks she trusts him.'],
          secretsRevealed: ['The guard saw them.'],
          secretsKept: ['She copied the ledger.'],
          knowledgeBoundaries: ['She does not know who ordered the theft.'],
        },
        conversationNow: {
          activeThreads: ['ledger'],
          commitments: [],
          sensitiveTopics: ['the duplicate seal'],
          lastTurnPressure: null,
        },
        continuityGuardrails: ['No sudden confession.'],
        responseConstraints: ['Keep it immediate.'],
      },
      turnCount: 3,
      rollingSummary: {
        compressedSummary: 'They circle around the accusation.',
        keyCommitments: [],
        keyRevelations: ['She suspects he moved the ledger.'],
        unresolvedQuestions: ['Who moved the ledger?'],
        leverageShifts: ['Neither has yielded ground.'],
        emotionalTrajectory: 'Distrust stays controlled but sharpens.',
      },
      relationshipState: {
        dynamic: 'strained allies',
        valence: -1,
        tension: 7,
        leverage: 'Shared culpability',
      },
      knowledgeState: {
        knownFacts: ['The ledger is gone.'],
        suspicions: ['He moved it.'],
        falseBeliefs: ['He thinks she trusts him.'],
        secretsRevealed: ['The guard saw them.'],
      },
    },
    targetCharacter: makeCharacter('target-1', 'Mara'),
    interlocutorCharacter: makeCharacter('interlocutor-1', 'Iven'),
    decomposedWorld: DECOMPOSED_WORLD,
    recentTurns: [priorCharacterTurn, latestUserTurn],
    allTurns: [priorCharacterTurn, latestUserTurn],
    latestUserTurn,
    isSessionResume: false,
    ...overrides,
  };
}

const GENERATED_SCENE_CONTEXT: ChatSceneContext = {
  sessionPremise: 'Two allies test whether trust is still possible.',
  physicalReality: {
    location: 'Archive',
    microLocation: 'Lamp-lit table',
    timeOfDay: 'EVENING',
    privacy: 'PRIVATE',
    distanceBand: 'CONVERSATIONAL',
    characterActivity: 'Sorting ledgers',
    interactableObjects: ['ledger', 'lamp'],
    ambientConditions: ['rain', 'ink smell'],
  },
  preChatMomentum: {
    leadInSummary: 'They arrive separately after the raid.',
    recentEvents: ['A guard vanished.'],
    whyNow: 'The ledger cannot stay missing until dawn.',
    stakesNow: ['Mutual ruin if exposed'],
    unresolvedPressures: ['Neither trusts the other'],
  },
  conversationNow: {
    activeThreads: ['ledger'],
    commitments: [],
    sensitiveTopics: ['the duplicate seal'],
    lastTurnPressure: null,
  },
};

const GENERATED_CHARACTER_CONTEXT: ChatCharacterContext = {
  characterNow: {
    currentObjective: 'Force the truth out first.',
    immediateNeedFromConversation: 'Keep leverage.',
    emotionalState: 'contained anger',
    willingnessToEngage: 'GUARDED',
    topicsToAdvance: ['the ledger'],
    topicsToProtect: ['the duplicate seal'],
  },
  relationshipNow: {
    dynamic: 'strained allies',
    valence: -1,
    tension: 7,
    leverage: 'Shared culpability',
    whatCharacterBelievesAboutInterlocutor: ['He is stalling.'],
  },
  knowledgeNow: {
    knownFacts: ['The ledger is gone.'],
    suspicions: ['He moved it.'],
    falseBeliefs: ['He thinks she trusts him.'],
    secretsRevealed: ['The guard saw them.'],
    secretsKept: ['She copied the ledger.'],
    knowledgeBoundaries: ['She does not know who ordered the theft.'],
  },
  continuityGuardrails: ['No sudden confession.'],
  responseConstraints: ['Keep it immediate.'],
};

const GENERATED_BIBLE = assembleChatBible(GENERATED_SCENE_CONTEXT, GENERATED_CHARACTER_CONTEXT);

const TURN_PLAN = {
  internalSelfCheck: {
    whatDoIWant: 'Corner him.',
    whatDoIKnow: 'He is hiding something.',
    whatAmIHiding: 'I copied the ledger.',
    howHonestAmI: 'Partially honest.',
  },
  responseGoal: 'Probe without surrendering leverage.',
  speechAct: 'PROBE' as const,
  honestyMode: 'PARTIAL' as const,
  surfaceEmotion: 'controlled anger',
  suppressedEmotion: 'fear',
  subtext: 'I already know enough to hurt you.',
  mustAddress: ['His denial'],
  mustAvoid: ['Admitting who helped me'],
  blockPlan: ['ACTION', 'SPEECH'] as const,
  actionPlan: [
    {
      kind: 'GESTURE' as const,
      text: 'She steadies the lamp with two fingers.',
      changesPhysicalState: false,
    },
  ],
  questionBack: null,
  targetLength: 'SHORT' as const,
  expectedImpact: {
    relationshipDeltaHint: -1,
    tensionDeltaHint: 1,
    revealsSecret: false,
  },
};

const WRITER_TURN = {
  blocks: [
    { type: 'ACTION' as const, text: 'She steadies the lamp with two fingers.' },
    { type: 'SPEECH' as const, delivery: 'low', text: 'You knew it would be missing.' },
  ],
  turnMeta: {
    expectsReply: true,
    endsWithQuestion: false,
    visibleEmotion: 'controlled suspicion',
    finalPressure: 'She refuses to let him redirect.',
  },
};

const STATE_UPDATE = {
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
    newKnownFacts: ['She copied the ledger.'],
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
    newDistanceBand: null,
    objectStateChanges: ['The ledger drawer remains open.'],
  },
  shouldRefreshChatBible: false,
  shouldTriggerSummary: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGenerateChatSceneContext.mockResolvedValue({
    sceneContext: GENERATED_SCENE_CONTEXT,
    rawResponse: '{}',
  });
  mockGenerateChatCharacterContext.mockResolvedValue({
    characterContext: GENERATED_CHARACTER_CONTEXT,
    rawResponse: '{}',
  });
  mockGenerateChatTurnPlan.mockResolvedValue({ turnPlan: TURN_PLAN, rawResponse: '{}' });
  mockGenerateChatWriterTurn.mockResolvedValue({ writerTurn: WRITER_TURN, rawResponse: '{}' });
  mockGenerateChatStateUpdate.mockResolvedValue({ stateUpdate: STATE_UPDATE, rawResponse: '{}' });
  mockGenerateChatSummary.mockResolvedValue({
    summary: {
      compressedSummary: 'Compressed summary text.',
      keyCommitments: ['Meet again at dawn.'],
      keyRevelations: ['She copied the ledger.'],
      unresolvedQuestions: ['Who moved the ledger?'],
      leverageShifts: ['She seized the initiative.'],
      emotionalTrajectory: 'Distrust intensifies.',
    },
    rawResponse: '{}',
  });
});

describe('runChatPipeline', () => {
  it('passes decomposedWorld into scene-context generation when the bible refreshes', async () => {
    const context = makeContext({
      chatSession: {
        ...makeContext().chatSession,
        chatBible: null,
        rollingSummary: null,
      },
    });

    await runChatPipeline(context, 'test-key');

    expect(mockGenerateChatSceneContext).toHaveBeenCalledWith(
      expect.objectContaining({
        decomposedWorld: context.decomposedWorld,
      }),
      'test-key'
    );
  });

  it('passes the generated scene context into character-context generation', async () => {
    const context = makeContext({
      chatSession: {
        ...makeContext().chatSession,
        chatBible: null,
        rollingSummary: null,
      },
    });

    await runChatPipeline(context, 'test-key');

    expect(mockGenerateChatCharacterContext).toHaveBeenCalledWith(
      expect.objectContaining({
        decomposedWorld: context.decomposedWorld,
      }),
      GENERATED_SCENE_CONTEXT,
      'test-key'
    );
  });

  it('refreshes the bible on first turn', async () => {
    await runChatPipeline(
      makeContext({
        chatSession: {
          ...makeContext().chatSession,
          chatBible: null,
          rollingSummary: null,
        },
      }),
      'test-key'
    );

    expect(mockGenerateChatSceneContext).toHaveBeenCalledTimes(1);
    expect(mockGenerateChatCharacterContext).toHaveBeenCalledTimes(1);
  });

  it('refreshes the bible on session resume', async () => {
    await runChatPipeline(makeContext({ isSessionResume: true }), 'test-key');

    expect(mockGenerateChatSceneContext).toHaveBeenCalledTimes(1);
    expect(mockGenerateChatCharacterContext).toHaveBeenCalledTimes(1);
  });

  it('refreshes the bible every 10 completed character turns', async () => {
    await runChatPipeline(
      makeContext({
        chatSession: {
          ...makeContext().chatSession,
          turnCount: 10,
        },
      }),
      'test-key'
    );

    expect(mockGenerateChatSceneContext).toHaveBeenCalledTimes(1);
    expect(mockGenerateChatCharacterContext).toHaveBeenCalledTimes(1);
  });

  it('refreshes the bible when the latest prior character turn requested it', async () => {
    const context = makeContext();
    await runChatPipeline(
      makeContext({
        allTurns: [
          {
            ...context.allTurns[0],
            stateUpdate: {
              ...context.allTurns[0].stateUpdate,
              shouldRefreshChatBible: true,
            },
          },
          context.latestUserTurn,
        ],
      }),
      'test-key'
    );

    expect(mockGenerateChatSceneContext).toHaveBeenCalledTimes(1);
    expect(mockGenerateChatCharacterContext).toHaveBeenCalledTimes(1);
  });

  it('does not refresh the bible on a normal mid-conversation turn', async () => {
    await runChatPipeline(makeContext(), 'test-key');

    expect(mockGenerateChatSceneContext).not.toHaveBeenCalled();
    expect(mockGenerateChatCharacterContext).not.toHaveBeenCalled();
  });

  it('reuses the existing assembled bible for downstream stages when refresh is skipped', async () => {
    const context = makeContext();

    await runChatPipeline(context, 'test-key');

    expect(mockGenerateChatTurnPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        chatBible: context.chatSession.chatBible,
        rollingSummary: context.chatSession.rollingSummary,
      }),
      'test-key'
    );
    expect(mockGenerateChatWriterTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        chatBible: context.chatSession.chatBible,
        rollingSummary: context.chatSession.rollingSummary,
      }),
      'test-key'
    );
    expect(mockGenerateChatStateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        chatBible: context.chatSession.chatBible,
        rollingSummary: context.chatSession.rollingSummary,
      }),
      'test-key'
    );
  });

  it('keeps rolling summary out of the assembled chat bible contract', async () => {
    const result = await runChatPipeline(
      makeContext({
        chatSession: {
          ...makeContext().chatSession,
          chatBible: null,
        },
      }),
      'test-key'
    );

    expect(result.updatedSession.chatBible?.conversationNow).not.toHaveProperty('rollingSummary');
  });

  it('stores the assembled bible on the updated session when a refresh occurs', async () => {
    const result = await runChatPipeline(
      makeContext({
        chatSession: {
          ...makeContext().chatSession,
          chatBible: null,
          rollingSummary: null,
        },
      }),
      'test-key'
    );

    expect(result.updatedSession.chatBible).toEqual(GENERATED_BIBLE);
  });

  it('generates summary every 8 completed character turns', async () => {
    const result = await runChatPipeline(
      makeContext({
        chatSession: {
          ...makeContext().chatSession,
          turnCount: 7,
        },
      }),
      'test-key'
    );

    expect(mockGenerateChatSummary).toHaveBeenCalledTimes(1);
    expect(result.summaryWasGenerated).toBe(true);
  });

  it('generates summary when the state updater requests it', async () => {
    mockGenerateChatStateUpdate.mockResolvedValue({
      stateUpdate: {
        ...STATE_UPDATE,
        shouldTriggerSummary: true,
      },
      rawResponse: '{}',
    });

    const result = await runChatPipeline(makeContext(), 'test-key');

    expect(mockGenerateChatSummary).toHaveBeenCalledTimes(1);
    expect(result.summaryWasGenerated).toBe(true);
  });

  it('does not generate summary on non-trigger turns', async () => {
    const result = await runChatPipeline(makeContext(), 'test-key');

    expect(mockGenerateChatSummary).not.toHaveBeenCalled();
    expect(result.summaryWasGenerated).toBe(false);
  });

  it('returns the assembled character turn with writer blocks, turnMeta, plannerOutput, and stateUpdate', async () => {
    const result = await runChatPipeline(makeContext(), 'test-key');

    expect(result.characterTurn.speaker).toBe('CHARACTER');
    expect(result.characterTurn.turnNumber).toBe(4);
    expect(result.characterTurn.blocks).toEqual(WRITER_TURN.blocks);
    expect(result.characterTurn.turnMeta).toEqual(WRITER_TURN.turnMeta);
    expect(result.characterTurn.plannerOutput).toEqual(TURN_PLAN);
    expect(result.characterTurn.stateUpdate).toEqual(STATE_UPDATE);
  });

  it('stores summary.compressedSummary in updatedSession.rollingSummary', async () => {
    const result = await runChatPipeline(
      makeContext({
        chatSession: {
          ...makeContext().chatSession,
          turnCount: 7,
        },
      }),
      'test-key'
    );

    expect(result.updatedSession.rollingSummary).toEqual({
      compressedSummary: 'Compressed summary text.',
      keyCommitments: ['Meet again at dawn.'],
      keyRevelations: ['She copied the ledger.'],
      unresolvedQuestions: ['Who moved the ledger?'],
      leverageShifts: ['She seized the initiative.'],
      emotionalTrajectory: 'Distrust intensifies.',
    });
  });

  it('emits ordered stage progress events for the executed split chat stages', async () => {
    const onGenerationStage = jest.fn<(event: GenerationStageEvent) => void>();

    await runChatPipeline(
      makeContext({
        chatSession: {
          ...makeContext().chatSession,
          chatBible: null,
          rollingSummary: null,
          turnCount: 7,
        },
      }),
      'test-key',
      onGenerationStage
    );

    const stageEvents = (onGenerationStage.mock.calls as Array<[GenerationStageEvent]>).map(
      ([event]): string => `${event.status}:${event.stage}`
    );

    expect(stageEvents).toEqual([
      'started:CURATING_CHAT_SCENE',
      'completed:CURATING_CHAT_SCENE',
      'started:CURATING_CHAT_CHARACTER',
      'completed:CURATING_CHAT_CHARACTER',
      'started:PLANNING_CHAT_TURN',
      'completed:PLANNING_CHAT_TURN',
      'started:WRITING_CHAT_TURN',
      'completed:WRITING_CHAT_TURN',
      'started:UPDATING_CHAT_STATE',
      'completed:UPDATING_CHAT_STATE',
      'started:SUMMARIZING_CHAT_MEMORY',
      'completed:SUMMARIZING_CHAT_MEMORY',
    ]);
  });

  it('rejects a non-USER latestUserTurn', async () => {
    await expect(
      runChatPipeline(
        makeContext({
          latestUserTurn: {
            ...makeContext().latestUserTurn,
            speaker: 'CHARACTER',
          },
        }),
        'test-key'
      )
    ).rejects.toBeInstanceOf(ChatDomainError);
    await expect(
      runChatPipeline(
        makeContext({
          latestUserTurn: {
            ...makeContext().latestUserTurn,
            speaker: 'CHARACTER',
          },
        }),
        'test-key'
      )
    ).rejects.toMatchObject({
      code: 'INVARIANT_VIOLATION',
      message: 'Chat pipeline requires latestUserTurn to have speaker USER',
    });
  });
});
