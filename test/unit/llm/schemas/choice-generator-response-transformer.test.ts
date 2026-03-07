import { validateChoiceGeneratorResponse } from '../../../../src/llm/schemas/choice-generator-response-transformer';
import { ChoiceType, PrimaryDelta } from '../../../../src/models/choice-enums';

function makeRawChoices(): { text: string; choiceType: string; primaryDelta: string }[] {
  return [
    { text: '  Demand an explanation  ', choiceType: 'CONTEST', primaryDelta: 'INFORMATION_STATE_CHANGE' },
    { text: '  Flee the scene  ', choiceType: 'WITHDRAW', primaryDelta: 'LOCATION_ACCESS_CHANGE' },
  ];
}

describe('validateChoiceGeneratorResponse', () => {
  it('parses and trims valid response', () => {
    const rawJson = { choices: makeRawChoices() };
    const result = validateChoiceGeneratorResponse(rawJson, '{"choices":[...]}');

    expect(result.choices).toHaveLength(2);
    expect(result.choices[0].text).toBe('Demand an explanation');
    expect(result.choices[0].choiceType).toBe(ChoiceType.CONTEST);
    expect(result.choices[0].primaryDelta).toBe(PrimaryDelta.INFORMATION_STATE_CHANGE);
    expect(result.choices[1].text).toBe('Flee the scene');
    expect(result.rawResponse).toBe('{"choices":[...]}');
  });

  it('preserves rawResponse string', () => {
    const rawJson = { choices: makeRawChoices() };
    const result = validateChoiceGeneratorResponse(rawJson, 'raw-content-here');

    expect(result.rawResponse).toBe('raw-content-here');
  });

  it('throws on invalid input', () => {
    const rawJson = { choices: [{ text: 'Go', choiceType: 'CONTEST', primaryDelta: 'INFORMATION_STATE_CHANGE' }] };
    expect(() => validateChoiceGeneratorResponse(rawJson, '{}')).toThrow();
  });

  it('maps all enum values correctly', () => {
    const rawJson = {
      choices: [
        { text: 'Choice A', choiceType: 'INTERVENE', primaryDelta: 'GOAL_PRIORITY_CHANGE' },
        { text: 'Choice B', choiceType: 'COMMIT', primaryDelta: 'RELATIONSHIP_ALIGNMENT_CHANGE' },
        { text: 'Choice C', choiceType: 'NAVIGATE', primaryDelta: 'THREAT_LEVEL_CHANGE' },
      ],
    };
    const result = validateChoiceGeneratorResponse(rawJson, '{}');

    expect(result.choices[0].choiceType).toBe(ChoiceType.INTERVENE);
    expect(result.choices[0].primaryDelta).toBe(PrimaryDelta.GOAL_PRIORITY_CHANGE);
    expect(result.choices[1].choiceType).toBe(ChoiceType.COMMIT);
    expect(result.choices[2].choiceType).toBe(ChoiceType.NAVIGATE);
  });
});
