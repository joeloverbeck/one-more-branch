import {
  CHAT_PLANNER_SCHEMA,
  parseChatPlannerResponse,
} from '../../../../src/llm/schemas/chat-planner-schema';

function makeValidTurnPlan(): Record<string, unknown> {
  return {
    internalSelfCheck: {
      whatDoIWant: 'Make him admit he lied first.',
      whatDoIKnow: 'He is hiding something about the courier.',
      whatAmIHiding: 'I already copied the cipher key.',
      howHonestAmI: 'I will tell enough truth to keep leverage.',
    },
    responseGoal: 'Pressure him into a revealing reaction.',
    speechAct: 'PROBE',
    honestyMode: 'PARTIAL',
    surfaceEmotion: 'contained anger',
    suppressedEmotion: 'hurt',
    subtext: 'I want him to feel watched and cornered.',
    mustAddress: ['His accusation', 'The missing courier'],
    mustAvoid: ['Admitting who gave me the key'],
    blockPlan: ['ACTION', 'SPEECH'],
    actionPlan: [
      {
        kind: 'GESTURE',
        text: 'Tightens one hand around the lantern handle.',
        changesPhysicalState: false,
      },
    ],
    questionBack: 'Then tell me why the courier never reached the port.',
    targetLength: 'MEDIUM',
    expectedImpact: {
      relationshipDeltaHint: -1,
      tensionDeltaHint: 2,
      revealsSecret: false,
    },
  };
}

describe('CHAT_PLANNER_SCHEMA', () => {
  it('defines a strict OpenRouter json_schema response format', () => {
    expect(CHAT_PLANNER_SCHEMA.type).toBe('json_schema');
    expect(CHAT_PLANNER_SCHEMA.json_schema.name).toBe('chat_planner');
    expect(CHAT_PLANNER_SCHEMA.json_schema.strict).toBe(true);
  });

  it('requires the full TurnPlannerOutput top-level shape', () => {
    const schema = CHAT_PLANNER_SCHEMA.json_schema.schema as {
      required: string[];
      additionalProperties: boolean;
    };

    expect(schema.required).toEqual([
      'internalSelfCheck',
      'responseGoal',
      'speechAct',
      'honestyMode',
      'surfaceEmotion',
      'suppressedEmotion',
      'subtext',
      'mustAddress',
      'mustAvoid',
      'blockPlan',
      'actionPlan',
      'questionBack',
      'targetLength',
      'expectedImpact',
    ]);
    expect(schema.additionalProperties).toBe(false);
  });

  it('constrains planner enums and block plan to canonical values', () => {
    const schema = CHAT_PLANNER_SCHEMA.json_schema.schema as {
      properties: {
        speechAct: { enum: string[] };
        honestyMode: { enum: string[] };
        targetLength: { enum: string[] };
        blockPlan: { items: { enum: string[] } };
      };
    };

    expect(schema.properties.speechAct.enum).toEqual([
      'ASSERT',
      'DEFLECT',
      'PROBE',
      'CONCEDE',
      'CHALLENGE',
      'COMFORT',
      'THREATEN',
      'REVEAL',
      'DECEIVE',
      'WITHDRAW',
    ]);
    expect(schema.properties.honestyMode.enum).toEqual([
      'FULL',
      'PARTIAL',
      'EVASIVE',
      'DECEPTIVE',
    ]);
    expect(schema.properties.targetLength.enum).toEqual(['SHORT', 'MEDIUM', 'LONG']);
    expect(schema.properties.blockPlan.items.enum).toEqual(['ACTION', 'SPEECH']);
  });

  it('uses anyOf for nullable planner fields', () => {
    const schema = CHAT_PLANNER_SCHEMA.json_schema.schema as {
      properties: {
        suppressedEmotion: { anyOf?: Array<{ type: string }> };
        questionBack: { anyOf?: Array<{ type: string }> };
      };
    };

    expect(schema.properties.suppressedEmotion.anyOf).toEqual([
      { type: 'string' },
      { type: 'null' },
    ]);
    expect(schema.properties.questionBack.anyOf).toEqual([{ type: 'string' }, { type: 'null' }]);
  });

  it('describes expected-impact deltas semantically without numeric constraints', () => {
    const expectedImpact = (
      CHAT_PLANNER_SCHEMA.json_schema.schema as {
        properties: {
          expectedImpact: {
            properties: {
              relationshipDeltaHint: { description: string; minimum?: number; maximum?: number };
              tensionDeltaHint: { description: string; minimum?: number; maximum?: number };
            };
          };
        };
      }
    ).properties.expectedImpact.properties;

    expect(expectedImpact.relationshipDeltaHint.description).toContain('-2 (large cooling)');
    expect(expectedImpact.relationshipDeltaHint.description).toContain('+2 (large warming)');
    expect(expectedImpact.tensionDeltaHint.description).toContain('-2 (major de-escalation)');
    expect(expectedImpact.tensionDeltaHint.description).toContain('+2 (major escalation)');
    expect(expectedImpact.relationshipDeltaHint).not.toHaveProperty('minimum');
    expect(expectedImpact.relationshipDeltaHint).not.toHaveProperty('maximum');
    expect(expectedImpact.tensionDeltaHint).not.toHaveProperty('minimum');
    expect(expectedImpact.tensionDeltaHint).not.toHaveProperty('maximum');
  });
});

describe('parseChatPlannerResponse', () => {
  it('parses a valid TurnPlannerOutput payload', () => {
    const result = parseChatPlannerResponse(makeValidTurnPlan());

    expect(result.speechAct).toBe('PROBE');
    expect(result.blockPlan).toEqual(['ACTION', 'SPEECH']);
    expect(result.expectedImpact.tensionDeltaHint).toBe(2);
  });

  it('accepts nullable planner fields when set to null', () => {
    const result = parseChatPlannerResponse({
      ...makeValidTurnPlan(),
      suppressedEmotion: null,
      questionBack: null,
    });

    expect(result.suppressedEmotion).toBeNull();
    expect(result.questionBack).toBeNull();
  });

  it('rejects payloads that violate the existing TurnPlannerOutput validator', () => {
    const invalid = {
      ...makeValidTurnPlan(),
      expectedImpact: {
        ...(makeValidTurnPlan().expectedImpact as Record<string, unknown>),
        tensionDeltaHint: 3,
      },
    };

    expect(() => parseChatPlannerResponse(invalid)).toThrow(
      'Chat Planner response does not match the expected TurnPlannerOutput shape'
    );
  });

  it('rejects non-object payloads', () => {
    expect(() => parseChatPlannerResponse('not an object')).toThrow(
      'Chat Planner response does not match the expected TurnPlannerOutput shape'
    );
  });
});
