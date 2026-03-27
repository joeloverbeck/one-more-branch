const mockRunLlmStage = jest.fn();
const mockBuildMessages = jest.fn().mockReturnValue([
  { role: 'system', content: 'System prompt' },
  { role: 'user', content: 'User prompt' },
]);

jest.mock('../../../../src/llm/llm-stage-runner', () => ({
  get runLlmStage(): typeof mockRunLlmStage {
    return mockRunLlmStage;
  },
}));

jest.mock('../../../../src/llm/prompts/chat/chat-bible-prompt', () => ({
  get buildChatBibleMessages(): typeof mockBuildMessages {
    return mockBuildMessages;
  },
}));

import { generateChatBible, type ChatBibleContext } from '../../../../src/llm/chat/chat-bible-generation';
import { CHAT_BIBLE_SCHEMA } from '../../../../src/llm/schemas/chat-bible-schema';
import { LLMError } from '../../../../src/llm/llm-client-types';

function makeContext(): ChatBibleContext {
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

const PARSED_CHAT_BIBLE = {
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
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRunLlmStage.mockResolvedValue({
    parsed: PARSED_CHAT_BIBLE,
    rawResponse: '{"sessionPremise":"Two allies test whether trust is still possible."}',
  });
});

describe('generateChatBible', () => {
  it('calls the prompt builder with the provided context', async () => {
    const context = makeContext();
    await generateChatBible(context, 'test-key');

    expect(mockBuildMessages).toHaveBeenCalledWith(context);
  });

  it('calls runLlmStage with the correct stage metadata and schema', async () => {
    await generateChatBible(makeContext(), 'test-key');

    expect(mockRunLlmStage).toHaveBeenCalledWith(
      expect.objectContaining({
        stageModel: 'chatBible',
        promptType: 'chatBible',
        schema: CHAT_BIBLE_SCHEMA,
        apiKey: 'test-key',
        parseResponse: expect.any(Function) as unknown,
      })
    );
  });

  it('passes options through to the stage runner', async () => {
    await generateChatBible(makeContext(), 'test-key', {
      model: 'custom/model',
      temperature: 0.15,
    });

    expect(mockRunLlmStage).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { model: 'custom/model', temperature: 0.15 },
      })
    );
  });

  it('returns the parsed chat bible together with rawResponse', async () => {
    const result = await generateChatBible(makeContext(), 'test-key');

    expect(result.chatBible).toEqual(PARSED_CHAT_BIBLE);
    expect(result.rawResponse).toContain('sessionPremise');
  });

  it('propagates LLM client errors', async () => {
    mockRunLlmStage.mockRejectedValue(new LLMError('API error', 'API_ERROR', true));

    await expect(generateChatBible(makeContext(), 'test-key')).rejects.toThrow('API error');
  });
});
