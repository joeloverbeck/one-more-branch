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

  it('includes narrativeFocus enum in properties and required list', () => {
    const schema = ANALYST_SCHEMA.json_schema.schema as {
      properties: Record<string, unknown>;
      required: string[];
    };
    const narrativeFocus = schema.properties['narrativeFocus'] as {
      enum?: string[];
      type?: string;
    };

    expect(narrativeFocus).toBeDefined();
    expect(narrativeFocus.type).toBe('string');
    expect(narrativeFocus.enum).toEqual(
      expect.arrayContaining(['DEEPENING', 'BROADENING', 'BALANCED'])
    );
    expect(schema.required).toContain('narrativeFocus');
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

  it('includes delayedConsequencesTriggered as array in properties and required list', () => {
    const schema = ANALYST_SCHEMA.json_schema.schema as {
      properties: Record<string, unknown>;
      required: string[];
    };
    const delayedConsequencesTriggered = schema.properties['delayedConsequencesTriggered'] as {
      type?: string;
      items?: Record<string, unknown>;
    };

    expect(delayedConsequencesTriggered).toBeDefined();
    expect(delayedConsequencesTriggered.type).toBe('array');
    expect(delayedConsequencesTriggered.items).toEqual({ type: 'string' });
    expect(schema.required).toContain('delayedConsequencesTriggered');
  });

  it('includes knowledgeAsymmetryDetected object array in properties and required list', () => {
    const schema = ANALYST_SCHEMA.json_schema.schema as {
      properties: Record<string, unknown>;
      required: string[];
    };
    const knowledgeAsymmetryDetected = schema.properties['knowledgeAsymmetryDetected'] as {
      type?: string;
      items?: {
        type?: string;
        required?: string[];
      };
    };

    expect(knowledgeAsymmetryDetected).toBeDefined();
    expect(knowledgeAsymmetryDetected.type).toBe('array');
    expect(knowledgeAsymmetryDetected.items?.type).toBe('object');
    expect(knowledgeAsymmetryDetected.items?.required).toEqual(
      expect.arrayContaining(['characterName', 'knownFacts', 'falseBeliefs', 'secrets'])
    );
    expect(schema.required).toContain('knowledgeAsymmetryDetected');
  });

  it('includes dramaticIronyOpportunities string array in properties and required list', () => {
    const schema = ANALYST_SCHEMA.json_schema.schema as {
      properties: Record<string, unknown>;
      required: string[];
    };
    const dramaticIronyOpportunities = schema.properties['dramaticIronyOpportunities'] as {
      type?: string;
      items?: Record<string, unknown>;
    };

    expect(dramaticIronyOpportunities).toBeDefined();
    expect(dramaticIronyOpportunities.type).toBe('array');
    expect(dramaticIronyOpportunities.items).toEqual({ type: 'string' });
    expect(schema.required).toContain('dramaticIronyOpportunities');
  });
});
