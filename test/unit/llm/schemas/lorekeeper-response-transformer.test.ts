import { validateLorekeeperResponse } from '../../../../src/llm/schemas/lorekeeper-response-transformer';

describe('validateLorekeeperResponse', () => {
  const RAW_RESPONSE = '{"sceneWorldContext":"test"}';

  it('parses valid lorekeeper response correctly', () => {
    const input = {
      sceneWorldContext: 'A bustling marketplace in the eastern quarter',
      relevantCharacters: [
        {
          name: 'Mira',
          role: 'ally',
          relevantProfile: 'A skilled healer from the northern provinces',
          speechPatterns: 'Formal, measured, uses medical terminology',
          protagonistRelationship: 'Growing trust after the bridge incident',
          interCharacterDynamics: 'Distrusts Gareth since the betrayal',
          currentState: 'Anxious about the upcoming trial',
        },
      ],
      relevantCanonFacts: ['The eastern gate is sealed', 'Mira saved the protagonist'],
      relevantHistory: 'After fleeing the capital, the group traveled east.',
    };

    const result = validateLorekeeperResponse(input, RAW_RESPONSE);

    expect(result.sceneWorldContext).toBe('A bustling marketplace in the eastern quarter');
    expect(result.relevantCharacters).toHaveLength(1);
    expect(result.relevantCharacters[0]?.name).toBe('Mira');
    expect(result.relevantCharacters[0]?.role).toBe('ally');
    expect(result.relevantCharacters[0]?.speechPatterns).toBe(
      'Formal, measured, uses medical terminology',
    );
    expect(result.relevantCharacters[0]?.interCharacterDynamics).toBe(
      'Distrusts Gareth since the betrayal',
    );
    expect(result.relevantCanonFacts).toEqual([
      'The eastern gate is sealed',
      'Mira saved the protagonist',
    ]);
    expect(result.relevantHistory).toBe('After fleeing the capital, the group traveled east.');
    expect(result.rawResponse).toBe(RAW_RESPONSE);
  });

  it('trims whitespace from all string fields', () => {
    const input = {
      sceneWorldContext: '  A dark alley  ',
      relevantCharacters: [
        {
          name: '  Gareth  ',
          role: '  antagonist  ',
          relevantProfile: '  A former guard  ',
          speechPatterns: '  Gruff, short sentences  ',
          protagonistRelationship: '  Hostile  ',
          interCharacterDynamics: '  Commands the militia  ',
          currentState: '  Wounded and furious  ',
        },
      ],
      relevantCanonFacts: ['  The wall is broken  ', '  Gareth was once a friend  '],
      relevantHistory: '  Events unfolded quickly.  ',
    };

    const result = validateLorekeeperResponse(input, RAW_RESPONSE);

    expect(result.sceneWorldContext).toBe('A dark alley');
    expect(result.relevantCharacters[0]?.name).toBe('Gareth');
    expect(result.relevantCharacters[0]?.role).toBe('antagonist');
    expect(result.relevantCharacters[0]?.speechPatterns).toBe('Gruff, short sentences');
    expect(result.relevantCharacters[0]?.interCharacterDynamics).toBe('Commands the militia');
    expect(result.relevantCanonFacts).toEqual(['The wall is broken', 'Gareth was once a friend']);
    expect(result.relevantHistory).toBe('Events unfolded quickly.');
  });

  it('filters out empty canon facts after trimming', () => {
    const input = {
      sceneWorldContext: 'test',
      relevantCharacters: [],
      relevantCanonFacts: ['valid fact', '   ', '', '  another fact  '],
      relevantHistory: 'history',
    };

    const result = validateLorekeeperResponse(input, RAW_RESPONSE);

    expect(result.relevantCanonFacts).toEqual(['valid fact', 'another fact']);
  });

  it('omits interCharacterDynamics when empty or whitespace-only', () => {
    const input = {
      sceneWorldContext: 'test',
      relevantCharacters: [
        {
          name: 'Solo',
          role: 'bystander',
          relevantProfile: 'A lonely merchant',
          speechPatterns: 'Quiet',
          protagonistRelationship: 'Neutral',
          interCharacterDynamics: '   ',
          currentState: 'Calm',
        },
      ],
      relevantCanonFacts: [],
      relevantHistory: 'history',
    };

    const result = validateLorekeeperResponse(input, RAW_RESPONSE);

    expect(result.relevantCharacters[0]).not.toHaveProperty('interCharacterDynamics');
  });

  it('includes interCharacterDynamics when non-empty', () => {
    const input = {
      sceneWorldContext: 'test',
      relevantCharacters: [
        {
          name: 'Duo',
          role: 'ally',
          relevantProfile: 'profile',
          speechPatterns: 'patterns',
          protagonistRelationship: 'friend',
          interCharacterDynamics: 'Respects the elder',
          currentState: 'Alert',
        },
      ],
      relevantCanonFacts: [],
      relevantHistory: 'history',
    };

    const result = validateLorekeeperResponse(input, RAW_RESPONSE);

    expect(result.relevantCharacters[0]?.interCharacterDynamics).toBe('Respects the elder');
  });

  it('defaults missing fields via Zod schema', () => {
    const input = {};

    const result = validateLorekeeperResponse(input, RAW_RESPONSE);

    expect(result.sceneWorldContext).toBe('');
    expect(result.relevantCharacters).toEqual([]);
    expect(result.relevantCanonFacts).toEqual([]);
    expect(result.relevantHistory).toBe('');
    expect(result.rawResponse).toBe(RAW_RESPONSE);
  });

  it('parses JSON string input', () => {
    const jsonString = JSON.stringify({
      sceneWorldContext: 'from string',
      relevantCharacters: [],
      relevantCanonFacts: ['fact'],
      relevantHistory: 'history from string',
    });

    const result = validateLorekeeperResponse(jsonString, RAW_RESPONSE);

    expect(result.sceneWorldContext).toBe('from string');
    expect(result.relevantHistory).toBe('history from string');
    expect(result.relevantCanonFacts).toEqual(['fact']);
  });

  it('requires name and role for characters', () => {
    const input = {
      sceneWorldContext: 'test',
      relevantCharacters: [
        {
          name: '',
          role: 'ally',
        },
      ],
      relevantCanonFacts: [],
      relevantHistory: 'history',
    };

    expect(() => validateLorekeeperResponse(input, RAW_RESPONSE)).toThrow();
  });
});
