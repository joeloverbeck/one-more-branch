import { ZodError } from 'zod';
import { GenerationResultSchema } from '../../../../src/llm/schemas/validation-schema';

const VALID_NARRATIVE =
  'You step through the shattered gate and feel the cold wind carry ash across your face as the ruined city groans awake around you.';

describe('GenerationResultSchema', () => {
  describe('basic validation', () => {
    it('should validate a well-formed non-ending response', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Open the iron door', 'Climb the collapsed tower'],
        stateChangesAdded: ['Entered the ruined keep'],
        stateChangesRemoved: [],
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
        stateChangesAdded: ['Accepted the crown and ended the civil war'],
        stateChangesRemoved: [],
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
        stateChangesAdded: [],
        stateChangesRemoved: [],
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
        stateChangesAdded: ['Met Dr. Cohen'],
        stateChangesRemoved: [],
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
        stateChangesAdded: [],
        stateChangesRemoved: [],
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
        stateChangesAdded: [],
        stateChangesRemoved: [],
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
        stateChangesAdded: [],
        stateChangesRemoved: [],
        newCanonFacts: [],
        isEnding: false,
      });

      expect(result.newCharacterCanonFacts).toEqual({});
    });

    it('should default inventory fields to empty arrays when not provided', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Open the iron door', 'Climb the collapsed tower'],
        stateChangesAdded: [],
        stateChangesRemoved: [],
        newCanonFacts: [],
        isEnding: false,
      });

      expect(result.inventoryAdded).toEqual([]);
      expect(result.inventoryRemoved).toEqual([]);
    });

    it('should default storyArc to empty string when not provided', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Open the iron door', 'Climb the collapsed tower'],
        stateChangesAdded: [],
        stateChangesRemoved: [],
        newCanonFacts: [],
        isEnding: false,
      });

      expect(result.storyArc).toBe('');
    });
  });

  describe('ending consistency invariant', () => {
    it('should reject non-ending with zero choices', () => {
      expect(() =>
        GenerationResultSchema.parse({
          narrative: VALID_NARRATIVE,
          choices: [],
          stateChangesAdded: [],
        stateChangesRemoved: [],
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
          stateChangesAdded: [],
        stateChangesRemoved: [],
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
          stateChangesAdded: [],
        stateChangesRemoved: [],
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
          stateChangesAdded: [],
        stateChangesRemoved: [],
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
          stateChangesAdded: [],
        stateChangesRemoved: [],
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
          stateChangesAdded: [],
        stateChangesRemoved: [],
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
          stateChangesAdded: [],
        stateChangesRemoved: [],
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
          stateChangesAdded: [],
        stateChangesRemoved: [],
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
          stateChangesAdded: [],
        stateChangesRemoved: [],
          newCanonFacts: [],
          isEnding: false,
        }),
      ).toThrow(ZodError);
    });
  });
});
