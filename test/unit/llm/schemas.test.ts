import { ZodError } from 'zod';
import {
  GenerationResultSchema,
  STORY_GENERATION_SCHEMA,
  isStructuredOutputNotSupported,
  validateGenerationResponse,
} from '../../../src/llm/schemas';

const VALID_NARRATIVE =
  'You step through the shattered gate and feel the cold wind carry ash across your face as the ruined city groans awake around you.';

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
      'stateChanges',
      'newCanonFacts',
      'newCharacterCanonFacts',
      'inventoryAdded',
      'inventoryRemoved',
      'isEnding',
    ]);
    expect(schema.additionalProperties).toBe(false);
  });
});

describe('GenerationResultSchema', () => {
  describe('basic validation', () => {
    it('should validate a well-formed non-ending response', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Open the iron door', 'Climb the collapsed tower'],
        stateChanges: ['Entered the ruined keep'],
        newCanonFacts: ['The keep is haunted by old wardens'],
        isEnding: false,
      });

      expect(result.isEnding).toBe(false);
      expect(result.choices).toHaveLength(2);
    });

    it('should validate a well-formed ending response', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: [],
        stateChanges: ['Accepted the crown and ended the civil war'],
        newCanonFacts: ['The war is over'],
        isEnding: true,
      });

      expect(result.isEnding).toBe(true);
      expect(result.choices).toHaveLength(0);
    });

    it('should validate opening page with story arc', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Take the oath', 'Leave the hall'],
        stateChanges: [],
        newCanonFacts: ['The throne has no heir'],
        isEnding: false,
        storyArc: 'Unify the fractured kingdoms before winter.',
      });

      expect(result.storyArc).toBe('Unify the fractured kingdoms before winter.');
    });

    it('should validate response with character canon facts', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Speak to the doctor', 'Wait in silence'],
        stateChanges: ['Met Dr. Cohen'],
        newCanonFacts: ['The year is 1972'],
        newCharacterCanonFacts: [
          { characterName: 'Dr. Cohen', facts: ['Dr. Cohen is a psychiatrist', 'He wears wire-rimmed glasses'] },
        ],
        isEnding: false,
      });

      expect(result.newCharacterCanonFacts).toEqual({
        'Dr. Cohen': ['Dr. Cohen is a psychiatrist', 'He wears wire-rimmed glasses'],
      });
    });

    it('should merge facts for same character in array format', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Speak to the doctor', 'Wait in silence'],
        stateChanges: [],
        newCanonFacts: [],
        newCharacterCanonFacts: [
          { characterName: 'Dr. Cohen', facts: ['He is a psychiatrist'] },
          { characterName: 'Dr. Cohen', facts: ['He wears glasses'] },
        ],
        isEnding: false,
      });

      expect(result.newCharacterCanonFacts).toEqual({
        'Dr. Cohen': ['He is a psychiatrist', 'He wears glasses'],
      });
    });

    it('should handle multiple characters in array format', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Speak to the doctor', 'Wait in silence'],
        stateChanges: [],
        newCanonFacts: [],
        newCharacterCanonFacts: [
          { characterName: 'Dr. Cohen', facts: ['He is a psychiatrist'] },
          { characterName: 'Nurse Mills', facts: ['She is the head nurse'] },
        ],
        isEnding: false,
      });

      expect(result.newCharacterCanonFacts).toEqual({
        'Dr. Cohen': ['He is a psychiatrist'],
        'Nurse Mills': ['She is the head nurse'],
      });
    });

    it('should default characterCanonFacts to empty object when not provided', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Open the iron door', 'Climb the collapsed tower'],
        stateChanges: [],
        newCanonFacts: [],
        isEnding: false,
      });

      expect(result.newCharacterCanonFacts).toEqual({});
    });
  });

  describe('ending consistency invariant', () => {
    it('should reject non-ending with zero choices', () => {
      expect(() =>
        GenerationResultSchema.parse({
          narrative: VALID_NARRATIVE,
          choices: [],
          stateChanges: [],
          newCanonFacts: [],
          isEnding: false,
        }),
      ).toThrow(ZodError);
    });

    it('should reject ending with choices', () => {
      expect(() =>
        GenerationResultSchema.parse({
          narrative: VALID_NARRATIVE,
          choices: ['Continue to the next chamber'],
          stateChanges: [],
          newCanonFacts: [],
          isEnding: true,
        }),
      ).toThrow(ZodError);
    });

    it('should reject non-ending with only one choice', () => {
      expect(() =>
        GenerationResultSchema.parse({
          narrative: VALID_NARRATIVE,
          choices: ['Retreat to camp'],
          stateChanges: [],
          newCanonFacts: [],
          isEnding: false,
        }),
      ).toThrow(ZodError);
    });
  });

  describe('choice constraints', () => {
    it('should reject more than 5 choices', () => {
      expect(() =>
        GenerationResultSchema.parse({
          narrative: VALID_NARRATIVE,
          choices: [
            'Choice one path',
            'Choice two path',
            'Choice three path',
            'Choice four path',
            'Choice five path',
            'Choice six path',
          ],
          stateChanges: [],
          newCanonFacts: [],
          isEnding: false,
        }),
      ).toThrow(ZodError);
    });

    it('should reject duplicate choices (case-insensitive)', () => {
      expect(() =>
        GenerationResultSchema.parse({
          narrative: VALID_NARRATIVE,
          choices: ['Open the gate', 'open the gate', 'Hide in the shadows'],
          stateChanges: [],
          newCanonFacts: [],
          isEnding: false,
        }),
      ).toThrow('Choices must be unique');
    });

    it('should reject very short choices (<3 chars)', () => {
      expect(() =>
        GenerationResultSchema.parse({
          narrative: VALID_NARRATIVE,
          choices: ['Go', 'Stay put'],
          stateChanges: [],
          newCanonFacts: [],
          isEnding: false,
        }),
      ).toThrow(ZodError);
    });

    it('should reject very long choices (>300 chars)', () => {
      expect(() =>
        GenerationResultSchema.parse({
          narrative: VALID_NARRATIVE,
          choices: ['A'.repeat(301), 'Hold your position'],
          stateChanges: [],
          newCanonFacts: [],
          isEnding: false,
        }),
      ).toThrow(ZodError);
    });
  });

  describe('narrative constraints', () => {
    it('should reject very short narrative (<50 chars)', () => {
      expect(() =>
        GenerationResultSchema.parse({
          narrative: 'Too short.',
          choices: ['Secure the relic', 'Burn the relic'],
          stateChanges: [],
          newCanonFacts: [],
          isEnding: false,
        }),
      ).toThrow(ZodError);
    });

    it('should reject very long narrative (>15000 chars)', () => {
      expect(() =>
        GenerationResultSchema.parse({
          narrative: 'A'.repeat(15001),
          choices: ['Secure the relic', 'Burn the relic'],
          stateChanges: [],
          newCanonFacts: [],
          isEnding: false,
        }),
      ).toThrow(ZodError);
    });
  });
});

describe('validateGenerationResponse', () => {
  it('should return GenerationResult with trimmed values', () => {
    const result = validateGenerationResponse(
      {
        narrative: `  ${VALID_NARRATIVE}  `,
        choices: ['  Open the iron door  ', '  Climb the collapsed tower  '],
        stateChanges: ['  Entered the ruined keep  '],
        newCanonFacts: ['  The keep is haunted by old wardens  '],
        isEnding: false,
        storyArc: '  Survive long enough to claim the throne.  ',
      },
      'raw json response',
    );

    expect(result.narrative).toBe(VALID_NARRATIVE);
    expect(result.choices).toEqual(['Open the iron door', 'Climb the collapsed tower']);
    expect(result.stateChanges).toEqual(['Entered the ruined keep']);
    expect(result.newCanonFacts).toEqual(['The keep is haunted by old wardens']);
    expect(result.storyArc).toBe('Survive long enough to claim the throne.');
    expect(result.rawResponse).toBe('raw json response');
  });

  it('should filter out empty strings from stateChanges and newCanonFacts', () => {
    const result = validateGenerationResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: ['Open the iron door', 'Climb the collapsed tower'],
        stateChanges: ['  ', '', 'Found a hidden sigil'],
        newCanonFacts: ['\n', 'The moon well is beneath the keep'],
        isEnding: false,
      },
      'raw json response',
    );

    expect(result.stateChanges).toEqual(['Found a hidden sigil']);
    expect(result.newCanonFacts).toEqual(['The moon well is beneath the keep']);
  });

  it('should handle missing optional storyArc', () => {
    const result = validateGenerationResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: ['Open the iron door', 'Climb the collapsed tower'],
        stateChanges: [],
        newCanonFacts: [],
        isEnding: false,
      },
      'raw json response',
    );

    expect(result.storyArc).toBeUndefined();
  });

  it('should trim and filter characterCanonFacts', () => {
    const result = validateGenerationResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: ['Speak to the doctor', 'Wait in silence'],
        stateChanges: [],
        newCanonFacts: [],
        newCharacterCanonFacts: [
          { characterName: '  Dr. Cohen  ', facts: ['  Dr. Cohen is a psychiatrist  ', '  ', ''] },
          { characterName: 'Empty Character', facts: ['   ', ''] },
        ],
        isEnding: false,
      },
      'raw json response',
    );

    expect(result.newCharacterCanonFacts).toEqual({
      'Dr. Cohen': ['Dr. Cohen is a psychiatrist'],
    });
  });

  it('should default characterCanonFacts to empty object when not provided', () => {
    const result = validateGenerationResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: ['Open the iron door', 'Climb the collapsed tower'],
        stateChanges: [],
        newCanonFacts: [],
        isEnding: false,
      },
      'raw json response',
    );

    expect(result.newCharacterCanonFacts).toEqual({});
  });

  it('should handle multiple characters in characterCanonFacts', () => {
    const result = validateGenerationResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: ['Speak to the doctor', 'Wait in silence'],
        stateChanges: [],
        newCanonFacts: [],
        newCharacterCanonFacts: [
          { characterName: 'Dr. Cohen', facts: ['He is a psychiatrist'] },
          { characterName: 'Nurse Mills', facts: ['She is the head nurse'] },
        ],
        isEnding: false,
      },
      'raw json response',
    );

    expect(result.newCharacterCanonFacts).toEqual({
      'Dr. Cohen': ['He is a psychiatrist'],
      'Nurse Mills': ['She is the head nurse'],
    });
  });

  it('should handle empty array format characterCanonFacts', () => {
    const result = validateGenerationResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: ['Open the iron door', 'Climb the collapsed tower'],
        stateChanges: [],
        newCanonFacts: [],
        newCharacterCanonFacts: [],
        isEnding: false,
      },
      'raw json response',
    );

    expect(result.newCharacterCanonFacts).toEqual({});
  });
});

describe('isStructuredOutputNotSupported', () => {
  describe('should return true for explicit unsupported feature errors', () => {
    it('response_format is not supported', () => {
      expect(
        isStructuredOutputNotSupported(new Error('response_format is not supported by this model')),
      ).toBe(true);
    });

    it('json_schema is not supported', () => {
      expect(
        isStructuredOutputNotSupported(new Error('json_schema is not supported')),
      ).toBe(true);
    });

    it('structured output is not supported', () => {
      expect(
        isStructuredOutputNotSupported(new Error('structured output is not supported')),
      ).toBe(true);
    });

    it('does not support response_format', () => {
      expect(
        isStructuredOutputNotSupported(new Error('This model does not support response_format')),
      ).toBe(true);
    });

    it('does not support json_schema', () => {
      expect(
        isStructuredOutputNotSupported(new Error('Provider does not support json_schema')),
      ).toBe(true);
    });

    it('does not support structured', () => {
      expect(
        isStructuredOutputNotSupported(new Error('This model does not support structured outputs')),
      ).toBe(true);
    });

    it('unsupported parameter: response_format', () => {
      expect(
        isStructuredOutputNotSupported(new Error('unsupported parameter: response_format')),
      ).toBe(true);
    });

    it('unsupported parameter: json_schema', () => {
      expect(
        isStructuredOutputNotSupported(new Error('unsupported parameter: json_schema')),
      ).toBe(true);
    });

    it('invalid parameter: response_format', () => {
      expect(
        isStructuredOutputNotSupported(new Error('invalid parameter: response_format')),
      ).toBe(true);
    });

    it('model does not support', () => {
      expect(
        isStructuredOutputNotSupported(new Error('model does not support this feature')),
      ).toBe(true);
    });

    it('provider does not support', () => {
      expect(
        isStructuredOutputNotSupported(new Error('provider does not support this operation')),
      ).toBe(true);
    });
  });

  describe('should return false for validation errors (model supports feature)', () => {
    it('generic invalid schema error', () => {
      expect(
        isStructuredOutputNotSupported(new Error('Invalid schema format')),
      ).toBe(false);
    });

    it('strict mode validation failed', () => {
      expect(
        isStructuredOutputNotSupported(new Error('Strict mode validation failed')),
      ).toBe(false);
    });

    it('additionalProperties violation', () => {
      expect(
        isStructuredOutputNotSupported(new Error('additionalProperties not allowed')),
      ).toBe(false);
    });

    it('provider returned error (generic)', () => {
      expect(
        isStructuredOutputNotSupported(new Error('Provider returned error: validation failed')),
      ).toBe(false);
    });
  });

  describe('should return false for unrelated errors', () => {
    it('network timeout', () => {
      expect(isStructuredOutputNotSupported(new Error('Network timeout while connecting'))).toBe(
        false,
      );
    });

    it('rate limiting', () => {
      expect(isStructuredOutputNotSupported(new Error('Rate limit exceeded'))).toBe(false);
    });

    it('empty response', () => {
      expect(isStructuredOutputNotSupported(new Error('Empty response from API'))).toBe(false);
    });
  });

  describe('should handle edge cases', () => {
    it('null error', () => {
      expect(isStructuredOutputNotSupported(null)).toBe(false);
    });

    it('undefined error', () => {
      expect(isStructuredOutputNotSupported(undefined)).toBe(false);
    });

    it('empty string', () => {
      expect(isStructuredOutputNotSupported('')).toBe(false);
    });

    it('string errors with supported patterns', () => {
      expect(isStructuredOutputNotSupported('response_format is not supported')).toBe(true);
    });

    it('string errors without supported patterns', () => {
      expect(isStructuredOutputNotSupported('some unrelated error')).toBe(false);
    });

    it('case insensitive matching', () => {
      expect(
        isStructuredOutputNotSupported(new Error('RESPONSE_FORMAT IS NOT SUPPORTED')),
      ).toBe(true);
    });
  });
});
