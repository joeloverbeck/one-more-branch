import {
  applyRelationshipStateUpdate,
  buildChatRelationshipHistory,
  type ChatRelationshipState,
  type ChatTurn,
} from '../../../../src/models/chat';

function makeRelationshipState(overrides: Partial<ChatRelationshipState> = {}): ChatRelationshipState {
  return {
    dynamic: 'strained allies',
    valence: -1,
    tension: 6,
    leverage: 'Shared guilt',
    ...overrides,
  };
}

function makeCharacterTurn(turnNumber: number, shifts: NonNullable<ChatTurn['stateUpdate']>['relationshipShifts']): ChatTurn {
  return {
    turnNumber,
    speaker: 'CHARACTER',
    blocks: [{ type: 'SPEECH', text: 'You already know enough.' }],
    turnMeta: {
      expectsReply: true,
      endsWithQuestion: false,
      visibleEmotion: 'guarded',
      finalPressure: null,
    },
    plannerOutput: {
      internalSelfCheck: {
        whatDoIWant: 'Keep control.',
        whatDoIKnow: 'Enough.',
        whatAmIHiding: 'The copy.',
        howHonestAmI: 'Partially.',
      },
      responseGoal: 'Deflect.',
      speechAct: 'DEFLECT',
      honestyMode: 'PARTIAL',
      surfaceEmotion: 'calm',
      suppressedEmotion: 'fear',
      subtext: 'Back off.',
      mustAddress: ['The ledger'],
      mustAvoid: ['The copy'],
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
      summaryDelta: 'The tension rises.',
      relationshipShifts: shifts,
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
    timestamp: '2026-03-27T09:02:00.000Z',
  };
}

describe('chat relationship history helpers', () => {
  it('applies relationship shifts with the same clamping rules as session updates', () => {
    const result = applyRelationshipStateUpdate(
      makeRelationshipState(),
      {
        relationshipShifts: [
          {
            shiftDescription: 'The accusation spikes.',
            suggestedValenceChange: -10,
            suggestedTensionChange: 10,
            suggestedNewDynamic: 'open suspicion',
          },
        ],
      }
    );

    expect(result).toEqual({
      dynamic: 'open suspicion',
      valence: -5,
      tension: 10,
      leverage: 'Shared guilt',
    });
  });

  it('builds cumulative history from turn deltas and skips turns without state updates', () => {
    const history = buildChatRelationshipHistory([
      {
        turnNumber: 1,
        speaker: 'USER',
        blocks: [{ type: 'SPEECH', text: 'Tell me what happened.' }],
        rawText: 'Tell me what happened.',
        timestamp: '2026-03-27T09:01:00.000Z',
      },
      makeCharacterTurn(2, [
        {
          shiftDescription: 'Trust drops.',
          suggestedValenceChange: -2,
          suggestedTensionChange: 3,
          suggestedNewDynamic: 'open suspicion',
        },
      ]),
      {
        turnNumber: 3,
        speaker: 'USER',
        blocks: [{ type: 'SPEECH', text: 'Then tell me everything.' }],
        rawText: 'Then tell me everything.',
        timestamp: '2026-03-27T09:03:00.000Z',
      },
      makeCharacterTurn(4, [
        {
          shiftDescription: 'A little ground is recovered.',
          suggestedValenceChange: 1,
          suggestedTensionChange: -2,
          suggestedNewDynamic: null,
        },
      ]),
    ]);

    expect(history).toEqual([
      { turnNumber: 0, valence: 0, tension: 0, dynamic: '' },
      { turnNumber: 2, valence: -2, tension: 3, dynamic: 'open suspicion' },
      { turnNumber: 4, valence: -1, tension: 1, dynamic: 'open suspicion' },
    ]);
  });
});
