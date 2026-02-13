import { STRUCTURE_GENERATION_SCHEMA } from '../../../../src/llm/schemas/structure-schema';

describe('STRUCTURE_GENERATION_SCHEMA', () => {
  it('should define strict OpenRouter json_schema response format', () => {
    expect(STRUCTURE_GENERATION_SCHEMA.type).toBe('json_schema');
    expect(STRUCTURE_GENERATION_SCHEMA.json_schema.name).toBe('story_structure_generation');
    expect(STRUCTURE_GENERATION_SCHEMA.json_schema.strict).toBe(true);
  });

  it('should enforce act count constraints via minItems and maxItems', () => {
    const schema = STRUCTURE_GENERATION_SCHEMA.json_schema.schema as {
      properties: {
        acts: { minItems: number; maxItems: number };
      };
    };

    expect(schema.properties.acts.minItems).toBe(3);
    expect(schema.properties.acts.maxItems).toBe(5);
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

    expect(schema.properties.acts.description).toContain('3-5 acts');
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

    expect(schema.required).toEqual([
      'overallTheme',
      'premise',
      'pacingBudget',
      'acts',
      'initialNpcAgendas',
      'toneKeywords',
      'toneAntiKeywords',
    ]);
    expect(schema.properties.acts.items.required).toEqual([
      'name',
      'objective',
      'stakes',
      'entryCondition',
      'beats',
    ]);
    expect(schema.properties.acts.items.properties.beats.items.required).toEqual([
      'name',
      'description',
      'objective',
      'role',
    ]);
    expect(schema.additionalProperties).toBe(false);
  });

  it('should include premise as a string property', () => {
    const schema = STRUCTURE_GENERATION_SCHEMA.json_schema.schema as {
      properties: { premise: { type: string; description: string } };
    };

    expect(schema.properties.premise.type).toBe('string');
    expect(schema.properties.premise.description).toContain('dramatic question');
  });

  it('should include pacingBudget as an object with targetPagesMin and targetPagesMax', () => {
    const schema = STRUCTURE_GENERATION_SCHEMA.json_schema.schema as {
      properties: {
        pacingBudget: {
          type: string;
          required: string[];
          properties: {
            targetPagesMin: { type: string };
            targetPagesMax: { type: string };
          };
        };
      };
    };

    expect(schema.properties.pacingBudget.type).toBe('object');
    expect(schema.properties.pacingBudget.required).toEqual(['targetPagesMin', 'targetPagesMax']);
    expect(schema.properties.pacingBudget.properties.targetPagesMin.type).toBe('number');
    expect(schema.properties.pacingBudget.properties.targetPagesMax.type).toBe('number');
  });

  it('should include beat role as an enum of dramatic function values', () => {
    const schema = STRUCTURE_GENERATION_SCHEMA.json_schema.schema as {
      properties: {
        acts: {
          items: {
            properties: {
              beats: {
                items: {
                  properties: {
                    role: { type: string; enum: string[] };
                  };
                };
              };
            };
          };
        };
      };
    };

    const roleSchema = schema.properties.acts.items.properties.beats.items.properties.role;
    expect(roleSchema.type).toBe('string');
    expect(roleSchema.enum).toEqual(['setup', 'escalation', 'turning_point', 'resolution']);
  });
});
