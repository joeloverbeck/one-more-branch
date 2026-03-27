import {
  CHAT_BIBLE_SCHEMA,
  parseChatBibleResponse,
} from '../../../../src/llm/schemas/chat-bible-schema';
import { TIME_OF_DAY_VALUES } from '../../../../src/models/chat';

function makeValidChatBible(): Record<string, unknown> {
  return {
    sessionPremise: 'A guarded reunion after a failed mission.',
    physicalReality: {
      location: 'Abandoned observatory',
      microLocation: 'Cracked upper gallery',
      timeOfDay: TIME_OF_DAY_VALUES[5],
      privacy: 'PRIVATE',
      distanceBand: 'CONVERSATIONAL',
      characterActivity: 'Studying the broken lens array',
      interactableObjects: ['Brass telescope', 'Unlocked cabinet'],
      ambientConditions: ['Rain on the glass', 'Cold drafts'],
    },
    preChatMomentum: {
      leadInSummary: 'They arrive separately, both expecting betrayal.',
      recentEvents: ['The courier vanished', 'A coded note surfaced'],
      whyNow: 'The target character needs answers before the trail goes cold.',
      stakesNow: ['Losing the lead', 'Exposing a hidden allegiance'],
      unresolvedPressures: ['Mutual distrust', 'Time pressure'],
    },
    characterNow: {
      currentObjective: 'Learn whether the interlocutor sold the map.',
      immediateNeedFromConversation: 'Force a clean admission or a useful lie.',
      emotionalState: 'Tense, disappointed, and watchful',
      willingnessToEngage: 'GUARDED',
      topicsToAdvance: ['The missing courier', 'The map exchange'],
      topicsToProtect: ['The original source', 'Her own prior deception'],
    },
    relationshipNow: {
      dynamic: 'Fractured allies with mutual leverage',
      valence: -1,
      tension: 8,
      leverage: 'Each knows enough to ruin the other',
      whatCharacterBelievesAboutInterlocutor: [
        'He is hiding part of the truth',
        'He still wants the alliance to survive',
      ],
    },
    knowledgeNow: {
      knownFacts: ['The courier never reached the port'],
      suspicions: ['The interlocutor met the courier first'],
      falseBeliefs: ['The map can only be decoded by one person'],
      secretsRevealed: ['She already copied the cipher key'],
      secretsKept: ['She burned the original chart fragment'],
      knowledgeBoundaries: ['She does not know who ordered the interception'],
    },
    conversationNow: {
      rollingSummary: 'Their last exchange ended with a threat and no proof.',
      activeThreads: ['Who betrayed whom first', 'Whether to keep working together'],
      commitments: ['Meet before dawn', 'Do not involve the admiralty'],
      sensitiveTopics: ['Her brother', 'The mutiny'],
      lastTurnPressure: 'He demanded proof she was still useful',
    },
    continuityGuardrails: [
      'Do not let the character assume facts she has not learned',
      'Keep the observatory as the active location',
    ],
    responseConstraints: [
      'React directly to the latest accusation',
      'Keep the next exchange compressed and tense',
    ],
  };
}

describe('CHAT_BIBLE_SCHEMA', () => {
  it('defines a strict OpenRouter json_schema response format', () => {
    expect(CHAT_BIBLE_SCHEMA.type).toBe('json_schema');
    expect(CHAT_BIBLE_SCHEMA.json_schema.name).toBe('chat_bible');
    expect(CHAT_BIBLE_SCHEMA.json_schema.strict).toBe(true);
  });

  it('requires the full ChatBible top-level shape', () => {
    const schema = CHAT_BIBLE_SCHEMA.json_schema.schema as {
      required: string[];
      additionalProperties: boolean;
    };

    expect(schema.required).toEqual([
      'sessionPremise',
      'physicalReality',
      'preChatMomentum',
      'characterNow',
      'relationshipNow',
      'knowledgeNow',
      'conversationNow',
      'continuityGuardrails',
      'responseConstraints',
    ]);
    expect(schema.additionalProperties).toBe(false);
  });

  it('uses anyOf for nullable conversation fields', () => {
    const schema = CHAT_BIBLE_SCHEMA.json_schema.schema as {
      properties: {
        conversationNow: {
          properties: Record<string, { anyOf?: Array<{ type: string }> }>;
        };
      };
    };

    expect(schema.properties.conversationNow.properties.rollingSummary.anyOf).toEqual([
      { type: 'string' },
      { type: 'null' },
    ]);
    expect(schema.properties.conversationNow.properties.lastTurnPressure.anyOf).toEqual([
      { type: 'string' },
      { type: 'null' },
    ]);
  });
});

describe('parseChatBibleResponse', () => {
  it('parses a valid ChatBible payload', () => {
    const result = parseChatBibleResponse(makeValidChatBible());

    expect(result.sessionPremise).toContain('guarded reunion');
    expect(result.characterNow.willingnessToEngage).toBe('GUARDED');
    expect(result.conversationNow.activeThreads).toHaveLength(2);
  });

  it('accepts nullable conversation fields when set to null', () => {
    const result = parseChatBibleResponse({
      ...makeValidChatBible(),
      conversationNow: {
        ...(makeValidChatBible().conversationNow as Record<string, unknown>),
        rollingSummary: null,
        lastTurnPressure: null,
      },
    });

    expect(result.conversationNow.rollingSummary).toBeNull();
    expect(result.conversationNow.lastTurnPressure).toBeNull();
  });

  it('rejects payloads that violate the existing ChatBible validator', () => {
    const invalid = {
      ...makeValidChatBible(),
      characterNow: {
        ...(makeValidChatBible().characterNow as Record<string, unknown>),
        willingnessToEngage: 'EUPHORIC',
      },
    };

    expect(() => parseChatBibleResponse(invalid)).toThrow(
      'Chat Bible response does not match the expected ChatBible shape'
    );
  });

  it('rejects non-object payloads', () => {
    expect(() => parseChatBibleResponse('not an object')).toThrow(
      'Chat Bible response does not match the expected ChatBible shape'
    );
  });
});
