import { validateWriterResponse } from '../../../../src/llm/schemas/writer-response-transformer';

const VALID_NARRATIVE =
  'You step through the shattered gate and feel the cold wind carry ash across your face as the ruined city groans awake around you.';

describe('validateWriterResponse', () => {
  it('should parse valid writer response JSON correctly', () => {
    const result = validateWriterResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: [
          {
            text: 'Open the iron door',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'GOAL_SHIFT',
          },
          {
            text: 'Climb the collapsed tower',
            choiceType: 'INVESTIGATION',
            primaryDelta: 'LOCATION_CHANGE',
          },
        ],
        currentLocation: 'The ruined keep',
        threatsAdded: ['THREAT_RUBBLE: Unstable ceiling'],
        threatsRemoved: [],
        constraintsAdded: ['CONSTRAINT_TIME: 5 minutes left'],
        constraintsRemoved: [],
        threadsAdded: [
          { text: 'THREAD_MYSTERY: Unknown letter', threadType: 'MYSTERY', urgency: 'HIGH' },
        ],
        threadsResolved: [],
        newCanonFacts: ['The keep is haunted by old wardens'],
        newCharacterCanonFacts: [{ characterName: 'Dr. Cohen', facts: ['He is a psychiatrist'] }],
        inventoryAdded: ['Rusty key'],
        inventoryRemoved: [],
        healthAdded: ['Minor wound on left arm'],
        healthRemoved: [],
        characterStateChangesAdded: [{ characterName: 'Guard', states: ['Suspicious'] }],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'fear',
          primaryIntensity: 'strong',
          primaryCause: 'The looming darkness',
          secondaryEmotions: [{ emotion: 'curiosity', cause: 'Strange sounds' }],
          dominantMotivation: 'Survive and escape',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      },
      'raw json response'
    );

    expect(result.narrative).toBe(VALID_NARRATIVE);
    expect(result.choices).toEqual([
      { text: 'Open the iron door', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
      {
        text: 'Climb the collapsed tower',
        choiceType: 'INVESTIGATION',
        primaryDelta: 'LOCATION_CHANGE',
      },
    ]);
    expect(result.currentLocation).toBe('The ruined keep');
    expect(result.threatsAdded).toEqual(['THREAT_RUBBLE: Unstable ceiling']);
    expect(result.constraintsAdded).toEqual(['CONSTRAINT_TIME: 5 minutes left']);
    expect(result.threadsAdded).toEqual([
      { text: 'THREAD_MYSTERY: Unknown letter', threadType: 'MYSTERY', urgency: 'HIGH' },
    ]);
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
        choices: [
          {
            text: '  Open the iron door  ',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'GOAL_SHIFT',
          },
          {
            text: '  Climb the collapsed tower  ',
            choiceType: 'INVESTIGATION',
            primaryDelta: 'LOCATION_CHANGE',
          },
        ],
        currentLocation: '  The ruined keep  ',
        threatsAdded: ['  THREAT_RUBBLE: Unstable ceiling  '],
        threatsRemoved: [],
        constraintsAdded: ['  CONSTRAINT_TIME: 5 minutes  '],
        constraintsRemoved: [],
        threadsAdded: [
          { text: '  THREAD_MYSTERY: Unknown letter  ', threadType: 'MYSTERY', urgency: 'HIGH' },
        ],
        threadsResolved: [],
        newCanonFacts: ['  The keep is haunted  '],
        newCharacterCanonFacts: [
          { characterName: '  Dr. Cohen  ', facts: ['  He is a psychiatrist  '] },
        ],
        inventoryAdded: ['  Rusty key  '],
        inventoryRemoved: [],
        healthAdded: ['  Minor wound  '],
        healthRemoved: [],
        characterStateChangesAdded: [{ characterName: '  Guard  ', states: ['  Suspicious  '] }],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: '  fear  ',
          primaryIntensity: 'strong',
          primaryCause: '  The looming darkness  ',
          secondaryEmotions: [{ emotion: '  curiosity  ', cause: '  Strange sounds  ' }],
          dominantMotivation: '  Survive  ',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      },
      'raw json response'
    );

    expect(result.narrative).toBe(VALID_NARRATIVE);
    expect(result.choices).toEqual([
      { text: 'Open the iron door', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
      {
        text: 'Climb the collapsed tower',
        choiceType: 'INVESTIGATION',
        primaryDelta: 'LOCATION_CHANGE',
      },
    ]);
    expect(result.currentLocation).toBe('The ruined keep');
    expect(result.threatsAdded).toEqual(['THREAT_RUBBLE: Unstable ceiling']);
    expect(result.constraintsAdded).toEqual(['CONSTRAINT_TIME: 5 minutes']);
    expect(result.threadsAdded).toEqual([
      { text: 'THREAD_MYSTERY: Unknown letter', threadType: 'MYSTERY', urgency: 'HIGH' },
    ]);
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
        choices: [
          {
            text: 'Open the iron door',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'GOAL_SHIFT',
          },
          {
            text: 'Climb the collapsed tower',
            choiceType: 'INVESTIGATION',
            primaryDelta: 'LOCATION_CHANGE',
          },
        ],
        threatsAdded: ['  ', '', 'THREAT_FIRE: Fire spreading'],
        newCanonFacts: ['\n', 'The moon well is beneath the keep'],
        inventoryAdded: ['  ', '', 'Rusty key'],
        inventoryRemoved: ['\t', ''],
        healthAdded: ['', '  ', 'Bruised ribs'],
        healthRemoved: ['\n'],
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      },
      'raw json response'
    );

    expect(result.threatsAdded).toEqual(['THREAT_FIRE: Fire spreading']);
    expect(result.newCanonFacts).toEqual(['The moon well is beneath the keep']);
    expect(result.inventoryAdded).toEqual(['Rusty key']);
    expect(result.inventoryRemoved).toEqual([]);
    expect(result.healthAdded).toEqual(['Bruised ribs']);
    expect(result.healthRemoved).toEqual([]);
  });

  it('should accept scene summaries longer than 500 characters', () => {
    const longSceneSummary =
      'After securing the relic, you navigate a collapsed hallway while the fortress trembles from distant bombardment, then coordinate a risky evacuation through a flooded service tunnel as rival scouts close in from two flanks. ' +
      'You choose to abandon heavy supplies to preserve speed, mark safe anchor points for allies, and redirect the group toward a concealed maintenance shaft that leads to an old observatory where a backup signal system can be restored. ' +
      "By the time you emerge, two allies are injured but stable, one rival tracker defects after witnessing the sabotage order, and your team commits to broadcasting proof of the commander's betrayal before dawn despite the near certainty of retaliation.";

    const result = validateWriterResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: [
          {
            text: 'Open the iron door',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'GOAL_SHIFT',
          },
          {
            text: 'Climb the collapsed tower',
            choiceType: 'INVESTIGATION',
            primaryDelta: 'LOCATION_CHANGE',
          },
        ],
        newCanonFacts: [],
        sceneSummary: longSceneSummary,
        isEnding: false,
      },
      'raw json response'
    );

    expect(result.sceneSummary).toBe(longSceneSummary);
    expect(result.sceneSummary.length).toBeGreaterThan(500);
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
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      },
      'raw json response'
    );

    // Malformed string choices are recovered and upgraded to structured objects
    expect(result.choices).toHaveLength(3);
    expect(result.choices[0].text).toBe('Grab the clothes and make a run for it');
    expect(result.choices[1].text).toBe('Sprint back toward the village');
    expect(result.choices[2].text).toBe('Stay perfectly still');
    // Each recovered choice should have choiceType and primaryDelta
    for (const choice of result.choices) {
      expect(choice.choiceType).toBeDefined();
      expect(choice.primaryDelta).toBeDefined();
    }
  });

  it('should reject responses with empty narrative', () => {
    expect(() =>
      validateWriterResponse(
        {
          narrative: '',
          choices: [
            { text: 'Open the door', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
            { text: 'Go back', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'LOCATION_CHANGE' },
          ],
          newCanonFacts: [],
          isEnding: false,
        },
        'raw json response'
      )
    ).toThrow();
  });

  it('should reject non-ending responses with fewer than 2 choices', () => {
    expect(() =>
      validateWriterResponse(
        {
          narrative: VALID_NARRATIVE,
          choices: [
            {
              text: 'Only one choice',
              choiceType: 'TACTICAL_APPROACH',
              primaryDelta: 'GOAL_SHIFT',
            },
          ],
          newCanonFacts: [],
          sceneSummary: 'Test summary of the scene events and consequences.',
          isEnding: false,
        },
        'raw json response'
      )
    ).toThrow();
  });

  it('should accept ending responses with 0 choices', () => {
    const result = validateWriterResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: [],
        newCanonFacts: [],
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: true,
      },
      'raw json response'
    );

    expect(result.isEnding).toBe(true);
    expect(result.choices).toEqual([]);
  });

  it('should handle missing optional fields with defaults', () => {
    const result = validateWriterResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: [
          { text: 'Open the door', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          { text: 'Go back', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'LOCATION_CHANGE' },
        ],
        newCanonFacts: [],
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      },
      'raw json response'
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
        choices: [
          { text: 'Open the door', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          { text: 'Go back', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'LOCATION_CHANGE' },
        ],
        newCanonFacts: [],
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      },
      rawResponse
    );

    expect(result.rawResponse).toBe(rawResponse);
  });

  it('should NOT include analyst fields in output', () => {
    const result = validateWriterResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: [
          { text: 'Open the door', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          { text: 'Go back', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'LOCATION_CHANGE' },
        ],
        newCanonFacts: [],
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      },
      'raw json response'
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
        choices: [
          { text: 'Continue forward', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          {
            text: 'Go back the way you came',
            choiceType: 'AVOIDANCE_RETREAT',
            primaryDelta: 'LOCATION_CHANGE',
          },
        ],
        newCanonFacts: [],
        newCharacterCanonFacts: [
          { characterName: '  Dr. Cohen  ', facts: ['  He is a psychiatrist  ', '  ', ''] },
          { characterName: 'Empty Character', facts: ['   ', ''] },
        ],
        characterStateChangesAdded: [
          { characterName: '  Guard  ', states: ['  Suspicious  ', '  ', ''] },
          { characterName: '  ', states: ['Valid state'] },
        ],
        characterStateChangesRemoved: ['  ', '', 'cs-7'],
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      },
      'raw json response'
    );

    expect(result.newCharacterCanonFacts).toEqual({
      'Dr. Cohen': ['He is a psychiatrist'],
    });
    expect(result.characterStateChangesAdded).toEqual([
      { characterName: 'Guard', states: ['Suspicious'] },
    ]);
    expect(result.characterStateChangesRemoved).toEqual(['cs-7']);
  });

  it('should preserve valid character state removal IDs', () => {
    const result = validateWriterResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: [
          { text: 'Continue forward', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          {
            text: 'Retreat and regroup',
            choiceType: 'AVOIDANCE_RETREAT',
            primaryDelta: 'LOCATION_CHANGE',
          },
        ],
        newCanonFacts: [],
        characterStateChangesRemoved: ['cs-1', 'cs-3'],
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      },
      'raw json response'
    );

    expect(result.characterStateChangesRemoved).toEqual(['cs-1', 'cs-3']);
  });

  it('should reject legacy string-array threadsAdded payloads', () => {
    expect(() =>
      validateWriterResponse(
        {
          narrative: VALID_NARRATIVE,
          choices: [
            {
              text: 'Continue forward',
              choiceType: 'TACTICAL_APPROACH',
              primaryDelta: 'GOAL_SHIFT',
            },
            {
              text: 'Retreat and regroup',
              choiceType: 'AVOIDANCE_RETREAT',
              primaryDelta: 'LOCATION_CHANGE',
            },
          ],
          threadsAdded: ['Legacy thread shape'],
          newCanonFacts: [],
          sceneSummary: 'Test summary of the scene events and consequences.',
          isEnding: false,
        },
        'raw json response'
      )
    ).toThrow();
  });

  it('should reject typed threadsAdded entries with empty text after trim', () => {
    expect(() =>
      validateWriterResponse(
        {
          narrative: VALID_NARRATIVE,
          choices: [
            {
              text: 'Continue forward',
              choiceType: 'TACTICAL_APPROACH',
              primaryDelta: 'GOAL_SHIFT',
            },
            {
              text: 'Retreat and regroup',
              choiceType: 'AVOIDANCE_RETREAT',
              primaryDelta: 'LOCATION_CHANGE',
            },
          ],
          threadsAdded: [{ text: '   ', threadType: 'MYSTERY', urgency: 'MEDIUM' }],
          newCanonFacts: [],
          sceneSummary: 'Test summary of the scene events and consequences.',
          isEnding: false,
        },
        'raw json response'
      )
    ).toThrow('threadsAdded[0].text must not be empty after trim');
  });

  it('should allow state mutation compatibility fields without ID-prefix enforcement', () => {
    const result = validateWriterResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: [
          { text: 'Continue forward', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          {
            text: 'Retreat and regroup',
            choiceType: 'AVOIDANCE_RETREAT',
            primaryDelta: 'LOCATION_CHANGE',
          },
        ],
        threatsAdded: ['th-1'],
        constraintsRemoved: ['th-3'],
        newCanonFacts: [],
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      },
      'raw json response'
    );

    expect(result.threatsAdded).toEqual(['th-1']);
    expect(result.constraintsRemoved).toEqual(['th-3']);
  });
});
