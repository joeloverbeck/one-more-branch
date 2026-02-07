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
        beatConcluded: true,
        beatResolution: '  You seized the throne room before dawn.  ',
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: '',
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
    expect(result.beatConcluded).toBe(true);
    expect(result.beatResolution).toBe('You seized the throne room before dawn.');
    expect(result.deviation.detected).toBe(false);
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
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: '',
      },
      'raw json response',
    );

    expect(result.stateChangesAdded).toEqual(['Found a hidden sigil']);
    expect(result.newCanonFacts).toEqual(['The moon well is beneath the keep']);
  });

  it('should default beat evaluation fields when missing', () => {
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
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: '',
      },
      'raw json response',
    );

    expect(result.beatConcluded).toBe(false);
    expect(result.beatResolution).toBe('');
    expect(result.deviation.detected).toBe(false);
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
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: '',
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
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: '',
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
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: '',
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
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: '',
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
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: '',
      },
      rawResponse,
    );

    expect(result.rawResponse).toBe(rawResponse);
  });

  it('should not include legacy storyArc in output', () => {
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
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: '',
        storyArc: 'legacy',
      },
      'raw json response',
    ) as Record<string, unknown>;

    expect(result['storyArc']).toBeUndefined();
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
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: '',
      },
      'raw json response',
    );

    expect(result.healthAdded).toEqual(['Bruised ribs']);
    expect(result.healthRemoved).toEqual(['Fatigue']);
  });

  it('should map valid deviation fields to BeatDeviation', () => {
    const result = validateGenerationResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: ['Press forward', 'Retreat'],
        stateChangesAdded: [],
        stateChangesRemoved: [],
        newCanonFacts: [],
        healthAdded: [],
        healthRemoved: [],
        isEnding: false,
        deviationDetected: true,
        deviationReason: '  The protagonist switched allegiances.  ',
        invalidatedBeatIds: [' 2.2 ', 'x', '3.1'],
        narrativeSummary: '  You now command the opposing garrison.  ',
      },
      'raw json response',
    );

    expect(result.deviation.detected).toBe(true);
    if (result.deviation.detected) {
      expect(result.deviation.reason).toBe('The protagonist switched allegiances.');
      expect(result.deviation.invalidatedBeatIds).toEqual(['2.2', '3.1']);
      expect(result.deviation.narrativeSummary).toBe('You now command the opposing garrison.');
    }
  });

  it('should fall back to NoDeviation when deviation payload is malformed', () => {
    const result = validateGenerationResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: ['Press forward', 'Retreat'],
        stateChangesAdded: [],
        stateChangesRemoved: [],
        newCanonFacts: [],
        healthAdded: [],
        healthRemoved: [],
        isEnding: false,
        deviationDetected: true,
        deviationReason: '  ',
        invalidatedBeatIds: ['invalid'],
        narrativeSummary: '  ',
      },
      'raw json response',
    );

    expect(result.deviation.detected).toBe(false);
  });

  describe('malformed choices array recovery', () => {
    it('should recover choices from brace-wrapped escaped-quote format', () => {
      // This is the exact malformation pattern seen in production:
      // choices: ["{\"Choice 1\",\"Choice 2\",\"Choice 3\"}"]
      const malformedChoices = [
        '{\\"Grab the clothes and make a run for it\\",\\"Sprint back toward the village\\",\\"Stay perfectly still\\"}',
      ];

      const result = validateGenerationResponse(
        {
          narrative: VALID_NARRATIVE,
          choices: malformedChoices,
          stateChangesAdded: [],
          stateChangesRemoved: [],
          newCanonFacts: [],
          healthAdded: [],
          healthRemoved: [],
          isEnding: false,
          deviationDetected: false,
          deviationReason: '',
          invalidatedBeatIds: [],
          narrativeSummary: '',
        },
        'raw json response',
      );

      expect(result.choices).toEqual([
        'Grab the clothes and make a run for it',
        'Sprint back toward the village',
        'Stay perfectly still',
      ]);
    });

    it('should recover choices from brace-wrapped regular-quote format', () => {
      // Alternative malformation: {"Choice 1","Choice 2"}
      const malformedChoices = ['{"Open the door","Run away","Hide"}'];

      const result = validateGenerationResponse(
        {
          narrative: VALID_NARRATIVE,
          choices: malformedChoices,
          stateChangesAdded: [],
          stateChangesRemoved: [],
          newCanonFacts: [],
          healthAdded: [],
          healthRemoved: [],
          isEnding: false,
          deviationDetected: false,
          deviationReason: '',
          invalidatedBeatIds: [],
          narrativeSummary: '',
        },
        'raw json response',
      );

      expect(result.choices).toEqual(['Open the door', 'Run away', 'Hide']);
    });

    it('should recover choices from bracket-wrapped JSON array format', () => {
      // Another malformation: stringified JSON array
      const malformedChoices = ['["Fight back","Flee","Negotiate"]'];

      const result = validateGenerationResponse(
        {
          narrative: VALID_NARRATIVE,
          choices: malformedChoices,
          stateChangesAdded: [],
          stateChangesRemoved: [],
          newCanonFacts: [],
          healthAdded: [],
          healthRemoved: [],
          isEnding: false,
          deviationDetected: false,
          deviationReason: '',
          invalidatedBeatIds: [],
          narrativeSummary: '',
        },
        'raw json response',
      );

      expect(result.choices).toEqual(['Fight back', 'Flee', 'Negotiate']);
    });

    it('should not modify properly formatted choices array', () => {
      const properChoices = ['Open the door', 'Go back'];

      const result = validateGenerationResponse(
        {
          narrative: VALID_NARRATIVE,
          choices: properChoices,
          stateChangesAdded: [],
          stateChangesRemoved: [],
          newCanonFacts: [],
          healthAdded: [],
          healthRemoved: [],
          isEnding: false,
          deviationDetected: false,
          deviationReason: '',
          invalidatedBeatIds: [],
          narrativeSummary: '',
        },
        'raw json response',
      );

      expect(result.choices).toEqual(['Open the door', 'Go back']);
    });

    it('should handle four choices after recovery', () => {
      // Test with 4 choices to ensure we handle the full range correctly
      const malformedChoices = ['{"Fight the monster","Run away","Hide behind cover","Call for help"}'];

      const result = validateGenerationResponse(
        {
          narrative: VALID_NARRATIVE,
          choices: malformedChoices,
          stateChangesAdded: [],
          stateChangesRemoved: [],
          newCanonFacts: [],
          healthAdded: [],
          healthRemoved: [],
          isEnding: false,
          deviationDetected: false,
          deviationReason: '',
          invalidatedBeatIds: [],
          narrativeSummary: '',
        },
        'raw json response',
      );

      expect(result.choices).toHaveLength(4);
      expect(result.choices).toEqual([
        'Fight the monster',
        'Run away',
        'Hide behind cover',
        'Call for help',
      ]);
    });
  });
});
