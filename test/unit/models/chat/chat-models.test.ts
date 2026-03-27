import * as chatModels from '../../../../src/models/chat/index.js';
import type {
  ActionPlanItem,
  ChatBible,
  ChatSession,
  ChatStateUpdate,
  ChatTurn,
  RollingSummaryOutput,
  TimeOfDay,
} from '../../../../src/models/chat/index.js';
import {
  isChatSession,
  isChatTurn,
  parseChatSession,
  parseChatTurns,
} from '../../../../src/models/chat/index.js';

describe('chat model contracts', () => {
  it('exports canonical chat literal value sets from the chat barrel', () => {
    expect(chatModels.TIME_OF_DAY_VALUES).toEqual([
      'DAWN',
      'MORNING',
      'MIDDAY',
      'AFTERNOON',
      'DUSK',
      'EVENING',
      'LATE_NIGHT',
    ]);
    expect(chatModels.PRIVACY_VALUES).toEqual(['PRIVATE', 'SEMI_PRIVATE', 'PUBLIC']);
    expect(chatModels.DISTANCE_BAND_VALUES).toEqual([
      'INTIMATE',
      'ARM_REACH',
      'CONVERSATIONAL',
      'ACROSS_ROOM',
      'DISTANT',
    ]);
    expect(chatModels.CHAT_SPEAKER_VALUES).toEqual(['USER', 'CHARACTER']);
    expect(chatModels.CHAT_BLOCK_TYPE_VALUES).toEqual(['ACTION', 'SPEECH']);
    expect(chatModels.WILLINGNESS_TO_ENGAGE_VALUES).toEqual([
      'EAGER',
      'OPEN',
      'GUARDED',
      'RESISTANT',
      'HOSTILE',
    ]);
    expect(chatModels.SPEECH_ACT_VALUES).toContain('REVEAL');
    expect(chatModels.HONESTY_MODE_VALUES).toEqual(['FULL', 'PARTIAL', 'EVASIVE', 'DECEPTIVE']);
    expect(chatModels.ACTION_PLAN_KIND_VALUES).toContain('OBJECT_INTERACTION');
    expect(chatModels.TURN_TARGET_LENGTH_VALUES).toEqual(['SHORT', 'MEDIUM', 'LONG']);
  });

  it('supports representative typed fixtures for every public chat contract', () => {
    const timeOfDay: TimeOfDay = 'EVENING';

    const actionPlanItem: ActionPlanItem = {
      kind: 'GESTURE',
      text: 'She taps the table once.',
      changesPhysicalState: false,
    };

    const stateUpdate: ChatStateUpdate = {
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
    };

    const chatBible: ChatBible = {
      sessionPremise: 'A tense private meeting after a betrayal.',
      physicalReality: {
        location: 'Archive',
        microLocation: 'Lamp-lit records table',
        timeOfDay,
        privacy: 'PRIVATE',
        distanceBand: 'CONVERSATIONAL',
        characterActivity: 'Sorting damaged ledgers',
        interactableObjects: ['ledger', 'oil lamp'],
        ambientConditions: ['rain on the roof', 'ink smell'],
      },
      preChatMomentum: {
        leadInSummary: 'They arrive separately after the raid.',
        recentEvents: ['A guard vanished.', 'The vault was left open.'],
        whyNow: 'The missing ledger cannot stay hidden until morning.',
        stakesNow: ['Exposure would ruin both of them.'],
        unresolvedPressures: ['Neither knows who else is listening.'],
      },
      characterNow: {
        currentObjective: 'Protect her leverage without admitting fear.',
        immediateNeedFromConversation: 'Confirm what he suspects.',
        emotionalState: 'contained anger',
        willingnessToEngage: 'GUARDED',
        topicsToAdvance: ['the missing ledger'],
        topicsToProtect: ['the second key'],
      },
      relationshipNow: {
        dynamic: 'former allies under strain',
        valence: -1,
        tension: 7,
        leverage: 'She knows what he hid.',
        whatCharacterBelievesAboutInterlocutor: ['He is stalling for time.'],
      },
      knowledgeNow: {
        knownFacts: ['The ledger is missing.'],
        suspicions: ['He staged part of the raid.'],
        falseBeliefs: ['He thinks she trusts him.'],
        secretsRevealed: ['She found the duplicate seal.'],
        secretsKept: ['She already copied the ledger.'],
        knowledgeBoundaries: ['She does not know who ordered the raid.'],
      },
      conversationNow: {
        rollingSummary: 'They circle around the accusation without naming it.',
        activeThreads: ['ledger', 'guard disappearance'],
        commitments: ['Meet again at dawn'],
        sensitiveTopics: ['the second key'],
        lastTurnPressure: 'He asked how much she knows.',
      },
      continuityGuardrails: ['No sudden confession without pressure.'],
      responseConstraints: ['Keep the reply grounded and immediate.'],
    };

    const session: ChatSession = {
      id: 'chat-1',
      createdAt: '2026-03-27T09:00:00.000Z',
      updatedAt: '2026-03-27T09:05:00.000Z',
      targetCharacterId: 'target-1',
      interlocutorCharacterId: 'interlocutor-1',
      targetCharacterName: 'Mara',
      interlocutorCharacterName: 'Iven',
      physicalContext: chatBible.physicalReality,
      leadInContext: {
        leadInSummary: 'The archive door is barred behind them.',
        recentEvents: ['The raid scattered the staff.'],
        whyNow: 'They have only minutes before the bells.',
      },
      chatBible,
      turnCount: 2,
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
        secretsRevealed: ['The guard saw them both.'],
      },
    };

    const turn: ChatTurn = {
      turnNumber: 2,
      speaker: 'CHARACTER',
      blocks: [
        { type: 'ACTION', text: 'She steadies the lamp with two fingers.' },
        { type: 'SPEECH', delivery: 'low', text: 'You knew it would be missing.' },
      ],
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
        actionPlan: [actionPlanItem],
        questionBack: null,
        targetLength: 'SHORT',
        expectedImpact: {
          relationshipDeltaHint: -1,
          tensionDeltaHint: 1,
          revealsSecret: false,
        },
      },
      stateUpdate,
      timestamp: '2026-03-27T09:05:00.000Z',
    };

    const summary: RollingSummaryOutput = {
      compressedSummary: 'The archive confrontation hardened into mutual suspicion.',
      keyCommitments: ['Meet again at dawn'],
      keyRevelations: ['She knows about the second key'],
      unresolvedQuestions: ['Who took the ledger?'],
      leverageShifts: ['She gained initiative by naming the missing ledger first.'],
      emotionalTrajectory: 'Controlled distrust escalating toward open accusation',
    };

    expect(session.chatBible).toBe(chatBible);
    expect(turn.stateUpdate).toBe(stateUpdate);
    expect(summary.keyRevelations).toContain('She knows about the second key');
  });

  it('provides runtime guards for persisted chat session and turn payloads', () => {
    const session = {
      id: 'chat-1',
      createdAt: '2026-03-27T09:00:00.000Z',
      updatedAt: '2026-03-27T09:05:00.000Z',
      targetCharacterId: 'target-1',
      interlocutorCharacterId: 'interlocutor-1',
      targetCharacterName: 'Mara',
      interlocutorCharacterName: 'Iven',
      physicalContext: {
        location: 'Archive',
        microLocation: 'Lamp-lit records table',
        timeOfDay: 'EVENING',
        privacy: 'PRIVATE',
        distanceBand: 'CONVERSATIONAL',
        characterActivity: 'Sorting damaged ledgers',
        interactableObjects: ['ledger', 'oil lamp'],
        ambientConditions: ['rain on the roof', 'ink smell'],
      },
      leadInContext: {
        leadInSummary: 'The archive door is barred behind them.',
        recentEvents: ['The raid scattered the staff.'],
        whyNow: 'They have only minutes before the bells.',
      },
      chatBible: null,
      turnCount: 1,
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
        secretsRevealed: ['The guard saw them both.'],
      },
    };

    const turn = {
      turnNumber: 1,
      speaker: 'USER',
      blocks: [{ type: 'SPEECH', text: 'Tell me what you hid.' }],
      rawText: 'Tell me what you hid.',
      timestamp: '2026-03-27T09:05:00.000Z',
    };

    expect(isChatSession(session)).toBe(true);
    expect(isChatTurn(turn)).toBe(true);
    expect(parseChatSession(session, 'session.json')).toBe(session);
    expect(parseChatTurns([turn], 'turns.json')).toEqual([turn]);
  });

  it('rejects malformed persisted payloads through the runtime validators', () => {
    expect(isChatSession({ id: 'chat-1' })).toBe(false);
    expect(isChatTurn({ turnNumber: 1, speaker: 'USER' })).toBe(false);
    expect(() => parseChatSession({ id: 'chat-1' }, 'session.json')).toThrow(
      'Invalid chat session payload at session.json'
    );
    expect(() => parseChatTurns([{ turnNumber: 1, speaker: 'USER' }], 'turns.json')).toThrow(
      'Invalid chat turns payload at turns.json'
    );
  });
});
