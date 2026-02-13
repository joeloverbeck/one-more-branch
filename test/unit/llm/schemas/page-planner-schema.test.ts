import { PAGE_PLANNER_GENERATION_SCHEMA } from '../../../../src/llm/schemas/page-planner-schema';

describe('PAGE_PLANNER_GENERATION_SCHEMA', () => {
  it('defines strict json_schema response format', () => {
    expect(PAGE_PLANNER_GENERATION_SCHEMA.type).toBe('json_schema');
    expect(PAGE_PLANNER_GENERATION_SCHEMA.json_schema.name).toBe('page_planner_generation');
    expect(PAGE_PLANNER_GENERATION_SCHEMA.json_schema.strict).toBe(true);
  });

  it('requires reduced planner top-level fields and forbids additional properties', () => {
    const schema = PAGE_PLANNER_GENERATION_SCHEMA.json_schema.schema as {
      required: string[];
      additionalProperties: boolean;
      properties: Record<string, unknown>;
    };

    expect(schema.required).toEqual([
      'sceneIntent',
      'continuityAnchors',
      'writerBrief',
      'dramaticQuestion',
      'choiceIntents',
    ]);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties).not.toHaveProperty('stateIntents');
  });

  it('should not use minItems > 1 or maxItems (unsupported by Anthropic)', () => {
    const schemaStr = JSON.stringify(PAGE_PLANNER_GENERATION_SCHEMA);
    expect(schemaStr).not.toMatch(/"minItems":\s*[2-9]/);
    expect(schemaStr).not.toMatch(/"maxItems"/);
  });

  it('defines choice intent enum values', () => {
    const schema = PAGE_PLANNER_GENERATION_SCHEMA.json_schema.schema as {
      properties: Record<string, unknown>;
    };
    const choiceIntents = schema.properties.choiceIntents as {
      items: { properties: Record<string, { enum?: string[] }> };
    };

    expect(choiceIntents.items.properties.choiceType?.enum).toContain('CONFRONTATION');
    expect(choiceIntents.items.properties.primaryDelta?.enum).toContain('THREAT_SHIFT');
  });
});
