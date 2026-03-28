import {
  CHAT_STATE_UPDATER_SCHEMA,
  parseChatStateUpdaterResponse,
} from '../../../../src/llm/schemas/chat-state-updater-schema';
import type { ChatStateUpdate } from '../../../../src/models/chat';

interface NullableStringSchema {
  anyOf?: Array<{ type: string; enum?: string[] }>;
}

interface RelationshipShiftSchemaProperties {
  suggestedNewDynamic: NullableStringSchema;
  suggestedValenceChange: { description: string; minimum?: number; maximum?: number };
  suggestedTensionChange: { description: string; minimum?: number; maximum?: number };
}

interface StateUpdateSchemaProperties {
  relationshipShifts: {
    items: {
      properties: RelationshipShiftSchemaProperties;
    };
  };
  physicalStateUpdate: {
    properties: {
      newLocation: NullableStringSchema;
      newMicroLocation: NullableStringSchema;
      newDistanceBand: NullableStringSchema;
    };
  };
}

interface ChatStateUpdaterRootSchema {
  required: string[];
  additionalProperties: boolean;
  properties: {
    stateUpdate: {
      properties: StateUpdateSchemaProperties;
    };
  };
}

function makeValidStateUpdate(): Record<string, unknown> {
  return {
    stateUpdate: {
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
    },
    relationshipSnapshot: {
      dynamic: 'mutual suspicion',
      valence: -2,
      tension: 9,
      leverage: 'She knows he lied about the courier.',
      whatCharacterBelievesAboutInterlocutor: ['He is still concealing the courier meeting.'],
    },
  };
}

describe('CHAT_STATE_UPDATER_SCHEMA', () => {
  it('defines a strict OpenRouter json_schema response format', () => {
    expect(CHAT_STATE_UPDATER_SCHEMA.type).toBe('json_schema');
    expect(CHAT_STATE_UPDATER_SCHEMA.json_schema.name).toBe('chat_state_updater');
    expect(CHAT_STATE_UPDATER_SCHEMA.json_schema.strict).toBe(true);
  });

  it('requires the composite updater response top-level shape', () => {
    const schema = CHAT_STATE_UPDATER_SCHEMA.json_schema.schema as ChatStateUpdaterRootSchema;

    expect(schema.required).toEqual(['stateUpdate', 'relationshipSnapshot']);
    expect(schema.additionalProperties).toBe(false);
  });

  it('uses nullable physical fields and the canonical distance-band enum', () => {
    const schema = CHAT_STATE_UPDATER_SCHEMA.json_schema.schema as ChatStateUpdaterRootSchema;

    expect(schema.properties.stateUpdate.properties.relationshipShifts.items.properties.suggestedNewDynamic.anyOf).toEqual(
      [{ type: 'string' }, { type: 'null' }]
    );
    expect(schema.properties.stateUpdate.properties.physicalStateUpdate.properties.newLocation.anyOf).toEqual([
      { type: 'string' },
      { type: 'null' },
    ]);
    expect(schema.properties.stateUpdate.properties.physicalStateUpdate.properties.newMicroLocation.anyOf).toEqual([
      { type: 'string' },
      { type: 'null' },
    ]);
    expect(schema.properties.stateUpdate.properties.physicalStateUpdate.properties.newDistanceBand.anyOf).toEqual([
      {
        type: 'string',
        enum: ['INTIMATE', 'ARM_REACH', 'CONVERSATIONAL', 'ACROSS_ROOM', 'DISTANT'],
      },
      { type: 'null' },
    ]);
  });

  it('describes relationship deltas semantically without numeric constraints', () => {
    const relationshipShiftProperties = (
      CHAT_STATE_UPDATER_SCHEMA.json_schema.schema as ChatStateUpdaterRootSchema
    ).properties.stateUpdate.properties.relationshipShifts.items.properties;

    expect(relationshipShiftProperties.suggestedValenceChange.description).toContain(
      '-2 (large cooling)'
    );
    expect(relationshipShiftProperties.suggestedValenceChange.description).toContain(
      '+2 (large warming)'
    );
    expect(relationshipShiftProperties.suggestedTensionChange.description).toContain(
      '-2 (major de-escalation)'
    );
    expect(relationshipShiftProperties.suggestedTensionChange.description).toContain(
      '+2 (major escalation)'
    );
    expect(relationshipShiftProperties.suggestedValenceChange).not.toHaveProperty('minimum');
    expect(relationshipShiftProperties.suggestedValenceChange).not.toHaveProperty('maximum');
    expect(relationshipShiftProperties.suggestedTensionChange).not.toHaveProperty('minimum');
    expect(relationshipShiftProperties.suggestedTensionChange).not.toHaveProperty('maximum');
  });
});

describe('parseChatStateUpdaterResponse', () => {
  const validPayload = makeValidStateUpdate();
  const validStateUpdate = validPayload.stateUpdate as ChatStateUpdate;

  it('parses a valid ChatStateUpdate payload', () => {
    const result = parseChatStateUpdaterResponse(validPayload);

    expect(result.stateUpdate.relationshipShifts).toHaveLength(1);
    expect(result.stateUpdate.relationshipShifts[0].suggestedTensionChange).toBe(2);
    expect(result.stateUpdate.physicalStateUpdate.newDistanceBand).toBe('ARM_REACH');
    expect(result.relationshipSnapshot.leverage).toBe('She knows he lied about the courier.');
  });

  it('accepts nullable physical fields when set to null', () => {
    const result = parseChatStateUpdaterResponse({
      ...validPayload,
      stateUpdate: {
        ...validStateUpdate,
        physicalStateUpdate: {
          ...validStateUpdate.physicalStateUpdate,
          newLocation: null,
          newMicroLocation: null,
          newDistanceBand: null,
        },
      },
    });

    expect(result.stateUpdate.physicalStateUpdate.newLocation).toBeNull();
    expect(result.stateUpdate.physicalStateUpdate.newMicroLocation).toBeNull();
    expect(result.stateUpdate.physicalStateUpdate.newDistanceBand).toBeNull();
  });

  it('rejects relationship deltas outside the canonical -2..+2 bounds', () => {
    const invalid = {
      ...validPayload,
      stateUpdate: {
        ...validStateUpdate,
        relationshipShifts: [
          {
            ...validStateUpdate.relationshipShifts[0],
            suggestedTensionChange: 3,
          },
        ],
      },
    };

    expect(() => parseChatStateUpdaterResponse(invalid)).toThrow(
      'Chat State Updater response does not match the expected ChatStateUpdate shape'
    );
  });

  it('rejects a payload missing the canonical relationship snapshot', () => {
    const invalid = {
      stateUpdate: validStateUpdate,
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
