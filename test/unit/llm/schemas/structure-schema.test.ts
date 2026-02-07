import { STRUCTURE_GENERATION_SCHEMA } from '../../../../src/llm/schemas/structure-schema';

describe('STRUCTURE_GENERATION_SCHEMA', () => {
  it('should define strict OpenRouter json_schema response format', () => {
    expect(STRUCTURE_GENERATION_SCHEMA.type).toBe('json_schema');
    expect(STRUCTURE_GENERATION_SCHEMA.json_schema.name).toBe('story_structure_generation');
    expect(STRUCTURE_GENERATION_SCHEMA.json_schema.strict).toBe(true);
  });

  it('should require exactly 3 acts and 2-4 beats per act', () => {
    const schema = STRUCTURE_GENERATION_SCHEMA.json_schema.schema as {
      properties: {
        acts: {
          minItems: number;
          maxItems: number;
          items: { properties: { beats: { minItems: number; maxItems: number } } };
        };
      };
    };

    expect(schema.properties.acts.minItems).toBe(3);
    expect(schema.properties.acts.maxItems).toBe(3);
    expect(schema.properties.acts.items.properties.beats.minItems).toBe(2);
    expect(schema.properties.acts.items.properties.beats.maxItems).toBe(4);
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
