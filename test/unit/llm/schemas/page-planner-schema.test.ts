import { PAGE_PLANNER_GENERATION_SCHEMA } from '../../../../src/llm/schemas/page-planner-schema';

describe('PAGE_PLANNER_GENERATION_SCHEMA', () => {
  it('defines strict json_schema response format', () => {
    expect(PAGE_PLANNER_GENERATION_SCHEMA.type).toBe('json_schema');
    expect(PAGE_PLANNER_GENERATION_SCHEMA.json_schema.name).toBe('page_planner_generation');
    expect(PAGE_PLANNER_GENERATION_SCHEMA.json_schema.strict).toBe(true);
  });

  it('requires PagePlan top-level fields and forbids additional properties', () => {
    const schema = PAGE_PLANNER_GENERATION_SCHEMA.json_schema.schema as {
      required: string[];
      additionalProperties: boolean;
    };

    expect(schema.required).toEqual([
      'sceneIntent', 'continuityAnchors', 'stateIntents', 'writerBrief',
      'dramaticQuestion', 'choiceIntents',
    ]);
    expect(schema.additionalProperties).toBe(false);
  });

  it('should not use minItems > 1 or maxItems (unsupported by Anthropic)', () => {
    const schemaStr = JSON.stringify(PAGE_PLANNER_GENERATION_SCHEMA);
    // Anthropic only supports minItems: 0 or 1
    expect(schemaStr).not.toMatch(/"minItems":\s*[2-9]/);
    expect(schemaStr).not.toMatch(/"maxItems"/);
  });

  it('defines required stateIntents categories and thread enums', () => {
    const schema = PAGE_PLANNER_GENERATION_SCHEMA.json_schema.schema as {
      properties: Record<string, unknown>;
    };
    const stateIntents = schema.properties.stateIntents as {
      required: string[];
      additionalProperties: boolean;
      properties: Record<string, unknown>;
    };
    const threads = stateIntents.properties.threads as {
      properties: Record<string, unknown>;
      required: string[];
    };
    const threadAddItems = (threads.properties.add as { items: { properties: Record<string, { enum?: string[] }> } })
      .items;

    expect(stateIntents.required).toEqual([
      'currentLocation',
      'threats',
      'constraints',
      'threads',
      'inventory',
      'health',
      'characterState',
      'canon',
    ]);
    expect(stateIntents.additionalProperties).toBe(false);
    expect(threads.required).toEqual(['add', 'resolveIds']);
    expect(threadAddItems.properties.threadType?.enum).toEqual([
      'MYSTERY',
      'QUEST',
      'RELATIONSHIP',
      'DANGER',
      'INFORMATION',
      'RESOURCE',
      'MORAL',
    ]);
    expect(threadAddItems.properties.urgency?.enum).toEqual(['LOW', 'MEDIUM', 'HIGH']);
  });
});
