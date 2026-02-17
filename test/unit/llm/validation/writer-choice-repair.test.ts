import { repairCorruptedChoices } from '../../../../src/llm/validation/writer-choice-repair';

function buildCorruptedText(choices: Array<{ text: string; choiceType: string; primaryDelta: string }>): string {
  const json = JSON.stringify(choices);
  // Strip the leading [{"text":" to simulate the corruption:
  // the first choice's text absorbed the rest of the serialized array
  return json.slice('[{"text":"'.length);
}

describe('repairCorruptedChoices', () => {
  it('returns unchanged when choices array is valid (multiple well-formed choices)', () => {
    const input = {
      narrative: 'Some narrative text here.',
      choices: [
        { text: 'Go left', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE' },
        { text: 'Go right', choiceType: 'PATH_DIVERGENCE', primaryDelta: 'LOCATION_CHANGE' },
      ],
      isEnding: false,
    };

    const result = repairCorruptedChoices(input);
    expect(result.repaired).toBe(false);
    expect(result.repairedJson).toBe(input);
  });

  it('returns unchanged when choices is empty (ending page)', () => {
    const input = {
      narrative: 'The end.',
      choices: [],
      isEnding: true,
    };

    const result = repairCorruptedChoices(input);
    expect(result.repaired).toBe(false);
    expect(result.repairedJson).toBe(input);
  });

  it('returns unchanged when input is not an object or has no choices field', () => {
    expect(repairCorruptedChoices(null).repaired).toBe(false);
    expect(repairCorruptedChoices(42).repaired).toBe(false);
    expect(repairCorruptedChoices('string').repaired).toBe(false);
    expect(repairCorruptedChoices([1, 2]).repaired).toBe(false);
    expect(repairCorruptedChoices({ narrative: 'text' }).repaired).toBe(false);
  });

  it('detects and repairs single corrupted choice containing embedded JSON for 4 choices', () => {
    const originalChoices = [
      { text: 'Confront the guard directly', choiceType: 'CONFRONTATION', primaryDelta: 'THREAT_SHIFT' },
      { text: 'Sneak past through the shadows', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE' },
      { text: 'Try to bribe the guard with coin', choiceType: 'RESOURCE_COMMITMENT', primaryDelta: 'ITEM_CONTROL' },
      { text: 'Search for an alternate route', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
    ];

    const corruptedText = buildCorruptedText(originalChoices);
    const input = {
      narrative: 'A long narrative passage.',
      choices: [{ text: corruptedText, choiceType: 'CONFRONTATION', primaryDelta: 'THREAT_SHIFT' }],
      isEnding: false,
    };

    const result = repairCorruptedChoices(input);
    expect(result.repaired).toBe(true);
    expect(result.repairDetails).toContain('Recovered 4 choices');

    const repaired = result.repairedJson as Record<string, unknown>;
    const choices = repaired['choices'] as Array<{ text: string; choiceType: string; primaryDelta: string }>;
    expect(choices).toHaveLength(4);
    expect(choices[0]!.text).toBe('Confront the guard directly');
    expect(choices[1]!.text).toBe('Sneak past through the shadows');
    expect(choices[2]!.text).toBe('Try to bribe the guard with coin');
    expect(choices[3]!.text).toBe('Search for an alternate route');
  });

  it('detects and repairs corruption with 2 choices collapsed into 1', () => {
    const originalChoices = [
      { text: 'Open the door', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE' },
      { text: 'Turn back', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'LOCATION_CHANGE' },
    ];

    const corruptedText = buildCorruptedText(originalChoices);
    const input = {
      narrative: 'A scene unfolds.',
      choices: [{ text: corruptedText, choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE' }],
      isEnding: false,
    };

    const result = repairCorruptedChoices(input);
    expect(result.repaired).toBe(true);
    expect(result.repairDetails).toContain('Recovered 2 choices');

    const repaired = result.repairedJson as Record<string, unknown>;
    const choices = repaired['choices'] as Array<{ text: string; choiceType: string; primaryDelta: string }>;
    expect(choices).toHaveLength(2);
    expect(choices[0]!.choiceType).toBe('TACTICAL_APPROACH');
    expect(choices[1]!.choiceType).toBe('AVOIDANCE_RETREAT');
  });

  it('preserves valid choiceType and primaryDelta enum values during reconstruction', () => {
    const originalChoices = [
      { text: 'Investigate the ruins', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
      { text: 'Confront the stranger', choiceType: 'CONFRONTATION', primaryDelta: 'RELATIONSHIP_CHANGE' },
      { text: 'Flee into the forest', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'LOCATION_CHANGE' },
    ];

    const corruptedText = buildCorruptedText(originalChoices);
    const input = {
      narrative: 'A mysterious figure approaches.',
      choices: [{ text: corruptedText, choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' }],
      isEnding: false,
    };

    const result = repairCorruptedChoices(input);
    expect(result.repaired).toBe(true);

    const repaired = result.repairedJson as Record<string, unknown>;
    const choices = repaired['choices'] as Array<{ text: string; choiceType: string; primaryDelta: string }>;
    expect(choices[0]!.choiceType).toBe('INVESTIGATION');
    expect(choices[0]!.primaryDelta).toBe('INFORMATION_REVEALED');
    expect(choices[1]!.choiceType).toBe('CONFRONTATION');
    expect(choices[1]!.primaryDelta).toBe('RELATIONSHIP_CHANGE');
    expect(choices[2]!.choiceType).toBe('AVOIDANCE_RETREAT');
    expect(choices[2]!.primaryDelta).toBe('LOCATION_CHANGE');
  });

  it('returns unchanged when corruption pattern is unrecognizable', () => {
    const input = {
      narrative: 'Some text.',
      choices: [{ text: 'This is just a long text with no JSON inside it at all', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' }],
      isEnding: false,
    };

    const result = repairCorruptedChoices(input);
    expect(result.repaired).toBe(false);
    expect(result.repairedJson).toBe(input);
  });

  it('truncates repaired choice text exceeding 500 chars at word boundary', () => {
    const longText = 'A '.repeat(300).trim(); // 599 chars
    const originalChoices = [
      { text: longText, choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE' },
      { text: 'Short choice', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
    ];

    const corruptedText = buildCorruptedText(originalChoices);
    const input = {
      narrative: 'A story scene.',
      choices: [{ text: corruptedText, choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE' }],
      isEnding: false,
    };

    const result = repairCorruptedChoices(input);
    expect(result.repaired).toBe(true);

    const repaired = result.repairedJson as Record<string, unknown>;
    const choices = repaired['choices'] as Array<{ text: string }>;
    expect(choices[0]!.text.length).toBeLessThanOrEqual(503); // 500 + '...'
    expect(choices[0]!.text).toMatch(/\.\.\.$/);
    expect(choices[1]!.text).toBe('Short choice');
  });

  it('handles corruption where extra fields (protagonistAffect, sceneSummary) are embedded in text', () => {
    // Simulate the real corruption: text contains the rest of the JSON object,
    // including fields beyond choices. We only care about recovering what's parseable.
    const originalChoices = [
      { text: 'Stand your ground', choiceType: 'CONFRONTATION', primaryDelta: 'THREAT_SHIFT' },
      { text: 'Negotiate terms', choiceType: 'RELATIONSHIP_SHIFT', primaryDelta: 'RELATIONSHIP_CHANGE' },
    ];

    // Build a corrupted text that has extra non-choice JSON appended
    // This won't parse cleanly, so repair should return unchanged
    const corruptedJson = JSON.stringify(originalChoices);
    const corruptedText = corruptedJson.slice('[{"text":"'.length);
    const textWithExtras = corruptedText.slice(0, -1) + ',"protagonistAffect":{"primaryEmotion":"fear"}}]';

    const input = {
      narrative: 'Danger approaches.',
      choices: [{ text: textWithExtras, choiceType: 'CONFRONTATION', primaryDelta: 'THREAT_SHIFT' }],
      isEnding: false,
    };

    // The text contains "choiceType":" so detection fires, but reconstruction
    // will fail because the extra fields make the choices invalid
    const result = repairCorruptedChoices(input);
    // Either repairs successfully (if JSON parses and choices validate) or returns unchanged
    // The key invariant: it never throws
    expect(result).toBeDefined();
    expect(typeof result.repaired).toBe('boolean');
  });
});
