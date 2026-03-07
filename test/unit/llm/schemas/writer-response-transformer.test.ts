import { validateWriterResponse } from '../../../../src/llm/schemas/writer-response-transformer';

const VALID_NARRATIVE =
  'You step through the shattered gate and feel the cold wind carry ash across your face as the ruined city groans awake around you.';

describe('validateWriterResponse', () => {
  it('parses valid creative writer response fields', () => {
    const result = validateWriterResponse(
      {
        narrative: VALID_NARRATIVE,
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
    expect((result as Record<string, unknown>)['choices']).toBeUndefined();
    expect(result.protagonistAffect.primaryEmotion).toBe('fear');
    expect(result.protagonistAffect.primaryIntensity).toBe('strong');
    expect(result.sceneSummary).toBe('Test summary of the scene events and consequences.');
    expect(result.isEnding).toBe(false);
  });

  it('trims creative string fields', () => {
    const result = validateWriterResponse(
      {
        narrative: `  ${VALID_NARRATIVE}  `,
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
    expect(result.protagonistAffect.primaryEmotion).toBe('fear');
    expect(result.protagonistAffect.primaryCause).toBe('The looming darkness');
    expect(result.protagonistAffect.secondaryEmotions).toEqual([
      { emotion: 'curiosity', cause: 'Strange sounds' },
    ]);
    expect(result.protagonistAffect.dominantMotivation).toBe('Survive');
    expect(result.sceneSummary).toBe('Test summary of the scene events and consequences.');
  });

  it('applies protagonistAffect defaults when omitted', () => {
    const result = validateWriterResponse(
      {
        narrative: VALID_NARRATIVE,
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
        currentLocation: 'Legacy location',
        threatsAdded: ['Legacy threat'],
        newCanonFacts: [{ text: 'Legacy canon', factType: 'LAW' }],
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
          sceneSummary: 'Test summary of the scene events and consequences.',
          isEnding: false,
        },
        'raw json response'
      )
    ).toThrow();
  });
});
