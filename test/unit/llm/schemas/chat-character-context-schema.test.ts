import {
  CHAT_CHARACTER_CONTEXT_SCHEMA,
  parseChatCharacterContextResponse,
} from '../../../../src/llm/schemas/chat-character-context-schema';

function makeValidCharacterContext(): Record<string, unknown> {
  return {
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

function countLeafProperties(schema: unknown): number {
  if (
    schema === null ||
    typeof schema !== 'object' ||
    !('properties' in schema) ||
    typeof schema.properties !== 'object' ||
    schema.properties === null
  ) {
    return 0;
  }

  return Object.values(schema.properties as Record<string, unknown>).reduce<number>(
    (count, property) => {
      const nestedCount = countLeafProperties(property);
      return count + (nestedCount > 0 ? nestedCount : 1);
    },
    0
  );
}

describe('CHAT_CHARACTER_CONTEXT_SCHEMA', () => {
  it('defines a strict OpenRouter json_schema response format', () => {
    expect(CHAT_CHARACTER_CONTEXT_SCHEMA.type).toBe('json_schema');
    expect(CHAT_CHARACTER_CONTEXT_SCHEMA.json_schema.name).toBe('chat_character_context');
    expect(CHAT_CHARACTER_CONTEXT_SCHEMA.json_schema.strict).toBe(true);
  });

  it('requires the full ChatCharacterContext top-level shape', () => {
    const schema = CHAT_CHARACTER_CONTEXT_SCHEMA.json_schema.schema as {
      required: string[];
      additionalProperties: boolean;
    };

    expect(schema.required).toEqual([
      'characterNow',
      'relationshipNow',
      'knowledgeNow',
      'continuityGuardrails',
      'responseConstraints',
    ]);
    expect(schema.additionalProperties).toBe(false);
  });

  it('stays within the grammar leaf-property safety budget', () => {
    expect(countLeafProperties(CHAT_CHARACTER_CONTEXT_SCHEMA.json_schema.schema)).toBe(19);
  });
});

describe('parseChatCharacterContextResponse', () => {
  it('parses a valid ChatCharacterContext payload', () => {
    const result = parseChatCharacterContextResponse(makeValidCharacterContext());

    expect(result.characterNow.willingnessToEngage).toBe('GUARDED');
    expect(result.relationshipNow.tension).toBe(8);
    expect(result.knowledgeNow.secretsKept).toHaveLength(1);
  });

  it('rejects payloads that violate the ChatCharacterContext validator', () => {
    const invalid = {
      ...makeValidCharacterContext(),
      characterNow: {
        ...(makeValidCharacterContext().characterNow as Record<string, unknown>),
        willingnessToEngage: 'CURIOUS',
      },
    };

    expect(() => parseChatCharacterContextResponse(invalid)).toThrow(
      'Chat character context response does not match the expected ChatCharacterContext shape'
    );
  });

  it('rejects payloads missing required fields', () => {
    const invalid = {
      ...makeValidCharacterContext(),
      responseConstraints: undefined,
    };

    expect(() => parseChatCharacterContextResponse(invalid)).toThrow(
      'Chat character context response does not match the expected ChatCharacterContext shape'
    );
  });

  it('rejects non-object payloads', () => {
    expect(() => parseChatCharacterContextResponse(['not', 'an', 'object'])).toThrow(
      'Chat character context response does not match the expected ChatCharacterContext shape'
    );
  });
});
