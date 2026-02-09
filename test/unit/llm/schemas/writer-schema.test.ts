import { WRITER_GENERATION_SCHEMA } from '../../../../src/llm/schemas/writer-schema';

describe('WRITER_GENERATION_SCHEMA', () => {
  it('should define strict writer json_schema response format', () => {
    expect(WRITER_GENERATION_SCHEMA.type).toBe('json_schema');
    expect(WRITER_GENERATION_SCHEMA.json_schema.name).toBe('writer_generation');
    expect(WRITER_GENERATION_SCHEMA.json_schema.strict).toBe(true);
  });

  it('should require core fields with active state fields and forbid additional properties', () => {
    const schema = WRITER_GENERATION_SCHEMA.json_schema.schema as {
      required: string[];
      additionalProperties: boolean;
    };

    expect(schema.required).toEqual([
      'narrative',
      'choices',
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
      'protagonistAffect',
      'sceneSummary',
      'isEnding',
    ]);
    expect(schema.additionalProperties).toBe(false);
  });

  it('should define active state fields with correct types', () => {
    const schema = WRITER_GENERATION_SCHEMA.json_schema.schema as {
      properties: Record<string, { type: string; items?: { type: string }; description: string }>;
    };

    expect(schema.properties.currentLocation.type).toBe('string');
    expect(schema.properties.threatsAdded.type).toBe('array');
    expect(schema.properties.threatsAdded.items?.type).toBe('string');
    expect(schema.properties.threatsRemoved.type).toBe('array');
    expect(schema.properties.threatsRemoved.items?.type).toBe('string');
    expect(schema.properties.constraintsAdded.type).toBe('array');
    expect(schema.properties.constraintsAdded.items?.type).toBe('string');
    expect(schema.properties.constraintsRemoved.type).toBe('array');
    expect(schema.properties.constraintsRemoved.items?.type).toBe('string');
    expect(schema.properties.threadsAdded.type).toBe('array');
    expect(schema.properties.threadsAdded.items?.type).toBe('string');
    expect(schema.properties.threadsResolved.type).toBe('array');
    expect(schema.properties.threadsResolved.items?.type).toBe('string');
  });

  it('should not contain legacy stateChangesAdded/stateChangesRemoved fields', () => {
    const schema = WRITER_GENERATION_SCHEMA.json_schema.schema as {
      properties: Record<string, unknown>;
      required: string[];
    };

    expect(schema.properties.stateChangesAdded).toBeUndefined();
    expect(schema.properties.stateChangesRemoved).toBeUndefined();
    expect(schema.required).not.toContain('stateChangesAdded');
    expect(schema.required).not.toContain('stateChangesRemoved');
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
