import { validateChoiceGeneratorResponse } from '../../../../src/llm/schemas/choice-generator-response-transformer';
import { ChoiceType, PrimaryDelta } from '../../../../src/models/choice-enums';

function makeRawChoices() {
  return [
    { text: '  Demand an explanation  ', choiceType: 'CONFRONTATION', primaryDelta: 'INFORMATION_REVEALED' },
    { text: '  Flee the scene  ', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'LOCATION_CHANGE' },
  ];
}

describe('validateChoiceGeneratorResponse', () => {
  it('parses and trims valid response', () => {
    const rawJson = { choices: makeRawChoices() };
    const result = validateChoiceGeneratorResponse(rawJson, '{"choices":[...]}');

    expect(result.choices).toHaveLength(2);
    expect(result.choices[0].text).toBe('Demand an explanation');
    expect(result.choices[0].choiceType).toBe(ChoiceType.CONFRONTATION);
    expect(result.choices[0].primaryDelta).toBe(PrimaryDelta.INFORMATION_REVEALED);
    expect(result.choices[1].text).toBe('Flee the scene');
    expect(result.rawResponse).toBe('{"choices":[...]}');
  });

  it('preserves rawResponse string', () => {
    const rawJson = { choices: makeRawChoices() };
    const result = validateChoiceGeneratorResponse(rawJson, 'raw-content-here');

    expect(result.rawResponse).toBe('raw-content-here');
  });

  it('throws on invalid input', () => {
    const rawJson = { choices: [{ text: 'Go', choiceType: 'CONFRONTATION', primaryDelta: 'INFORMATION_REVEALED' }] };
    expect(() => validateChoiceGeneratorResponse(rawJson, '{}')).toThrow();
  });

  it('maps all enum values correctly', () => {
    const rawJson = {
      choices: [
        { text: 'Choice A', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
        { text: 'Choice B', choiceType: 'MORAL_DILEMMA', primaryDelta: 'RELATIONSHIP_CHANGE' },
        { text: 'Choice C', choiceType: 'PATH_DIVERGENCE', primaryDelta: 'THREAT_SHIFT' },
      ],
    };
    const result = validateChoiceGeneratorResponse(rawJson, '{}');

    expect(result.choices[0].choiceType).toBe(ChoiceType.TACTICAL_APPROACH);
    expect(result.choices[0].primaryDelta).toBe(PrimaryDelta.GOAL_SHIFT);
    expect(result.choices[1].choiceType).toBe(ChoiceType.MORAL_DILEMMA);
    expect(result.choices[2].choiceType).toBe(ChoiceType.PATH_DIVERGENCE);
  });
});
