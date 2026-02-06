import { STORY_GENERATION_SCHEMA } from '../../../../src/llm/schemas/openrouter-schema';

describe('STORY_GENERATION_SCHEMA', () => {
  it('should define strict OpenRouter json_schema response format', () => {
    expect(STORY_GENERATION_SCHEMA.type).toBe('json_schema');
    expect(STORY_GENERATION_SCHEMA.json_schema.name).toBe('story_generation');
    expect(STORY_GENERATION_SCHEMA.json_schema.strict).toBe(true);
  });

  it('should require core generation fields and forbid additional properties', () => {
    const schema = STORY_GENERATION_SCHEMA.json_schema.schema as {
      required: string[];
      additionalProperties: boolean;
    };

    expect(schema.required).toEqual([
      'narrative',
      'choices',
      'stateChangesAdded',
      'stateChangesRemoved',
      'newCanonFacts',
      'newCharacterCanonFacts',
      'inventoryAdded',
      'inventoryRemoved',
      'isEnding',
    ]);
    expect(schema.additionalProperties).toBe(false);
  });

  it('should define narrative field with description', () => {
    const schema = STORY_GENERATION_SCHEMA.json_schema.schema as {
      properties: Record<string, { type: string; description: string }>;
    };

    expect(schema.properties.narrative.type).toBe('string');
    expect(schema.properties.narrative.description).toContain('second person');
  });

  it('should define choices as array of strings', () => {
    const schema = STORY_GENERATION_SCHEMA.json_schema.schema as {
      properties: Record<string, { type: string; items?: { type: string } }>;
    };

    expect(schema.properties.choices.type).toBe('array');
    expect(schema.properties.choices.items?.type).toBe('string');
  });

  it('should define newCharacterCanonFacts with nested object structure', () => {
    const schema = STORY_GENERATION_SCHEMA.json_schema.schema as {
      properties: Record<string, { type: string; items?: { type: string; properties?: Record<string, unknown>; required?: string[] } }>;
    };

    expect(schema.properties.newCharacterCanonFacts.type).toBe('array');
    expect(schema.properties.newCharacterCanonFacts.items?.type).toBe('object');
    expect(schema.properties.newCharacterCanonFacts.items?.required).toEqual(['characterName', 'facts']);
  });

  it('should define inventory fields as arrays', () => {
    const schema = STORY_GENERATION_SCHEMA.json_schema.schema as {
      properties: Record<string, { type: string; items?: { type: string } }>;
    };

    expect(schema.properties.inventoryAdded.type).toBe('array');
    expect(schema.properties.inventoryAdded.items?.type).toBe('string');
    expect(schema.properties.inventoryRemoved.type).toBe('array');
    expect(schema.properties.inventoryRemoved.items?.type).toBe('string');
  });
});
