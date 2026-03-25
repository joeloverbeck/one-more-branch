import { validateSceneBlueprintResponse } from '../../../../src/llm/schemas/scene-blueprint-response-transformer';

function createValidUnit(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    action: 'Protagonist enters the room',
    emotionalRegister: 'tense alertness',
    sceneFunction: 'SETUP',
    mruType: 'MOTIVATION',
    sensoryAnchor: 'sight — dim lamplight on broken glass',
    paragraphWeight: 1,
    speakingCharacters: null,
    ...overrides,
  };
}

function createValidBlueprintPayload(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    units: [
      createValidUnit(),
      createValidUnit({
        action: 'A sound behind the door',
        emotionalRegister: 'spike of fear',
        sceneFunction: 'CONFLICT',
        mruType: 'REACTION',
        sensoryAnchor: 'sound — scraping behind oak panels',
        paragraphWeight: 2,
        speakingCharacters: ['Guard Captain'],
      }),
    ],
    emotionalArc: 'alertness → fear → resolve',
    mandateMapping: [{ mandate: 'Must include beat A', unitIndex: 0 }],
    ...overrides,
  };
}

describe('validateSceneBlueprintResponse', () => {
  it('accepts a valid blueprint response and returns typed result', () => {
    const payload = createValidBlueprintPayload();
    const result = validateSceneBlueprintResponse(payload, 'raw-json');

    expect(result.units).toHaveLength(2);
    expect(result.units[0].sceneFunction).toBe('SETUP');
    expect(result.units[0].mruType).toBe('MOTIVATION');
    expect(result.units[1].sceneFunction).toBe('CONFLICT');
    expect(result.emotionalArc).toBe('alertness → fear → resolve');
    expect(result.mandateMapping).toHaveLength(1);
    expect(result.rawResponse).toBe('raw-json');
  });

  it('trims whitespace from string fields', () => {
    const payload = createValidBlueprintPayload({
      units: [
        createValidUnit({
          action: '  Protagonist enters the room  ',
          emotionalRegister: '  tense alertness  ',
          sensoryAnchor: '  sight — dim lamplight  ',
        }),
        createValidUnit({
          action: '  A sound behind the door  ',
          emotionalRegister: '  spike of fear  ',
          sensoryAnchor: '  sound — scraping  ',
        }),
      ],
      emotionalArc: '  alertness → fear  ',
      mandateMapping: [{ mandate: '  Must include beat A  ', unitIndex: 0 }],
    });
    const result = validateSceneBlueprintResponse(payload, 'raw');

    expect(result.units[0].action).toBe('Protagonist enters the room');
    expect(result.units[0].emotionalRegister).toBe('tense alertness');
    expect(result.units[0].sensoryAnchor).toBe('sight — dim lamplight');
    expect(result.emotionalArc).toBe('alertness → fear');
    expect(result.mandateMapping[0].mandate).toBe('Must include beat A');
  });

  it('filters out null/empty speakingCharacters', () => {
    const payload = createValidBlueprintPayload({
      units: [
        createValidUnit({ speakingCharacters: ['  Guard  ', '', '  '] }),
        createValidUnit({ speakingCharacters: ['Captain'] }),
      ],
    });
    const result = validateSceneBlueprintResponse(payload, 'raw');

    expect(result.units[0].speakingCharacters).toEqual(['Guard']);
  });

  it('rejects response with missing units field', () => {
    const payload = {
      emotionalArc: 'fear → relief',
      mandateMapping: [],
    };

    expect(() => validateSceneBlueprintResponse(payload, 'raw')).toThrow();
  });

  it('rejects response with empty units array (min 2)', () => {
    const payload = createValidBlueprintPayload({ units: [] });

    expect(() => validateSceneBlueprintResponse(payload, 'raw')).toThrow();
  });

  it('rejects response with single unit (min 2)', () => {
    const payload = createValidBlueprintPayload({ units: [createValidUnit()] });

    expect(() => validateSceneBlueprintResponse(payload, 'raw')).toThrow();
  });

  it('rejects response with invalid sceneFunction enum value', () => {
    const payload = createValidBlueprintPayload({
      units: [
        createValidUnit({ sceneFunction: 'INVALID_FUNCTION' }),
        createValidUnit(),
      ],
    });

    expect(() => validateSceneBlueprintResponse(payload, 'raw')).toThrow();
  });

  it('rejects response with invalid mruType enum value', () => {
    const payload = createValidBlueprintPayload({
      units: [
        createValidUnit({ mruType: 'INVALID_MRU' }),
        createValidUnit(),
      ],
    });

    expect(() => validateSceneBlueprintResponse(payload, 'raw')).toThrow();
  });

  it('rejects response with paragraphWeight outside 1-3 range', () => {
    const payloadTooLow = createValidBlueprintPayload({
      units: [
        createValidUnit({ paragraphWeight: 0 }),
        createValidUnit(),
      ],
    });
    expect(() => validateSceneBlueprintResponse(payloadTooLow, 'raw')).toThrow();

    const payloadTooHigh = createValidBlueprintPayload({
      units: [
        createValidUnit({ paragraphWeight: 4 }),
        createValidUnit(),
      ],
    });
    expect(() => validateSceneBlueprintResponse(payloadTooHigh, 'raw')).toThrow();
  });

  it('rejects response with missing emotionalArc', () => {
    const payload = createValidBlueprintPayload();
    delete payload.emotionalArc;

    expect(() => validateSceneBlueprintResponse(payload, 'raw')).toThrow();
  });

  it('accepts speakingCharacters as null (nullable field)', () => {
    const payload = createValidBlueprintPayload({
      units: [
        createValidUnit({ speakingCharacters: null }),
        createValidUnit({ speakingCharacters: null }),
      ],
    });
    const result = validateSceneBlueprintResponse(payload, 'raw');

    expect(result.units[0].speakingCharacters).toBeUndefined();
    expect(result.units[1].speakingCharacters).toBeUndefined();
  });
});
