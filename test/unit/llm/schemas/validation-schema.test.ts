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
        currentLocation: 'The ruined keep entrance',
        threatsAdded: ['THREAT_RUBBLE: Unstable ceiling above'],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
        newCanonFacts: ['The keep is haunted by old wardens'],
        isEnding: false,
      });

      expect(result.isEnding).toBe(false);
      expect(result.choices).toHaveLength(2);
      expect(result.currentLocation).toBe('The ruined keep entrance');
      expect(result.threatsAdded).toHaveLength(1);
    });

    it('should validate a well-formed ending response', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: [],
        currentLocation: 'The throne room',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: ['THREAD_SUCCESSION'],
        newCanonFacts: ['The war is over'],
        isEnding: true,
      });

      expect(result.isEnding).toBe(true);
      expect(result.choices).toHaveLength(0);
      expect(result.threadsResolved).toEqual(['THREAD_SUCCESSION']);
    });

    it('should validate beat evaluation fields when provided', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Take the oath', 'Leave the hall'],
        newCanonFacts: ['The throne has no heir'],
        isEnding: false,
        beatConcluded: true,
        beatResolution: 'You secured the oath of the border clans.',
      });

      expect(result.beatConcluded).toBe(true);
      expect(result.beatResolution).toBe('You secured the oath of the border clans.');
    });

    it('should validate response with character canon facts', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Speak to the doctor', 'Wait in silence'],
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
        newCanonFacts: [],
        isEnding: false,
      });

      expect(result.newCharacterCanonFacts).toEqual({});
    });

    it('should default inventory fields to empty arrays when not provided', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Open the iron door', 'Climb the collapsed tower'],
        newCanonFacts: [],
        isEnding: false,
      });

      expect(result.inventoryAdded).toEqual([]);
      expect(result.inventoryRemoved).toEqual([]);
    });

    it('should default beat evaluation fields when not provided', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Open the iron door', 'Climb the collapsed tower'],
        newCanonFacts: [],
        isEnding: false,
      });

      expect(result.beatConcluded).toBe(false);
      expect(result.beatResolution).toBe('');
    });

    it('should default deviation fields when not provided', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Open the iron door', 'Climb the collapsed tower'],
        newCanonFacts: [],
        isEnding: false,
      });

      expect(result.deviationDetected).toBe(false);
      expect(result.deviationReason).toBe('');
      expect(result.invalidatedBeatIds).toEqual([]);
      expect(result.narrativeSummary).toBe('');
    });

    it('should validate deviation fields when provided', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Open the iron door', 'Climb the collapsed tower'],
        newCanonFacts: [],
        isEnding: false,
        deviationDetected: true,
        deviationReason: 'Player allied with enemy command.',
        invalidatedBeatIds: ['2.2', '3.1'],
        narrativeSummary: 'The protagonist now commands enemy troops.',
      });

      expect(result.deviationDetected).toBe(true);
      expect(result.deviationReason).toContain('allied');
      expect(result.invalidatedBeatIds).toEqual(['2.2', '3.1']);
      expect(result.narrativeSummary).toContain('commands');
    });

    it('should ignore legacy storyArc field', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Open the iron door', 'Climb the collapsed tower'],
        newCanonFacts: [],
        isEnding: false,
        storyArc: 'Legacy arc field',
      });

      expect('storyArc' in result).toBe(false);
      expect(result.beatConcluded).toBe(false);
      expect(result.beatResolution).toBe('');
    });
  });

  describe('active state fields', () => {
    it('accepts valid currentLocation', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Continue forward', 'Turn back'],
        currentLocation: 'Dark corridor with water-stained tiles',
        newCanonFacts: [],
        isEnding: false,
      });

      expect(result.currentLocation).toBe('Dark corridor with water-stained tiles');
    });

    it('accepts empty currentLocation', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Continue forward', 'Turn back'],
        currentLocation: '',
        newCanonFacts: [],
        isEnding: false,
      });

      expect(result.currentLocation).toBe('');
    });

    it('accepts valid threatsAdded array', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Continue forward', 'Turn back'],
        threatsAdded: ['THREAT_FIRE: Fire spreading from east wing'],
        newCanonFacts: [],
        isEnding: false,
      });

      expect(result.threatsAdded).toEqual(['THREAT_FIRE: Fire spreading from east wing']);
    });

    it('accepts valid threatsRemoved array', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Continue forward', 'Turn back'],
        threatsRemoved: ['THREAT_FIRE'],
        newCanonFacts: [],
        isEnding: false,
      });

      expect(result.threatsRemoved).toEqual(['THREAT_FIRE']);
    });

    it('accepts valid constraintsAdded array', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Continue forward', 'Turn back'],
        constraintsAdded: ['CONSTRAINT_TIME: Only 5 minutes remaining'],
        newCanonFacts: [],
        isEnding: false,
      });

      expect(result.constraintsAdded).toHaveLength(1);
    });

    it('accepts valid threadsAdded array', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Continue forward', 'Turn back'],
        threadsAdded: ['THREAD_LETTER: Contents of letter unknown'],
        newCanonFacts: [],
        isEnding: false,
      });

      expect(result.threadsAdded).toHaveLength(1);
    });

    it('defaults missing arrays to empty', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Continue forward', 'Turn back'],
        newCanonFacts: [],
        isEnding: false,
      });

      expect(result.currentLocation).toBe('');
      expect(result.threatsAdded).toEqual([]);
      expect(result.threatsRemoved).toEqual([]);
      expect(result.constraintsAdded).toEqual([]);
      expect(result.constraintsRemoved).toEqual([]);
      expect(result.threadsAdded).toEqual([]);
      expect(result.threadsResolved).toEqual([]);
    });
  });

  describe('removed old fields', () => {
    it('does not include stateChangesAdded in result', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Continue forward', 'Turn back'],
        newCanonFacts: [],
        isEnding: false,
      });

      expect((result as Record<string, unknown>)['stateChangesAdded']).toBeUndefined();
    });

    it('does not include stateChangesRemoved in result', () => {
      const result = GenerationResultSchema.parse({
        narrative: VALID_NARRATIVE,
        choices: ['Continue forward', 'Turn back'],
        newCanonFacts: [],
        isEnding: false,
      });

      expect((result as Record<string, unknown>)['stateChangesRemoved']).toBeUndefined();
    });
  });

  describe('ending consistency invariant', () => {
    it('should reject non-ending with zero choices', () => {
      expect(() =>
        GenerationResultSchema.parse({
          narrative: VALID_NARRATIVE,
          choices: [],
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
          newCanonFacts: [],
          isEnding: false,
        }),
      ).toThrow(ZodError);
    });
  });
});
