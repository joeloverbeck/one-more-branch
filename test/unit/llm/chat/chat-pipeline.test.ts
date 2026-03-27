const mockGenerateChatBible = jest.fn();
const mockGenerateChatTurnPlan = jest.fn();
const mockGenerateChatWriterTurn = jest.fn();
const mockGenerateChatStateUpdate = jest.fn();
const mockGenerateChatSummary = jest.fn();

jest.mock('../../../../src/llm/chat/chat-bible-generation', () => ({
  get generateChatBible(): typeof mockGenerateChatBible {
    return mockGenerateChatBible;
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

import { runChatPipeline, type ChatPipelineContext } from '../../../../src/llm/chat/chat-pipeline';
import type { StandaloneDecomposedCharacter } from '../../../../src/models/standalone-decomposed-character';

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
          rollingSummary: 'They circle around the accusation.',
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
    recentTurns: [priorCharacterTurn, latestUserTurn],
    allTurns: [priorCharacterTurn, latestUserTurn],
    latestUserTurn,
    isSessionResume: false,
    ...overrides,
  };
}

const GENERATED_BIBLE = makeContext().chatSession.chatBible!;
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
  mockGenerateChatBible.mockResolvedValue({ chatBible: GENERATED_BIBLE, rawResponse: '{}' });
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

    expect(mockGenerateChatBible).toHaveBeenCalledTimes(1);
  });

  it('refreshes the bible on session resume', async () => {
    await runChatPipeline(makeContext({ isSessionResume: true }), 'test-key');

    expect(mockGenerateChatBible).toHaveBeenCalledTimes(1);
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

    expect(mockGenerateChatBible).toHaveBeenCalledTimes(1);
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

    expect(mockGenerateChatBible).toHaveBeenCalledTimes(1);
  });

  it('does not refresh the bible on a normal mid-conversation turn', async () => {
    await runChatPipeline(makeContext(), 'test-key');

    expect(mockGenerateChatBible).not.toHaveBeenCalled();
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
    ).rejects.toThrow('Chat pipeline requires latestUserTurn to have speaker USER');
  });
});
