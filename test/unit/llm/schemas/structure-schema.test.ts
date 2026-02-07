import { STRUCTURE_GENERATION_SCHEMA } from '../../../../src/llm/schemas/structure-schema';

describe('STRUCTURE_GENERATION_SCHEMA', () => {
  it('should define strict OpenRouter json_schema response format', () => {
    expect(STRUCTURE_GENERATION_SCHEMA.type).toBe('json_schema');
    expect(STRUCTURE_GENERATION_SCHEMA.json_schema.name).toBe('story_structure_generation');
    expect(STRUCTURE_GENERATION_SCHEMA.json_schema.strict).toBe(true);
  });

  it('should not use minItems > 1 or maxItems (unsupported by Anthropic)', () => {
    const schemaStr = JSON.stringify(STRUCTURE_GENERATION_SCHEMA);
    // Anthropic only supports minItems: 0 or 1
    expect(schemaStr).not.toMatch(/"minItems":\s*[2-9]/);
    expect(schemaStr).not.toMatch(/"maxItems"/);
  });

  it('should document array constraints in descriptions (runtime validated)', () => {
    const schema = STRUCTURE_GENERATION_SCHEMA.json_schema.schema as {
      properties: {
        acts: {
          description: string;
          items: { properties: { beats: { description: string } } };
        };
      };
    };

    // Constraints documented in descriptions, enforced at runtime
    expect(schema.properties.acts.description).toContain('3 acts');
    expect(schema.properties.acts.items.properties.beats.description).toContain('2-4');
  });

  it('should require all act and beat fields', () => {
    const schema = STRUCTURE_GENERATION_SCHEMA.json_schema.schema as {
      properties: {
        acts: {
          items: {
            required: string[];
            properties: { beats: { items: { required: string[] } } };
          };
        };
      };
      required: string[];
      additionalProperties: boolean;
    };

    expect(schema.required).toEqual(['overallTheme', 'acts']);
    expect(schema.properties.acts.items.required).toEqual([
      'name',
      'objective',
      'stakes',
      'entryCondition',
      'beats',
    ]);
    expect(schema.properties.acts.items.properties.beats.items.required).toEqual([
      'description',
      'objective',
    ]);
    expect(schema.additionalProperties).toBe(false);
  });
});
