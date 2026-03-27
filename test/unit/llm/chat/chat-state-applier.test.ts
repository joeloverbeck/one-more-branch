import { applyChatStateUpdate } from '../../../../src/llm/chat/chat-state-applier';
import type { ChatSession, ChatStateUpdate } from '../../../../src/models/chat';

function makeSession(): ChatSession {
  return {
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
    chatBible: null,
    turnCount: 7,
    rollingSummary: 'Earlier summary',
    relationshipState: {
      dynamic: 'strained allies',
      valence: 4,
      tension: 9,
      leverage: 'Shared culpability',
    },
    knowledgeState: {
      knownFacts: ['The ledger is gone.'],
      suspicions: ['Someone inside helped.'],
      falseBeliefs: ['He thinks she came alone.', 'The meeting room is private.'],
      secretsRevealed: ['The guard saw them both.'],
    },
  };
}

function makeStateUpdate(overrides: Partial<ChatStateUpdate> = {}): ChatStateUpdate {
  return {
    summaryDelta: 'The exchange sharpens into accusation.',
    relationshipShifts: [
      {
        shiftDescription: 'Trust erodes.',
        suggestedValenceChange: -3,
        suggestedTensionChange: 4,
        suggestedNewDynamic: 'open suspicion',
      },
    ],
    knowledgeChanges: {
      newKnownFacts: ['She copied the ledger.', 'The ledger is gone.'],
      newSuspicions: ['He burned the original.'],
      falseBeliefsCorrected: ['The meeting room is private.'],
      secretsRevealed: ['She has the duplicate seal.', 'The guard saw them both.'],
    },
    conversationUpdate: {
      commitmentsMade: ['Meet again at dawn.'],
      threatsMade: ['She warns him not to run.'],
      questionsOpened: ['Who moved the ledger?'],
      questionsResolved: [],
    },
    physicalStateUpdate: {
      locationChanged: true,
      newLocation: 'Bell tower',
      newMicroLocation: 'Narrow landing',
      newDistanceBand: 'ARM_REACH',
      objectStateChanges: ['The lantern is picked up.'],
    },
    shouldRefreshChatBible: true,
    shouldTriggerSummary: false,
    ...overrides,
  };
}

describe('applyChatStateUpdate', () => {
  it('clamps valence to -5..5', () => {
    const updated = applyChatStateUpdate(
      makeSession(),
      makeStateUpdate({
        relationshipShifts: [
          {
            shiftDescription: 'Severe fallout.',
            suggestedValenceChange: 10,
            suggestedTensionChange: 0,
            suggestedNewDynamic: null,
          },
        ],
      }),
      '2026-03-27T09:06:00.000Z'
    );

    expect(updated.relationshipState.valence).toBe(5);
  });

  it('clamps tension to 0..10', () => {
    const updated = applyChatStateUpdate(
      makeSession(),
      makeStateUpdate({
        relationshipShifts: [
          {
            shiftDescription: 'The pressure breaks.',
            suggestedValenceChange: 0,
            suggestedTensionChange: -20,
            suggestedNewDynamic: null,
          },
        ],
      }),
      '2026-03-27T09:06:00.000Z'
    );

    expect(updated.relationshipState.tension).toBe(0);
  });

  it('appends new knowledge without losing existing entries and de-duplicates repeats', () => {
    const updated = applyChatStateUpdate(
      makeSession(),
      makeStateUpdate(),
      '2026-03-27T09:06:00.000Z'
    );

    expect(updated.knowledgeState.knownFacts).toEqual(['The ledger is gone.', 'She copied the ledger.']);
    expect(updated.knowledgeState.suspicions).toEqual([
      'Someone inside helped.',
      'He burned the original.',
    ]);
    expect(updated.knowledgeState.secretsRevealed).toEqual([
      'The guard saw them both.',
      'She has the duplicate seal.',
    ]);
  });

  it('removes corrected false beliefs', () => {
    const updated = applyChatStateUpdate(
      makeSession(),
      makeStateUpdate(),
      '2026-03-27T09:06:00.000Z'
    );

    expect(updated.knowledgeState.falseBeliefs).toEqual(['He thinks she came alone.']);
  });

  it('updates physical context when location change is signaled', () => {
    const updated = applyChatStateUpdate(
      makeSession(),
      makeStateUpdate(),
      '2026-03-27T09:06:00.000Z'
    );

    expect(updated.physicalContext.location).toBe('Bell tower');
    expect(updated.physicalContext.microLocation).toBe('Narrow landing');
    expect(updated.physicalContext.distanceBand).toBe('ARM_REACH');
  });

  it('does not change physical context when no location change is signaled', () => {
    const session = makeSession();
    const updated = applyChatStateUpdate(
      session,
      makeStateUpdate({
        physicalStateUpdate: {
          locationChanged: false,
          newLocation: 'Bell tower',
          newMicroLocation: 'Narrow landing',
          newDistanceBand: 'ARM_REACH',
          objectStateChanges: ['The lantern is picked up.'],
        },
      }),
      '2026-03-27T09:06:00.000Z'
    );

    expect(updated.physicalContext).toEqual(session.physicalContext);
  });
});
