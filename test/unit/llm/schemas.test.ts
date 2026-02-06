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
      'canonFacts',
      'characterCanonFacts',
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
        canonFacts: ['The keep is haunted by old wardens'],
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
        canonFacts: ['The war is over'],
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
        canonFacts: ['The throne has no heir'],
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
        canonFacts: ['The year is 1972'],
        characterCanonFacts: {
          'Dr. Cohen': ['Dr. Cohen is a psychiatrist', 'He wears wire-rimmed glasses'],
        },
        isEnding: false,
      });

      expect(result.characterCanonFacts).toEqual({
        'Dr. Cohen': ['Dr. Cohen is a psychiatrist', 'He wears wire-rimmed glasses'],
      });
    });

    it('should default characterCanonFacts to empty object when not provided', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Open the iron door', 'Climb the collapsed tower'],
        stateChanges: [],
        canonFacts: [],
        isEnding: false,
      });

      expect(result.characterCanonFacts).toEqual({});
    });
  });

  describe('ending consistency invariant', () => {
    it('should reject non-ending with zero choices', () => {
      expect(() =>
        GenerationResultSchema.parse({
          narrative: VALID_NARRATIVE,
          choices: [],
          stateChanges: [],
          canonFacts: [],
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
          canonFacts: [],
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
          canonFacts: [],
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
          canonFacts: [],
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
          canonFacts: [],
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
          canonFacts: [],
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
          canonFacts: [],
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
          canonFacts: [],
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
          canonFacts: [],
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
        canonFacts: ['  The keep is haunted by old wardens  '],
        isEnding: false,
        storyArc: '  Survive long enough to claim the throne.  ',
      },
      'raw json response',
    );

    expect(result.narrative).toBe(VALID_NARRATIVE);
    expect(result.choices).toEqual(['Open the iron door', 'Climb the collapsed tower']);
    expect(result.stateChanges).toEqual(['Entered the ruined keep']);
    expect(result.canonFacts).toEqual(['The keep is haunted by old wardens']);
    expect(result.storyArc).toBe('Survive long enough to claim the throne.');
    expect(result.rawResponse).toBe('raw json response');
  });

  it('should filter out empty strings from stateChanges and canonFacts', () => {
    const result = validateGenerationResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: ['Open the iron door', 'Climb the collapsed tower'],
        stateChanges: ['  ', '', 'Found a hidden sigil'],
        canonFacts: ['\n', 'The moon well is beneath the keep'],
        isEnding: false,
      },
      'raw json response',
    );

    expect(result.stateChanges).toEqual(['Found a hidden sigil']);
    expect(result.canonFacts).toEqual(['The moon well is beneath the keep']);
  });

  it('should handle missing optional storyArc', () => {
    const result = validateGenerationResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: ['Open the iron door', 'Climb the collapsed tower'],
        stateChanges: [],
        canonFacts: [],
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
        canonFacts: [],
        characterCanonFacts: {
          '  Dr. Cohen  ': ['  Dr. Cohen is a psychiatrist  ', '  ', ''],
          'Empty Character': ['   ', ''],
        },
        isEnding: false,
      },
      'raw json response',
    );

    expect(result.characterCanonFacts).toEqual({
      'Dr. Cohen': ['Dr. Cohen is a psychiatrist'],
    });
  });

  it('should default characterCanonFacts to empty object when not provided', () => {
    const result = validateGenerationResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: ['Open the iron door', 'Climb the collapsed tower'],
        stateChanges: [],
        canonFacts: [],
        isEnding: false,
      },
      'raw json response',
    );

    expect(result.characterCanonFacts).toEqual({});
  });
});

describe('isStructuredOutputNotSupported', () => {
  it('should return true for errors mentioning response_format', () => {
    expect(
      isStructuredOutputNotSupported(new Error('Invalid request: response_format is unsupported')),
    ).toBe(true);
  });

  it('should return true for errors mentioning json_schema', () => {
    expect(
      isStructuredOutputNotSupported(new Error('Model does not accept json_schema payload')),
    ).toBe(true);
  });

  it('should return false for unrelated errors', () => {
    expect(isStructuredOutputNotSupported(new Error('Network timeout while connecting'))).toBe(
      false,
    );
  });
});
