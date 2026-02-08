import { validateWriterResponse } from '../../../../src/llm/schemas/writer-response-transformer';

const VALID_NARRATIVE =
  'You step through the shattered gate and feel the cold wind carry ash across your face as the ruined city groans awake around you.';

describe('validateWriterResponse', () => {
  it('should parse valid writer response JSON correctly', () => {
    const result = validateWriterResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: ['Open the iron door', 'Climb the collapsed tower'],
        currentLocation: 'The ruined keep',
        threatsAdded: ['THREAT_RUBBLE: Unstable ceiling'],
        threatsRemoved: [],
        constraintsAdded: ['CONSTRAINT_TIME: 5 minutes left'],
        constraintsRemoved: [],
        threadsAdded: ['THREAD_MYSTERY: Unknown letter'],
        threadsResolved: [],
        newCanonFacts: ['The keep is haunted by old wardens'],
        newCharacterCanonFacts: [
          { characterName: 'Dr. Cohen', facts: ['He is a psychiatrist'] },
        ],
        inventoryAdded: ['Rusty key'],
        inventoryRemoved: [],
        healthAdded: ['Minor wound on left arm'],
        healthRemoved: [],
        characterStateChangesAdded: [
          { characterName: 'Guard', states: ['Suspicious'] },
        ],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'fear',
          primaryIntensity: 'strong',
          primaryCause: 'The looming darkness',
          secondaryEmotions: [{ emotion: 'curiosity', cause: 'Strange sounds' }],
          dominantMotivation: 'Survive and escape',
        },
        isEnding: false,
      },
      'raw json response',
    );

    expect(result.narrative).toBe(VALID_NARRATIVE);
    expect(result.choices).toEqual(['Open the iron door', 'Climb the collapsed tower']);
    expect(result.currentLocation).toBe('The ruined keep');
    expect(result.threatsAdded).toEqual(['THREAT_RUBBLE: Unstable ceiling']);
    expect(result.constraintsAdded).toEqual(['CONSTRAINT_TIME: 5 minutes left']);
    expect(result.threadsAdded).toEqual(['THREAD_MYSTERY: Unknown letter']);
    expect(result.newCanonFacts).toEqual(['The keep is haunted by old wardens']);
    expect(result.newCharacterCanonFacts).toEqual({
      'Dr. Cohen': ['He is a psychiatrist'],
    });
    expect(result.inventoryAdded).toEqual(['Rusty key']);
    expect(result.healthAdded).toEqual(['Minor wound on left arm']);
    expect(result.characterStateChangesAdded).toEqual([
      { characterName: 'Guard', states: ['Suspicious'] },
    ]);
    expect(result.protagonistAffect.primaryEmotion).toBe('fear');
    expect(result.protagonistAffect.primaryIntensity).toBe('strong');
    expect(result.protagonistAffect.dominantMotivation).toBe('Survive and escape');
    expect(result.isEnding).toBe(false);
  });

  it('should trim whitespace from all string fields', () => {
    const result = validateWriterResponse(
      {
        narrative: `  ${VALID_NARRATIVE}  `,
        choices: ['  Open the iron door  ', '  Climb the collapsed tower  '],
        currentLocation: '  The ruined keep  ',
        threatsAdded: ['  THREAT_RUBBLE: Unstable ceiling  '],
        threatsRemoved: [],
        constraintsAdded: ['  CONSTRAINT_TIME: 5 minutes  '],
        constraintsRemoved: [],
        threadsAdded: ['  THREAD_MYSTERY: Unknown letter  '],
        threadsResolved: [],
        newCanonFacts: ['  The keep is haunted  '],
        newCharacterCanonFacts: [
          { characterName: '  Dr. Cohen  ', facts: ['  He is a psychiatrist  '] },
        ],
        inventoryAdded: ['  Rusty key  '],
        inventoryRemoved: [],
        healthAdded: ['  Minor wound  '],
        healthRemoved: [],
        characterStateChangesAdded: [
          { characterName: '  Guard  ', states: ['  Suspicious  '] },
        ],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: '  fear  ',
          primaryIntensity: 'strong',
          primaryCause: '  The looming darkness  ',
          secondaryEmotions: [{ emotion: '  curiosity  ', cause: '  Strange sounds  ' }],
          dominantMotivation: '  Survive  ',
        },
        isEnding: false,
      },
      'raw json response',
    );

    expect(result.narrative).toBe(VALID_NARRATIVE);
    expect(result.choices).toEqual(['Open the iron door', 'Climb the collapsed tower']);
    expect(result.currentLocation).toBe('The ruined keep');
    expect(result.threatsAdded).toEqual(['THREAT_RUBBLE: Unstable ceiling']);
    expect(result.constraintsAdded).toEqual(['CONSTRAINT_TIME: 5 minutes']);
    expect(result.threadsAdded).toEqual(['THREAD_MYSTERY: Unknown letter']);
    expect(result.newCanonFacts).toEqual(['The keep is haunted']);
    expect(result.newCharacterCanonFacts).toEqual({
      'Dr. Cohen': ['He is a psychiatrist'],
    });
    expect(result.inventoryAdded).toEqual(['Rusty key']);
    expect(result.healthAdded).toEqual(['Minor wound']);
    expect(result.characterStateChangesAdded).toEqual([
      { characterName: 'Guard', states: ['Suspicious'] },
    ]);
    expect(result.protagonistAffect.primaryEmotion).toBe('fear');
    expect(result.protagonistAffect.primaryCause).toBe('The looming darkness');
    expect(result.protagonistAffect.secondaryEmotions).toEqual([
      { emotion: 'curiosity', cause: 'Strange sounds' },
    ]);
    expect(result.protagonistAffect.dominantMotivation).toBe('Survive');
  });

  it('should filter empty strings from arrays', () => {
    const result = validateWriterResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: ['Open the iron door', 'Climb the collapsed tower'],
        threatsAdded: ['  ', '', 'THREAT_FIRE: Fire spreading'],
        newCanonFacts: ['\n', 'The moon well is beneath the keep'],
        inventoryAdded: ['  ', '', 'Rusty key'],
        inventoryRemoved: ['\t', ''],
        healthAdded: ['', '  ', 'Bruised ribs'],
        healthRemoved: ['\n'],
        isEnding: false,
      },
      'raw json response',
    );

    expect(result.threatsAdded).toEqual(['THREAT_FIRE: Fire spreading']);
    expect(result.newCanonFacts).toEqual(['The moon well is beneath the keep']);
    expect(result.inventoryAdded).toEqual(['Rusty key']);
    expect(result.inventoryRemoved).toEqual([]);
    expect(result.healthAdded).toEqual(['Bruised ribs']);
    expect(result.healthRemoved).toEqual([]);
  });

  it('should handle malformed single-string choices array (recovery)', () => {
    const malformedChoices = [
      '{\\"Grab the clothes and make a run for it\\",\\"Sprint back toward the village\\",\\"Stay perfectly still\\"}',
    ];

    const result = validateWriterResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: malformedChoices,
        newCanonFacts: [],
        isEnding: false,
      },
      'raw json response',
    );

    expect(result.choices).toEqual([
      'Grab the clothes and make a run for it',
      'Sprint back toward the village',
      'Stay perfectly still',
    ]);
  });

  it('should reject responses with empty narrative', () => {
    expect(() =>
      validateWriterResponse(
        {
          narrative: '',
          choices: ['Open the door', 'Go back'],
          newCanonFacts: [],
          isEnding: false,
        },
        'raw json response',
      ),
    ).toThrow();
  });

  it('should reject non-ending responses with fewer than 2 choices', () => {
    expect(() =>
      validateWriterResponse(
        {
          narrative: VALID_NARRATIVE,
          choices: ['Only one choice'],
          newCanonFacts: [],
          isEnding: false,
        },
        'raw json response',
      ),
    ).toThrow();
  });

  it('should accept ending responses with 0 choices', () => {
    const result = validateWriterResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: [],
        newCanonFacts: [],
        isEnding: true,
      },
      'raw json response',
    );

    expect(result.isEnding).toBe(true);
    expect(result.choices).toEqual([]);
  });

  it('should handle missing optional fields with defaults', () => {
    const result = validateWriterResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: ['Open the door', 'Go back'],
        newCanonFacts: [],
        isEnding: false,
      },
      'raw json response',
    );

    expect(result.currentLocation).toBe('');
    expect(result.threatsAdded).toEqual([]);
    expect(result.threatsRemoved).toEqual([]);
    expect(result.constraintsAdded).toEqual([]);
    expect(result.constraintsRemoved).toEqual([]);
    expect(result.threadsAdded).toEqual([]);
    expect(result.threadsResolved).toEqual([]);
    expect(result.newCharacterCanonFacts).toEqual({});
    expect(result.inventoryAdded).toEqual([]);
    expect(result.inventoryRemoved).toEqual([]);
    expect(result.healthAdded).toEqual([]);
    expect(result.healthRemoved).toEqual([]);
    expect(result.characterStateChangesAdded).toEqual([]);
    expect(result.characterStateChangesRemoved).toEqual([]);
    expect(result.protagonistAffect).toEqual({
      primaryEmotion: 'neutral',
      primaryIntensity: 'mild',
      primaryCause: 'No specific emotional driver',
      secondaryEmotions: [],
      dominantMotivation: 'Continue forward',
    });
  });

  it('should return rawResponse in the result', () => {
    const rawResponse = JSON.stringify({ some: 'data' });
    const result = validateWriterResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: ['Open the door', 'Go back'],
        newCanonFacts: [],
        isEnding: false,
      },
      rawResponse,
    );

    expect(result.rawResponse).toBe(rawResponse);
  });

  it('should NOT include analyst fields in output', () => {
    const result = validateWriterResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: ['Open the door', 'Go back'],
        newCanonFacts: [],
        isEnding: false,
      },
      'raw json response',
    ) as unknown as Record<string, unknown>;

    expect(result['beatConcluded']).toBeUndefined();
    expect(result['beatResolution']).toBeUndefined();
    expect(result['deviation']).toBeUndefined();
    expect(result['deviationDetected']).toBeUndefined();
    expect(result['deviationReason']).toBeUndefined();
    expect(result['invalidatedBeatIds']).toBeUndefined();
    expect(result['narrativeSummary']).toBeUndefined();
  });

  it('should filter empty character state changes', () => {
    const result = validateWriterResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: ['Continue', 'Go back'],
        newCanonFacts: [],
        newCharacterCanonFacts: [
          { characterName: '  Dr. Cohen  ', facts: ['  He is a psychiatrist  ', '  ', ''] },
          { characterName: 'Empty Character', facts: ['   ', ''] },
        ],
        characterStateChangesAdded: [
          { characterName: '  Guard  ', states: ['  Suspicious  ', '  ', ''] },
          { characterName: '  ', states: ['Valid state'] },
        ],
        characterStateChangesRemoved: [
          { characterName: 'NPC', states: ['  ', ''] },
        ],
        isEnding: false,
      },
      'raw json response',
    );

    expect(result.newCharacterCanonFacts).toEqual({
      'Dr. Cohen': ['He is a psychiatrist'],
    });
    expect(result.characterStateChangesAdded).toEqual([
      { characterName: 'Guard', states: ['Suspicious'] },
    ]);
    expect(result.characterStateChangesRemoved).toEqual([]);
  });
});
