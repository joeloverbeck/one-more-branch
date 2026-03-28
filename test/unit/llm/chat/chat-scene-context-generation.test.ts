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

jest.mock('../../../../src/llm/prompts/chat/chat-scene-context-prompt', () => ({
  get buildChatSceneContextMessages(): typeof mockBuildMessages {
    return mockBuildMessages;
  },
}));

import { generateChatSceneContext } from '../../../../src/llm/chat/chat-scene-context-generation';
import type { ChatGenerationContext } from '../../../../src/llm/chat/chat-generation-context';
import { LLMError } from '../../../../src/llm/llm-client-types';
import { CHAT_SCENE_CONTEXT_SCHEMA } from '../../../../src/llm/schemas/chat-scene-context-schema';
import type { DecomposedWorld } from '../../../../src/models/decomposed-world';

const DECOMPOSED_WORLD: DecomposedWorld = {
  worldLogline: 'An observatory city built around a dead star clock.',
  facts: [
    {
      id: 'wf-1',
      domain: 'governance',
      fact: 'Public accusations require witness oaths before dawn.',
      scope: 'citywide',
      factType: 'LAW',
      narrativeWeight: 'HIGH',
    },
  ],
  openQuestions: ['Who falsified the last oath register?'],
  rawWorldbuilding: 'An observatory city built around a dead star clock.',
};

function makeContext(): ChatGenerationContext {
  return {
    targetCharacter: {
      id: 'char-1',
      name: 'Iria Vale',
      rawDescription: 'Guarded captain',
      speechFingerprint: {
        catchphrases: [],
        vocabularyProfile: 'clipped',
        sentencePatterns: 'short',
        verbalTics: [],
        dialogueSamples: [],
        metaphorFrames: '',
        antiExamples: [],
        discourseMarkers: [],
        registerShifts: '',
      },
      coreTraits: ['guarded'],
      knowledgeBoundaries: 'limited',
      decisionPattern: 'fast',
      coreBeliefs: ['control matters'],
      conflictPriority: 'mission first',
      appearance: 'severe',
      createdAt: '2026-03-01T00:00:00.000Z',
    },
    interlocutorCharacter: {
      id: 'char-2',
      name: 'Tomas Wren',
      rawDescription: 'Secretive scholar',
      speechFingerprint: {
        catchphrases: [],
        vocabularyProfile: 'warm',
        sentencePatterns: 'measured',
        verbalTics: [],
        dialogueSamples: [],
        metaphorFrames: '',
        antiExamples: [],
        discourseMarkers: [],
        registerShifts: '',
      },
      coreTraits: ['secretive'],
      knowledgeBoundaries: 'partial',
      decisionPattern: 'deliberate',
      coreBeliefs: ['mercy matters'],
      conflictPriority: 'survival first',
      appearance: 'tired',
      createdAt: '2026-03-01T00:00:00.000Z',
    },
    decomposedWorld: DECOMPOSED_WORLD,
    relationshipState: {
      dynamic: 'frayed allies',
      valence: -1,
      tension: 8,
      leverage: 'mutual blackmail',
    },
    knowledgeState: {
      knownFacts: ['The courier vanished'],
      suspicions: ['The map was copied'],
      falseBeliefs: ['The room is private'],
      secretsRevealed: ['A meeting was staged'],
    },
    physicalContext: {
      location: 'Observatory',
      microLocation: 'Upper hall',
      timeOfDay: 'EVENING',
      privacy: 'PRIVATE',
      distanceBand: 'CONVERSATIONAL',
      characterActivity: 'Watching the door',
      interactableObjects: ['Lantern'],
      ambientConditions: ['Rain'],
    },
    leadInContext: {
      leadInSummary: 'They meet after the failed rendezvous.',
      recentEvents: ['The signal failed'],
      whyNow: 'They are out of time.',
    },
    rollingSummary: null,
    recentTurns: [],
  };
}

const PARSED_SCENE_CONTEXT = {
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
  conversationNow: {
    activeThreads: ['Who lied first'],
    commitments: [],
    sensitiveTopics: ['Her brother'],
    lastTurnPressure: null,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRunLlmStage.mockResolvedValue({
    parsed: PARSED_SCENE_CONTEXT,
    rawResponse: '{"sessionPremise":"Two allies test whether trust is still possible."}',
  });
});

describe('generateChatSceneContext', () => {
  it('calls the prompt builder with the provided context', async () => {
    const context = makeContext();
    await generateChatSceneContext(context, 'test-key');

    expect(mockBuildMessages).toHaveBeenCalledWith(context);
  });

  it('passes structured rolling summaries through to the prompt builder unchanged', async () => {
    const context = {
      ...makeContext(),
      rollingSummary: {
        compressedSummary: 'The confrontation hardened into open suspicion.',
        keyCommitments: ['Meet again at dawn.'],
        keyRevelations: ['She copied the ledger.'],
        unresolvedQuestions: ['Who else knows about the ledger?'],
        leverageShifts: ['She gained initiative by naming the ledger first.'],
        emotionalTrajectory: 'Distrust tightening into accusation.',
      },
    };

    await generateChatSceneContext(context, 'test-key');

    expect(mockBuildMessages).toHaveBeenCalledWith(context);
  });

  it('calls runLlmStage with the correct stage metadata and schema', async () => {
    await generateChatSceneContext(makeContext(), 'test-key');

    expect(mockRunLlmStage).toHaveBeenCalledWith(
      expect.objectContaining({
        stageModel: 'chatSceneContext',
        promptType: 'chatSceneContext',
        schema: CHAT_SCENE_CONTEXT_SCHEMA,
        apiKey: 'test-key',
        parseResponse: expect.any(Function) as unknown,
      })
    );
  });

  it('passes options through to the stage runner', async () => {
    await generateChatSceneContext(makeContext(), 'test-key', {
      model: 'custom/model',
      temperature: 0.15,
    });

    expect(mockRunLlmStage).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { model: 'custom/model', temperature: 0.15 },
      })
    );
  });

  it('returns the parsed scene context together with rawResponse', async () => {
    const result = await generateChatSceneContext(makeContext(), 'test-key');

    expect(result.sceneContext).toEqual(PARSED_SCENE_CONTEXT);
    expect(result.rawResponse).toContain('sessionPremise');
  });

  it('retries with a lenient schema when the provider rejects the strict grammar', async () => {
    mockRunLlmStage
      .mockRejectedValueOnce(new Error('The compiled grammar is too large'))
      .mockResolvedValueOnce({
        parsed: PARSED_SCENE_CONTEXT,
        rawResponse: '{"sessionPremise":"Two allies test whether trust is still possible."}',
      });

    const result = await generateChatSceneContext(makeContext(), 'test-key');

    expect(result.sceneContext).toEqual(PARSED_SCENE_CONTEXT);
    expect(mockRunLlmStage).toHaveBeenCalledTimes(2);
    expect(mockRunLlmStage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        schema: CHAT_SCENE_CONTEXT_SCHEMA,
      })
    );
    const secondStageInput: unknown = mockRunLlmStage.mock.calls[1]?.[0];
    expect(secondStageInput).toMatchObject({
      schema: {
        json_schema: {
            name: CHAT_SCENE_CONTEXT_SCHEMA.json_schema.name,
            strict: false,
        },
      },
    });
  });

  it('propagates LLM client errors', async () => {
    mockRunLlmStage.mockRejectedValue(new LLMError('API error', 'API_ERROR', true));

    await expect(generateChatSceneContext(makeContext(), 'test-key')).rejects.toThrow('API error');
    expect(mockRunLlmStage).toHaveBeenCalledTimes(1);
  });
});
