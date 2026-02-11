import { WRITER_GENERATION_SCHEMA } from '../../../../src/llm/schemas/writer-schema';

describe('WRITER_GENERATION_SCHEMA', () => {
  it('should define strict writer json_schema response format', () => {
    expect(WRITER_GENERATION_SCHEMA.type).toBe('json_schema');
    expect(WRITER_GENERATION_SCHEMA.json_schema.name).toBe('writer_generation');
    expect(WRITER_GENERATION_SCHEMA.json_schema.strict).toBe(true);
  });

  it('should require creative-only fields and forbid additional properties', () => {
    const schema = WRITER_GENERATION_SCHEMA.json_schema.schema as {
      required: string[];
      additionalProperties: boolean;
    };

    expect(schema.required).toEqual([
      'narrative',
      'choices',
      'protagonistAffect',
      'sceneSummary',
      'isEnding',
    ]);
    expect(schema.additionalProperties).toBe(false);
  });

  it('should define creative-only fields with correct types', () => {
    const schema = WRITER_GENERATION_SCHEMA.json_schema.schema as {
      properties: Record<
        string,
        {
          type: string;
          items?: {
            type: string;
            required?: string[];
            properties?: Record<string, { type: string; enum?: string[] }>;
          };
          description: string;
        }
      >;
    };

    expect(schema.properties.narrative.type).toBe('string');
    expect(schema.properties.choices.type).toBe('array');
    expect(schema.properties.choices.items?.type).toBe('object');
    expect(schema.properties.choices.items?.required).toEqual(['text', 'choiceType', 'primaryDelta']);
    expect(schema.properties.protagonistAffect.type).toBe('object');
    expect(schema.properties.sceneSummary.type).toBe('string');
    expect(schema.properties.isEnding.type).toBe('boolean');
  });

  it('should reject all state and canon mutation fields in properties and required', () => {
    const schema = WRITER_GENERATION_SCHEMA.json_schema.schema as {
      properties: Record<string, unknown>;
      required: string[];
    };

    const removedFields = [
      'currentLocation',
      'threatsAdded',
      'threatsRemoved',
      'constraintsAdded',
      'constraintsRemoved',
      'threadsAdded',
      'threadsResolved',
      'newCanonFacts',
      'newCharacterCanonFacts',
      'inventoryAdded',
      'inventoryRemoved',
      'healthAdded',
      'healthRemoved',
      'characterStateChangesAdded',
      'characterStateChangesRemoved',
      'stateChangesAdded',
      'stateChangesRemoved',
    ];

    removedFields.forEach((field) => {
      expect(schema.properties[field]).toBeUndefined();
      expect(schema.required).not.toContain(field);
    });
  });

  it('should not contain analyst fields (beat/deviation)', () => {
    const schema = WRITER_GENERATION_SCHEMA.json_schema.schema as {
      properties: Record<string, unknown>;
      required: string[];
    };

    expect(schema.properties.beatConcluded).toBeUndefined();
    expect(schema.properties.beatResolution).toBeUndefined();
    expect(schema.properties.deviationDetected).toBeUndefined();
    expect(schema.properties.deviationReason).toBeUndefined();
    expect(schema.properties.invalidatedBeatIds).toBeUndefined();
    expect(schema.properties.narrativeSummary).toBeUndefined();
  });
});
