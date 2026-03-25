import {
  CHARACTER_BRAINSTORMER_SCHEMA,
  parseCharacterBrainstormerResponse,
} from '../../../../src/llm/schemas/character-brainstormer-schema';

function makeCharacter(overrides: Record<string, unknown> = {}): Record<string, string> {
  return {
    name: 'Test Character',
    highConceptPitch: 'A pitch with tension',
    coreWound: 'A specific wound event',
    centralContradiction: 'Public vs private',
    archetypeAndSubversion: 'Archetype + subversion',
    suggestedStoryFunction: 'ANTAGONIST',
    relationshipDynamicHint: 'Creates friction via rivalry',
    whatMakesThemMemorable: 'Distinctive quality',
    metaphorFamily: 'cooking',
    ...overrides,
  };
}

function makeValidResponse(characterCount: number): Record<string, unknown> {
  return {
    characters: Array.from({ length: characterCount }, (_, i) =>
      makeCharacter({ name: `Character ${i + 1}` })
    ),
    diversityNote: 'Techniques rotated across the set.',
  };
}

describe('CHARACTER_BRAINSTORMER_SCHEMA', () => {
  it('defines a strict OpenRouter json_schema response format', () => {
    expect(CHARACTER_BRAINSTORMER_SCHEMA.type).toBe('json_schema');
    expect(CHARACTER_BRAINSTORMER_SCHEMA.json_schema.name).toBe('character_brainstormer');
    expect(CHARACTER_BRAINSTORMER_SCHEMA.json_schema.strict).toBe(true);
  });

  it('requires characters and diversityNote at top level', () => {
    const schema = CHARACTER_BRAINSTORMER_SCHEMA.json_schema.schema as {
      required: string[];
      additionalProperties: boolean;
    };

    expect(schema.required).toEqual(['characters', 'diversityNote']);
    expect(schema.additionalProperties).toBe(false);
  });

  it('requires all 9 character fields', () => {
    const schema = CHARACTER_BRAINSTORMER_SCHEMA.json_schema.schema as {
      properties: {
        characters: {
          items: {
            required: string[];
            additionalProperties: boolean;
          };
        };
      };
    };

    const itemSchema = schema.properties.characters.items;
    expect(itemSchema.required).toEqual([
      'name',
      'highConceptPitch',
      'coreWound',
      'centralContradiction',
      'archetypeAndSubversion',
      'suggestedStoryFunction',
      'relationshipDynamicHint',
      'whatMakesThemMemorable',
      'metaphorFamily',
    ]);
    expect(itemSchema.additionalProperties).toBe(false);
  });
});

describe('parseCharacterBrainstormerResponse', () => {
  it('parses a valid response with 6 characters', () => {
    const raw = makeValidResponse(6);
    const result = parseCharacterBrainstormerResponse(raw);

    expect(result.characters).toHaveLength(6);
    expect(result.characters[0].name).toBe('Character 1');
    expect(result.diversityNote).toBe('Techniques rotated across the set.');
  });

  it('parses a valid response with 10 characters', () => {
    const raw = makeValidResponse(10);
    const result = parseCharacterBrainstormerResponse(raw);

    expect(result.characters).toHaveLength(10);
    expect(result.characters[9].name).toBe('Character 10');
  });

  it('caps characters at 10 if LLM returns more', () => {
    const raw = makeValidResponse(12);
    const result = parseCharacterBrainstormerResponse(raw);

    expect(result.characters).toHaveLength(10);
  });

  it('trims whitespace from all character fields', () => {
    const raw = {
      characters: [
        makeCharacter({ name: '  Trimmed Name  ', coreWound: '  wound  ' }),
        ...Array.from({ length: 5 }, (_, i) => makeCharacter({ name: `Char ${i + 2}` })),
      ],
      diversityNote: '  note  ',
    };

    const result = parseCharacterBrainstormerResponse(raw);

    expect(result.characters[0].name).toBe('Trimmed Name');
    expect(result.characters[0].coreWound).toBe('wound');
    expect(result.diversityNote).toBe('note');
  });

  it('throws on non-object response', () => {
    expect(() => parseCharacterBrainstormerResponse('not an object')).toThrow(
      'must be an object'
    );
    expect(() => parseCharacterBrainstormerResponse(null)).toThrow('must be an object');
    expect(() => parseCharacterBrainstormerResponse([])).toThrow('must be an object');
  });

  it('throws on missing characters array', () => {
    expect(() => parseCharacterBrainstormerResponse({ diversityNote: 'note' })).toThrow(
      'missing characters array'
    );
  });

  it('throws when fewer than 6 characters', () => {
    const raw = makeValidResponse(5);
    expect(() => parseCharacterBrainstormerResponse(raw)).toThrow('Expected at least 6');
  });

  it('throws on missing diversityNote', () => {
    const raw = { characters: makeValidResponse(6).characters };
    expect(() => parseCharacterBrainstormerResponse(raw)).toThrow('missing diversityNote');
  });

  it('throws on empty diversityNote', () => {
    const raw = { characters: makeValidResponse(6).characters, diversityNote: '   ' };
    expect(() => parseCharacterBrainstormerResponse(raw)).toThrow('missing diversityNote');
  });

  it('throws on character with missing required field', () => {
    const chars = Array.from({ length: 6 }, (_, i) => makeCharacter({ name: `Char ${i + 1}` }));
    const { coreWound: _removed, ...incomplete } = chars[2];
    void _removed;
    chars[2] = incomplete as Record<string, string>;

    expect(() =>
      parseCharacterBrainstormerResponse({ characters: chars, diversityNote: 'note' })
    ).toThrow('Character 3 missing or empty field: coreWound');
  });

  it('throws on character with empty string field', () => {
    const chars = Array.from({ length: 6 }, (_, i) => makeCharacter({ name: `Char ${i + 1}` }));
    chars[0] = makeCharacter({ name: 'Char 1', metaphorFamily: '' });

    expect(() =>
      parseCharacterBrainstormerResponse({ characters: chars, diversityNote: 'note' })
    ).toThrow('Character 1 missing or empty field: metaphorFamily');
  });

  it('throws on non-object character entry', () => {
    const chars = [...Array.from({ length: 5 }, (_, i) => makeCharacter({ name: `Char ${i + 1}` })), 'not an object'];

    expect(() =>
      parseCharacterBrainstormerResponse({ characters: chars, diversityNote: 'note' })
    ).toThrow('Character 6 must be an object');
  });

  it('returns readonly arrays', () => {
    const result = parseCharacterBrainstormerResponse(makeValidResponse(6));

    expect(Array.isArray(result.characters)).toBe(true);
    expect(result.characters).toHaveLength(6);
  });
});
