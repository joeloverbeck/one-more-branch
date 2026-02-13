import { STATE_ACCOUNTANT_SCHEMA } from '../../../../src/llm/schemas/state-accountant-schema';

describe('STATE_ACCOUNTANT_SCHEMA', () => {
  it('defines strict json_schema response format', () => {
    expect(STATE_ACCOUNTANT_SCHEMA.type).toBe('json_schema');
    expect(STATE_ACCOUNTANT_SCHEMA.json_schema.name).toBe('state_accountant');
    expect(STATE_ACCOUNTANT_SCHEMA.json_schema.strict).toBe(true);
  });

  it('requires top-level stateIntents and forbids additional properties', () => {
    const schema = STATE_ACCOUNTANT_SCHEMA.json_schema.schema as {
      required: string[];
      properties: Record<string, unknown>;
      additionalProperties: boolean;
    };

    expect(schema.required).toEqual(['stateIntents']);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties).toHaveProperty('stateIntents');
  });

  it('contains typed enums for threats, constraints, and threads', () => {
    const schema = STATE_ACCOUNTANT_SCHEMA.json_schema.schema as {
      properties: Record<string, unknown>;
    };
    const stateIntents = schema.properties.stateIntents as {
      properties: Record<string, unknown>;
    };
    const threatTypeEnum = (
      (stateIntents.properties.threats as {
        properties: Record<string, { items: { properties: Record<string, { enum?: string[] }> } }>;
      }).properties.add.items.properties.threatType
    ).enum;

    const constraintTypeEnum = (
      (stateIntents.properties.constraints as {
        properties: Record<string, { items: { properties: Record<string, { enum?: string[] }> } }>;
      }).properties.add.items.properties.constraintType
    ).enum;

    const threadTypeEnum = (
      (stateIntents.properties.threads as {
        properties: Record<string, { items: { properties: Record<string, { enum?: string[] }> } }>;
      }).properties.add.items.properties.threadType
    ).enum;

    expect(threatTypeEnum).toEqual(['HOSTILE_AGENT', 'ENVIRONMENTAL', 'CREATURE']);
    expect(constraintTypeEnum).toEqual(['PHYSICAL', 'ENVIRONMENTAL', 'TEMPORAL']);
    expect(threadTypeEnum).toEqual([
      'MYSTERY',
      'QUEST',
      'RELATIONSHIP',
      'DANGER',
      'INFORMATION',
      'RESOURCE',
      'MORAL',
    ]);
  });
});
