import {
  CHAT_STATE_UPDATER_SCHEMA,
  parseChatStateUpdaterResponse,
} from '../../../../src/llm/schemas/chat-state-updater-schema';

function makeValidStateUpdate(): Record<string, unknown> {
  return {
    summaryDelta: 'The exchange hardens into controlled distrust.',
    relationshipShifts: [
      {
        shiftDescription: 'Trust erodes after the evasive answer.',
        suggestedValenceChange: -1,
        suggestedTensionChange: 2,
        suggestedNewDynamic: 'mutual suspicion',
      },
    ],
    knowledgeChanges: {
      newKnownFacts: ['The ledger is missing.'],
      newSuspicions: ['He moved it before the meeting.'],
      falseBeliefsCorrected: [],
      secretsRevealed: ['She knows about the duplicate key.'],
    },
    conversationUpdate: {
      commitmentsMade: ['Meet again at dawn.'],
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
}

describe('CHAT_STATE_UPDATER_SCHEMA', () => {
  it('defines a strict OpenRouter json_schema response format', () => {
    expect(CHAT_STATE_UPDATER_SCHEMA.type).toBe('json_schema');
    expect(CHAT_STATE_UPDATER_SCHEMA.json_schema.name).toBe('chat_state_updater');
    expect(CHAT_STATE_UPDATER_SCHEMA.json_schema.strict).toBe(true);
  });

  it('requires the full ChatStateUpdate top-level shape', () => {
    const schema = CHAT_STATE_UPDATER_SCHEMA.json_schema.schema as {
      required: string[];
      additionalProperties: boolean;
    };

    expect(schema.required).toEqual([
      'summaryDelta',
      'relationshipShifts',
      'knowledgeChanges',
      'conversationUpdate',
      'physicalStateUpdate',
      'shouldRefreshChatBible',
      'shouldTriggerSummary',
    ]);
    expect(schema.additionalProperties).toBe(false);
  });

  it('uses nullable physical fields and the canonical distance-band enum', () => {
    const schema = CHAT_STATE_UPDATER_SCHEMA.json_schema.schema as {
      properties: {
        relationshipShifts: {
          items: {
            properties: {
              suggestedNewDynamic: { anyOf?: Array<{ type: string }> };
            };
          };
        };
        physicalStateUpdate: {
          properties: {
            newLocation: { anyOf?: Array<{ type: string }> };
            newMicroLocation: { anyOf?: Array<{ type: string }> };
            newDistanceBand: { anyOf?: Array<{ type: string; enum?: string[] }> };
          };
        };
      };
    };

    expect(schema.properties.relationshipShifts.items.properties.suggestedNewDynamic.anyOf).toEqual(
      [{ type: 'string' }, { type: 'null' }]
    );
    expect(schema.properties.physicalStateUpdate.properties.newLocation.anyOf).toEqual([
      { type: 'string' },
      { type: 'null' },
    ]);
    expect(schema.properties.physicalStateUpdate.properties.newMicroLocation.anyOf).toEqual([
      { type: 'string' },
      { type: 'null' },
    ]);
    expect(schema.properties.physicalStateUpdate.properties.newDistanceBand.anyOf).toEqual([
      {
        type: 'string',
        enum: ['INTIMATE', 'ARM_REACH', 'CONVERSATIONAL', 'ACROSS_ROOM', 'DISTANT'],
      },
      { type: 'null' },
    ]);
  });
});

describe('parseChatStateUpdaterResponse', () => {
  it('parses a valid ChatStateUpdate payload', () => {
    const result = parseChatStateUpdaterResponse(makeValidStateUpdate());

    expect(result.relationshipShifts).toHaveLength(1);
    expect(result.relationshipShifts[0].suggestedTensionChange).toBe(2);
    expect(result.physicalStateUpdate.newDistanceBand).toBe('ARM_REACH');
  });

  it('accepts nullable physical fields when set to null', () => {
    const result = parseChatStateUpdaterResponse({
      ...makeValidStateUpdate(),
      physicalStateUpdate: {
        ...(makeValidStateUpdate().physicalStateUpdate as Record<string, unknown>),
        newLocation: null,
        newMicroLocation: null,
        newDistanceBand: null,
      },
    });

    expect(result.physicalStateUpdate.newLocation).toBeNull();
    expect(result.physicalStateUpdate.newMicroLocation).toBeNull();
    expect(result.physicalStateUpdate.newDistanceBand).toBeNull();
  });

  it('rejects relationship deltas outside the canonical -2..+2 bounds', () => {
    const invalid = {
      ...makeValidStateUpdate(),
      relationshipShifts: [
        {
          ...(makeValidStateUpdate().relationshipShifts as Array<Record<string, unknown>>)[0],
          suggestedTensionChange: 3,
        },
      ],
    };

    expect(() => parseChatStateUpdaterResponse(invalid)).toThrow(
      'Chat State Updater response does not match the expected ChatStateUpdate shape'
    );
  });

  it('rejects non-object payloads', () => {
    expect(() => parseChatStateUpdaterResponse('not an object')).toThrow(
      'Chat State Updater response does not match the expected ChatStateUpdate shape'
    );
  });
});
