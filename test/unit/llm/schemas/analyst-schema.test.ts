import { ANALYST_SCHEMA } from '../../../../src/llm/schemas/analyst-schema';

describe('ANALYST_SCHEMA', () => {
  it('should define strict OpenRouter json_schema response format', () => {
    expect(ANALYST_SCHEMA.type).toBe('json_schema');
    expect(ANALYST_SCHEMA.json_schema.name).toBe('analyst_evaluation');
    expect(ANALYST_SCHEMA.json_schema.strict).toBe(true);
  });

  describe('spineInvalidatedElement', () => {
    const schema = ANALYST_SCHEMA.json_schema.schema as {
      properties: {
        spineInvalidatedElement: Record<string, unknown>;
      };
    };
    const prop = schema.properties.spineInvalidatedElement;

    it('should use anyOf pattern instead of type array (Anthropic strict mode)', () => {
      expect(prop).toHaveProperty('anyOf');
      expect(prop).not.toHaveProperty('type');
    });

    it('should allow all three spine element enum values', () => {
      const anyOf = (prop as { anyOf: Array<Record<string, unknown>> }).anyOf;
      const stringVariant = anyOf.find((v) => v.type === 'string') as {
        enum: string[];
      };
      expect(stringVariant).toBeDefined();
      expect(stringVariant.enum).toEqual(
        expect.arrayContaining(['dramatic_question', 'antagonistic_force', 'need_want'])
      );
      expect(stringVariant.enum).toHaveLength(3);
    });

    it('should allow null via anyOf', () => {
      const anyOf = (prop as { anyOf: Array<Record<string, unknown>> }).anyOf;
      const nullVariant = anyOf.find((v) => v.type === 'null');
      expect(nullVariant).toBeDefined();
    });
  });

  it('includes thematic charge fields in properties and required list', () => {
    const schema = ANALYST_SCHEMA.json_schema.schema as {
      properties: Record<string, unknown>;
      required: string[];
    };

    expect(schema.properties).toHaveProperty('thematicCharge');
    expect(schema.properties).toHaveProperty('thematicChargeDescription');
    expect(schema.required).toEqual(
      expect.arrayContaining(['thematicCharge', 'thematicChargeDescription'])
    );
  });

  it('includes premisePromiseFulfilled as nullable string in properties and required list', () => {
    const schema = ANALYST_SCHEMA.json_schema.schema as {
      properties: Record<string, unknown>;
      required: string[];
    };
    const premisePromiseFulfilled = schema.properties['premisePromiseFulfilled'] as {
      anyOf?: Array<Record<string, unknown>>;
    };

    expect(premisePromiseFulfilled).toBeDefined();
    expect(premisePromiseFulfilled.anyOf).toEqual(
      expect.arrayContaining([{ type: 'string' }, { type: 'null' }])
    );
    expect(schema.required).toContain('premisePromiseFulfilled');
  });

  it('includes obligatorySceneFulfilled as nullable string in properties and required list', () => {
    const schema = ANALYST_SCHEMA.json_schema.schema as {
      properties: Record<string, unknown>;
      required: string[];
    };
    const obligatorySceneFulfilled = schema.properties['obligatorySceneFulfilled'] as {
      anyOf?: Array<Record<string, unknown>>;
    };

    expect(obligatorySceneFulfilled).toBeDefined();
    expect(obligatorySceneFulfilled.anyOf).toEqual(
      expect.arrayContaining([{ type: 'string' }, { type: 'null' }])
    );
    expect(schema.required).toContain('obligatorySceneFulfilled');
  });
});
