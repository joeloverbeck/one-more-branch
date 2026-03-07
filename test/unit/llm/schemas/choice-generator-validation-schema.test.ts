import { ChoiceGeneratorResultSchema } from '../../../../src/llm/schemas/choice-generator-validation-schema';
import { ChoiceType, PrimaryDelta } from '../../../../src/models/choice-enums';

function makeChoice(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    text: 'Demand an explanation',
    choiceType: ChoiceType.CONFRONTATION,
    primaryDelta: PrimaryDelta.INFORMATION_REVEALED,
    ...overrides,
  };
}

describe('ChoiceGeneratorResultSchema', () => {
  it('accepts valid input with 2 choices', () => {
    const input = {
      choices: [
        makeChoice(),
        makeChoice({ text: 'Flee the scene', choiceType: ChoiceType.AVOIDANCE_RETREAT, primaryDelta: PrimaryDelta.LOCATION_CHANGE }),
      ],
    };
    expect(() => ChoiceGeneratorResultSchema.parse(input)).not.toThrow();
  });

  it('accepts valid input with 3 choices', () => {
    const input = {
      choices: [
        makeChoice(),
        makeChoice({ text: 'Flee the scene', choiceType: ChoiceType.AVOIDANCE_RETREAT }),
        makeChoice({ text: 'Investigate quietly', choiceType: ChoiceType.INVESTIGATION }),
      ],
    };
    expect(() => ChoiceGeneratorResultSchema.parse(input)).not.toThrow();
  });

  it('rejects fewer than 2 choices', () => {
    const input = { choices: [makeChoice()] };
    expect(() => ChoiceGeneratorResultSchema.parse(input)).toThrow(/at least 2 choices/);
  });

  it('rejects more than 5 choices', () => {
    const input = {
      choices: Array.from({ length: 6 }, (_, i) =>
        makeChoice({ text: `Choice ${i + 1}`, choiceType: Object.values(ChoiceType)[i % 9] })
      ),
    };
    expect(() => ChoiceGeneratorResultSchema.parse(input)).toThrow(/at most 5 choices/);
  });

  it('rejects duplicate choice text (case-insensitive)', () => {
    const input = {
      choices: [
        makeChoice({ text: 'Demand an explanation' }),
        makeChoice({ text: 'DEMAND AN EXPLANATION', choiceType: ChoiceType.INVESTIGATION }),
      ],
    };
    expect(() => ChoiceGeneratorResultSchema.parse(input)).toThrow(/unique/i);
  });

  it('rejects choice text shorter than 3 characters', () => {
    const input = {
      choices: [
        makeChoice({ text: 'Go' }),
        makeChoice({ text: 'Flee the scene', choiceType: ChoiceType.AVOIDANCE_RETREAT }),
      ],
    };
    expect(() => ChoiceGeneratorResultSchema.parse(input)).toThrow(/at least 3 characters/);
  });

  it('rejects choice text longer than 500 characters', () => {
    const input = {
      choices: [
        makeChoice({ text: 'x'.repeat(501) }),
        makeChoice({ text: 'Flee the scene', choiceType: ChoiceType.AVOIDANCE_RETREAT }),
      ],
    };
    expect(() => ChoiceGeneratorResultSchema.parse(input)).toThrow(/at most 500 characters/);
  });

  it('rejects invalid choiceType', () => {
    const input = {
      choices: [
        makeChoice({ choiceType: 'INVALID_TYPE' }),
        makeChoice({ text: 'Flee the scene', choiceType: ChoiceType.AVOIDANCE_RETREAT }),
      ],
    };
    expect(() => ChoiceGeneratorResultSchema.parse(input)).toThrow();
  });

  it('rejects invalid primaryDelta', () => {
    const input = {
      choices: [
        makeChoice({ primaryDelta: 'INVALID_DELTA' }),
        makeChoice({ text: 'Flee the scene', choiceType: ChoiceType.AVOIDANCE_RETREAT }),
      ],
    };
    expect(() => ChoiceGeneratorResultSchema.parse(input)).toThrow();
  });
});
