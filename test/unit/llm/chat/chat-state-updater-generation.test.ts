const mockRunLlmStage = jest.fn<Promise<{ parsed: unknown; rawResponse: string }>, [unknown]>();
const mockBuildMessages = jest.fn().mockReturnValue([
  { role: 'system', content: 'System prompt' },
  { role: 'user', content: 'User prompt' },
]);

jest.mock('../../../../src/llm/llm-stage-runner', () => ({
  get runLlmStage(): typeof mockRunLlmStage {
    return mockRunLlmStage;
  },
}));

jest.mock('../../../../src/llm/prompts/chat/chat-state-updater-prompt', () => ({
  get buildChatStateUpdaterMessages(): typeof mockBuildMessages {
    return mockBuildMessages;
  },
}));

import {
  generateChatStateUpdate,
  type ChatStateUpdaterContext,
} from '../../../../src/llm/chat/chat-state-updater-generation';
import { CHAT_STATE_UPDATER_SCHEMA } from '../../../../src/llm/schemas/chat-state-updater-schema';
import { LLMError } from '../../../../src/llm/llm-client-types';

function makeContext(): ChatStateUpdaterContext {
  return {
    chatBible: {
      sessionPremise: 'Two allies test whether trust is still possible.',
      physicalReality: {
        location: 'Observatory',
        microLocation: 'Upper hall',
        timeOfDay: 'EVENING',
        privacy: 'PRIVATE',
        distanceBand: 'CONVERSATIONAL',
        characterActivity: 'Watching the door',
        interactableObjects: ['Lantern'],
        ambientConditions: ['Rain'],
      },
      preChatMomentum: {
        leadInSummary: 'They meet after the failed rendezvous.',
        recentEvents: ['The signal failed'],
        whyNow: 'They are out of time.',
        stakesNow: ['Find the courier'],
        unresolvedPressures: ['Mutual distrust'],
      },
      characterNow: {
        currentObjective: 'Get the truth first',
        immediateNeedFromConversation: 'Test his honesty',
        emotionalState: 'restrained anger',
        willingnessToEngage: 'GUARDED',
        topicsToAdvance: ['The courier'],
        topicsToProtect: ['Her source'],
      },
      relationshipNow: {
        dynamic: 'frayed allies',
        valence: -1,
        tension: 8,
        leverage: 'mutual blackmail',
        whatCharacterBelievesAboutInterlocutor: ['He is still hiding something'],
      },
      knowledgeNow: {
        knownFacts: ['The courier vanished'],
        suspicions: ['The map was copied'],
        falseBeliefs: ['The room is private'],
        secretsRevealed: ['A meeting was staged'],
        secretsKept: ['She still has the key'],
        knowledgeBoundaries: ['She does not know who ordered the theft'],
      },
      conversationNow: {
        rollingSummary: null,
        activeThreads: ['Who lied first'],
        commitments: [],
        sensitiveTopics: ['Her brother'],
        lastTurnPressure: null,
      },
      continuityGuardrails: ['Do not invent new evidence'],
      responseConstraints: ['Keep the next turn compressed'],
    },
    latestUserTurn: {
      turnNumber: 1,
      speaker: 'USER',
      rawText: 'Tell me what really happened.',
      blocks: [{ type: 'SPEECH', text: 'Tell me what really happened.' }],
      timestamp: '2026-03-01T00:01:00.000Z',
    },
    turnPlan: {
      internalSelfCheck: {
        whatDoIWant: 'Make him overcommit.',
        whatDoIKnow: 'He is concealing something.',
        whatAmIHiding: 'I already copied the key.',
        howHonestAmI: 'Partially honest.',
      },
      responseGoal: 'Probe without surrendering leverage.',
      speechAct: 'PROBE',
      honestyMode: 'PARTIAL',
      surfaceEmotion: 'controlled anger',
      suppressedEmotion: 'fear',
      subtext: 'I need him defensive, not gone.',
      mustAddress: ['His demand for truth'],
      mustAvoid: ['Admitting who gave me the key'],
      blockPlan: ['ACTION', 'SPEECH'],
      actionPlan: [
        {
          kind: 'GESTURE',
          text: 'Sets the lantern down with deliberate care.',
          changesPhysicalState: false,
        },
      ],
      questionBack: 'What did you tell the courier before he disappeared?',
      targetLength: 'MEDIUM',
      expectedImpact: {
        relationshipDeltaHint: -1,
        tensionDeltaHint: 2,
        revealsSecret: false,
      },
    },
    writerTurn: {
      blocks: [
        { type: 'ACTION', text: 'She sets the lantern down with deliberate care.' },
        { type: 'SPEECH', delivery: 'flat', text: 'Then start by telling me what you told him.' },
      ],
      turnMeta: {
        expectsReply: true,
        endsWithQuestion: false,
        visibleEmotion: 'controlled anger',
        finalPressure: 'She refuses to let him redirect.',
      },
    },
  };
}

const PARSED_STATE_UPDATE = {
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

beforeEach(() => {
  jest.clearAllMocks();
  mockRunLlmStage.mockResolvedValue({
    parsed: PARSED_STATE_UPDATE,
    rawResponse: '{"summaryDelta":"The exchange sharpens into a veiled accusation."}',
  });
});

describe('generateChatStateUpdate', () => {
  it('calls the prompt builder with the provided context', async () => {
    const context = makeContext();
    await generateChatStateUpdate(context, 'test-key');

    expect(mockBuildMessages).toHaveBeenCalledWith(context);
  });

  it('calls runLlmStage with the correct stage metadata and schema', async () => {
    await generateChatStateUpdate(makeContext(), 'test-key');

    expect(mockRunLlmStage).toHaveBeenCalledWith(
      expect.objectContaining({
        stageModel: 'chatStateUpdater',
        promptType: 'chatStateUpdater',
        schema: CHAT_STATE_UPDATER_SCHEMA,
        apiKey: 'test-key',
        parseResponse: expect.any(Function) as unknown,
      })
    );
  });

  it('passes options through to the stage runner', async () => {
    await generateChatStateUpdate(makeContext(), 'test-key', {
      model: 'custom/model',
      temperature: 0.15,
    });

    expect(mockRunLlmStage).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { model: 'custom/model', temperature: 0.15 },
      })
    );
  });

  it('returns the parsed state update together with rawResponse', async () => {
    const result = await generateChatStateUpdate(makeContext(), 'test-key');

    expect(result.stateUpdate).toEqual(PARSED_STATE_UPDATE);
    expect(result.rawResponse).toContain('summaryDelta');
  });

  it('retries with a lenient schema when the provider rejects the strict grammar', async () => {
    mockRunLlmStage
      .mockRejectedValueOnce(new Error('The compiled grammar is too large'))
      .mockResolvedValueOnce({
        parsed: PARSED_STATE_UPDATE,
        rawResponse: '{"summaryDelta":"The exchange sharpens into a veiled accusation."}',
      });

    const result = await generateChatStateUpdate(makeContext(), 'test-key');

    expect(result.stateUpdate).toEqual(PARSED_STATE_UPDATE);
    expect(mockRunLlmStage).toHaveBeenCalledTimes(2);
    expect(mockRunLlmStage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        schema: CHAT_STATE_UPDATER_SCHEMA,
      })
    );
    const secondStageInput: unknown = mockRunLlmStage.mock.calls[1]?.[0];
    expect(secondStageInput).toMatchObject({
      schema: {
        json_schema: {
            name: CHAT_STATE_UPDATER_SCHEMA.json_schema.name,
            strict: false,
        },
      },
    });
  });

  it('propagates LLM client errors', async () => {
    mockRunLlmStage.mockRejectedValue(new LLMError('API error', 'API_ERROR', true));

    await expect(generateChatStateUpdate(makeContext(), 'test-key')).rejects.toThrow('API error');
    expect(mockRunLlmStage).toHaveBeenCalledTimes(1);
  });
});
