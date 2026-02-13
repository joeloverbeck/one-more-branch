import { validateWriterResponse } from '../../../../src/llm/schemas/writer-response-transformer';

const VALID_NARRATIVE =
  'You step through the shattered gate and feel the cold wind carry ash across your face as the ruined city groans awake around you.';

describe('validateWriterResponse', () => {
  it('parses valid creative writer response fields', () => {
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
    expect(result.protagonistAffect.primaryEmotion).toBe('fear');
    expect(result.protagonistAffect.primaryIntensity).toBe('strong');
    expect(result.sceneSummary).toBe('Test summary of the scene events and consequences.');
    expect(result.isEnding).toBe(false);
  });

  it('trims creative string fields', () => {
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
        protagonistAffect: {
          primaryEmotion: '  fear  ',
          primaryIntensity: 'strong',
          primaryCause: '  The looming darkness  ',
          secondaryEmotions: [{ emotion: '  curiosity  ', cause: '  Strange sounds  ' }],
          dominantMotivation: '  Survive  ',
        },
        sceneSummary: '  Test summary of the scene events and consequences.  ',
        isEnding: false,
      },
      'raw json response'
    );

    expect(result.narrative).toBe(VALID_NARRATIVE);
    expect(result.choices[0]?.text).toBe('Open the iron door');
    expect(result.choices[1]?.text).toBe('Climb the collapsed tower');
    expect(result.protagonistAffect.primaryEmotion).toBe('fear');
    expect(result.protagonistAffect.primaryCause).toBe('The looming darkness');
    expect(result.protagonistAffect.secondaryEmotions).toEqual([
      { emotion: 'curiosity', cause: 'Strange sounds' },
    ]);
    expect(result.protagonistAffect.dominantMotivation).toBe('Survive');
    expect(result.sceneSummary).toBe('Test summary of the scene events and consequences.');
  });

  it('handles malformed single-string choices array (recovery)', () => {
    const malformedChoices = [
      '{\\"Grab the clothes and make a run for it\\",\\"Sprint back toward the village\\",\\"Stay perfectly still\\"}',
    ];

    const result = validateWriterResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: malformedChoices,
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      },
      'raw json response'
    );

    expect(result.choices).toHaveLength(3);
    expect(result.choices[0]?.text).toBe('Grab the clothes and make a run for it');
    expect(result.choices[1]?.text).toBe('Sprint back toward the village');
    expect(result.choices[2]?.text).toBe('Stay perfectly still');
  });

  it('applies protagonistAffect defaults when omitted', () => {
    const result = validateWriterResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: [
          { text: 'Open the door', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          { text: 'Go back', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'LOCATION_CHANGE' },
        ],
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      },
      'raw json response'
    );

    expect(result.protagonistAffect).toEqual({
      primaryEmotion: 'neutral',
      primaryIntensity: 'mild',
      primaryCause: 'No specific emotional driver',
      secondaryEmotions: [],
      dominantMotivation: 'Continue forward',
    });
  });

  it('returns rawResponse in result', () => {
    const rawResponse = JSON.stringify({ some: 'data' });
    const result = validateWriterResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: [
          { text: 'Open the door', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          { text: 'Go back', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'LOCATION_CHANGE' },
        ],
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      },
      rawResponse
    );

    expect(result.rawResponse).toBe(rawResponse);
  });

  it('does not return deterministic legacy fields', () => {
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
        currentLocation: 'Legacy location',
        threatsAdded: ['Legacy threat'],
        newCanonFacts: ['Legacy canon'],
        inventoryAdded: ['Legacy inventory'],
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      },
      'raw json response'
    ) as unknown as Record<string, unknown>;

    expect(result['currentLocation']).toBeUndefined();
    expect(result['threatsAdded']).toBeUndefined();
    expect(result['newCanonFacts']).toBeUndefined();
    expect(result['inventoryAdded']).toBeUndefined();
  });

  it('rejects responses with empty narrative', () => {
    expect(() =>
      validateWriterResponse(
        {
          narrative: '',
          choices: [
            { text: 'Open the door', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
            { text: 'Go back', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'LOCATION_CHANGE' },
          ],
          sceneSummary: 'Test summary of the scene events and consequences.',
          isEnding: false,
        },
        'raw json response'
      )
    ).toThrow();
  });

  it('enforces ending/non-ending choice count constraints', () => {
    expect(() =>
      validateWriterResponse(
        {
          narrative: VALID_NARRATIVE,
          choices: [],
          sceneSummary: 'Test summary of the scene events and consequences.',
          isEnding: false,
        },
        'raw json response'
      )
    ).toThrow();

    const ending = validateWriterResponse(
      {
        narrative: VALID_NARRATIVE,
        choices: [],
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: true,
      },
      'raw json response'
    );

    expect(ending.isEnding).toBe(true);
    expect(ending.choices).toEqual([]);
  });
});
