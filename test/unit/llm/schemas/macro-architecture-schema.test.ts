import { MACRO_ARCHITECTURE_SCHEMA } from '../../../../src/llm/schemas/macro-architecture-schema';

describe('MACRO_ARCHITECTURE_SCHEMA', () => {
  it('defines a strict OpenRouter json_schema response format', () => {
    expect(MACRO_ARCHITECTURE_SCHEMA.type).toBe('json_schema');
    expect(MACRO_ARCHITECTURE_SCHEMA.json_schema.name).toBe('macro_architecture_generation');
    expect(MACRO_ARCHITECTURE_SCHEMA.json_schema.strict).toBe(true);
  });

  it('avoids Anthropic-incompatible array cardinality keywords outside setpieceBank', () => {
    const schema = MACRO_ARCHITECTURE_SCHEMA.json_schema.schema as {
      properties: Record<string, unknown>;
    };

    // setpieceBank intentionally uses minItems/maxItems to enforce exactly 6 items
    const { setpieceBank: _setpieceBank, ...otherProperties } = schema.properties;
    void _setpieceBank;
    const otherSchemaStr = JSON.stringify(otherProperties);

    expect(otherSchemaStr).not.toMatch(/"minItems":\s*[2-9]/);
    expect(otherSchemaStr).not.toMatch(/"maxItems"/);

    // Verify setpieceBank enforces exactly 6 items
    const setpieceBankSchema = schema.properties['setpieceBank'] as {
      minItems: number;
      maxItems: number;
    };
    expect(setpieceBankSchema.minItems).toBe(6);
    expect(setpieceBankSchema.maxItems).toBe(6);
  });

  it('requires the macro contract fields and forbids extra properties', () => {
    const schema = MACRO_ARCHITECTURE_SCHEMA.json_schema.schema as {
      required: string[];
      additionalProperties: boolean;
      properties: {
        acts: {
          description: string;
          items: { required: string[]; additionalProperties: boolean };
        };
        anchorMoments: {
          required: string[];
          properties: {
            signatureScenarioPlacement: { anyOf: Array<{ type: string }> };
          };
        };
      };
    };

    expect(schema.required).toEqual([
      'overallTheme',
      'premise',
      'openingImage',
      'closingImage',
      'pacingBudget',
      'anchorMoments',
      'initialNpcAgendas',
      'setpieceBank',
      'acts',
    ]);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties.acts.description).toContain('3-5 macro acts');
    expect(schema.properties.acts.items.additionalProperties).toBe(false);
    expect(schema.properties.acts.items.required).toEqual([
      'name',
      'objective',
      'stakes',
      'entryCondition',
      'actQuestion',
      'exitReversal',
      'promiseTargets',
      'obligationTargets',
    ]);
    expect(schema.properties.anchorMoments.required).toEqual([
      'incitingIncident',
      'midpoint',
      'climax',
      'signatureScenarioPlacement',
    ]);
    expect(schema.properties.anchorMoments.properties.signatureScenarioPlacement.anyOf).toEqual([
      expect.objectContaining({ type: 'object' }),
      { type: 'null' },
    ]);
  });
});
