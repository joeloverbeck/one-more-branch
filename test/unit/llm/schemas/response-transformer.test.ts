import { validateGenerationResponse } from '../../../../src/llm/schemas/response-transformer';

const VALID_NARRATIVE =
  'You step through the shattered gate and feel the cold wind carry ash across your face as the ruined city groans awake around you.';

describe('validateGenerationResponse', () => {
  it('should return GenerationResult with trimmed values', () => {
    const result = validateGenerationResponse(
      {
        narrative: `  ${VALID_NARRATIVE}  `,
        choices: ['  Open the iron door  ', '  Climb the collapsed tower  '],
        stateChangesAdded: ['  Entered the ruined keep  '],
        stateChangesRemoved: [],
        newCanonFacts: ['  The keep is haunted by old wardens  '],
        healthAdded: ['  Minor wound on left arm  '],
        healthRemoved: ['  Headache  '],
        isEnding: false,
        storyArc: '  Survive long enough to claim the throne.  ',
      },
      'raw json response',
    );

    expect(result.narrative).toBe(VALID_NARRATIVE);
    expect(result.choices).toEqual(['Open the iron door', 'Climb the collapsed tower']);
    expect(result.stateChangesAdded).toEqual(['Entered the ruined keep']);
    expect(result.stateChangesRemoved).toEqual([]);
    expect(result.newCanonFacts).toEqual(['The keep is haunted by old wardens']);
    expect(result.healthAdded).toEqual(['Minor wound on left arm']);
    expect(result.healthRemoved).toEqual(['Headache']);
    expect(result.storyArc).toBe('Survive long enough to claim the throne.');
    expect(result.rawResponse).toBe('raw json response');
  });

  it('should filter out empty strings from stateChangesAdded and newCanonFacts', () => {
    const result = validateGenerationResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: ['Open the iron door', 'Climb the collapsed tower'],
        stateChangesAdded: ['  ', '', 'Found a hidden sigil'],
        stateChangesRemoved: [],
        newCanonFacts: ['\n', 'The moon well is beneath the keep'],
        healthAdded: [],
        healthRemoved: [],
        isEnding: false,
      },
      'raw json response',
    );

    expect(result.stateChangesAdded).toEqual(['Found a hidden sigil']);
    expect(result.newCanonFacts).toEqual(['The moon well is beneath the keep']);
  });

  it('should handle missing optional storyArc', () => {
    const result = validateGenerationResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: ['Open the iron door', 'Climb the collapsed tower'],
        stateChangesAdded: [],
        stateChangesRemoved: [],
        newCanonFacts: [],
        healthAdded: [],
        healthRemoved: [],
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
        stateChangesAdded: [],
        stateChangesRemoved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: [
          { characterName: '  Dr. Cohen  ', facts: ['  Dr. Cohen is a psychiatrist  ', '  ', ''] },
          { characterName: 'Empty Character', facts: ['   ', ''] },
        ],
        healthAdded: [],
        healthRemoved: [],
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
        stateChangesAdded: [],
        stateChangesRemoved: [],
        newCanonFacts: [],
        healthAdded: [],
        healthRemoved: [],
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
        stateChangesAdded: [],
        stateChangesRemoved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: [
          { characterName: 'Dr. Cohen', facts: ['He is a psychiatrist'] },
          { characterName: 'Nurse Mills', facts: ['She is the head nurse'] },
        ],
        healthAdded: [],
        healthRemoved: [],
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
        stateChangesAdded: [],
        stateChangesRemoved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: [],
        healthAdded: [],
        healthRemoved: [],
        isEnding: false,
      },
      'raw json response',
    );

    expect(result.newCharacterCanonFacts).toEqual({});
  });

  it('should trim and filter inventory fields', () => {
    const result = validateGenerationResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: ['Continue forward', 'Turn back'],
        stateChangesAdded: [],
        stateChangesRemoved: [],
        newCanonFacts: [],
        inventoryAdded: ['  Rusty key  ', '', '  '],
        inventoryRemoved: ['  Old map  ', '\n'],
        healthAdded: [],
        healthRemoved: [],
        isEnding: false,
      },
      'raw json response',
    );

    expect(result.inventoryAdded).toEqual(['Rusty key']);
    expect(result.inventoryRemoved).toEqual(['Old map']);
  });

  it('should preserve rawResponse in result', () => {
    const rawResponse = JSON.stringify({ some: 'data' });
    const result = validateGenerationResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: ['Open the door', 'Go back'],
        stateChangesAdded: [],
        stateChangesRemoved: [],
        newCanonFacts: [],
        healthAdded: [],
        healthRemoved: [],
        isEnding: false,
      },
      rawResponse,
    );

    expect(result.rawResponse).toBe(rawResponse);
  });

  it('should trim and filter health fields', () => {
    const result = validateGenerationResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: ['Continue forward', 'Turn back'],
        stateChangesAdded: [],
        stateChangesRemoved: [],
        newCanonFacts: [],
        healthAdded: ['  Bruised ribs  ', '', '  '],
        healthRemoved: ['  Fatigue  ', '\n'],
        isEnding: false,
      },
      'raw json response',
    );

    expect(result.healthAdded).toEqual(['Bruised ribs']);
    expect(result.healthRemoved).toEqual(['Fatigue']);
  });
});
