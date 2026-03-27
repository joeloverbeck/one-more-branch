import {
  CHAT_SCENE_CONTEXT_SCHEMA,
  parseChatSceneContextResponse,
} from '../../../../src/llm/schemas/chat-scene-context-schema';
import { TIME_OF_DAY_VALUES } from '../../../../src/models/chat';

function makeValidSceneContext(): Record<string, unknown> {
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
    conversationNow: {
      rollingSummary: 'Their last exchange ended with a threat and no proof.',
      activeThreads: ['Who betrayed whom first', 'Whether to keep working together'],
      commitments: ['Meet before dawn', 'Do not involve the admiralty'],
      sensitiveTopics: ['Her brother', 'The mutiny'],
      lastTurnPressure: 'He demanded proof she was still useful',
    },
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

describe('CHAT_SCENE_CONTEXT_SCHEMA', () => {
  it('defines a strict OpenRouter json_schema response format', () => {
    expect(CHAT_SCENE_CONTEXT_SCHEMA.type).toBe('json_schema');
    expect(CHAT_SCENE_CONTEXT_SCHEMA.json_schema.name).toBe('chat_scene_context');
    expect(CHAT_SCENE_CONTEXT_SCHEMA.json_schema.strict).toBe(true);
  });

  it('requires the full ChatSceneContext top-level shape', () => {
    const schema = CHAT_SCENE_CONTEXT_SCHEMA.json_schema.schema as {
      required: string[];
      additionalProperties: boolean;
    };

    expect(schema.required).toEqual([
      'sessionPremise',
      'physicalReality',
      'preChatMomentum',
      'conversationNow',
    ]);
    expect(schema.additionalProperties).toBe(false);
  });

  it('uses anyOf for nullable conversation fields', () => {
    const schema = CHAT_SCENE_CONTEXT_SCHEMA.json_schema.schema as {
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

  it('stays within the grammar leaf-property safety budget', () => {
    expect(countLeafProperties(CHAT_SCENE_CONTEXT_SCHEMA.json_schema.schema)).toBe(19);
  });
});

describe('parseChatSceneContextResponse', () => {
  it('parses a valid ChatSceneContext payload', () => {
    const result = parseChatSceneContextResponse(makeValidSceneContext());

    expect(result.sessionPremise).toContain('guarded reunion');
    expect(result.physicalReality.distanceBand).toBe('CONVERSATIONAL');
    expect(result.conversationNow.activeThreads).toHaveLength(2);
  });

  it('accepts nullable conversation fields when set to null', () => {
    const result = parseChatSceneContextResponse({
      ...makeValidSceneContext(),
      conversationNow: {
        ...(makeValidSceneContext().conversationNow as Record<string, unknown>),
        rollingSummary: null,
        lastTurnPressure: null,
      },
    });

    expect(result.conversationNow.rollingSummary).toBeNull();
    expect(result.conversationNow.lastTurnPressure).toBeNull();
  });

  it('rejects payloads that violate the ChatSceneContext validator', () => {
    const invalid = {
      ...makeValidSceneContext(),
      physicalReality: {
        ...(makeValidSceneContext().physicalReality as Record<string, unknown>),
        timeOfDay: 'MIDNIGHT',
      },
    };

    expect(() => parseChatSceneContextResponse(invalid)).toThrow(
      'Chat scene context response does not match the expected ChatSceneContext shape'
    );
  });

  it('rejects non-object payloads', () => {
    expect(() => parseChatSceneContextResponse('not an object')).toThrow(
      'Chat scene context response does not match the expected ChatSceneContext shape'
    );
  });
});
