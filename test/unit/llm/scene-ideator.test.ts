const mockLogPrompt = jest.fn();
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  getEntries: jest.fn().mockReturnValue([]),
  clear: jest.fn(),
};

jest.mock('../../../src/logging/index.js', () => ({
  get logger(): typeof mockLogger {
    return mockLogger;
  },
  get logPrompt(): typeof mockLogPrompt {
    return mockLogPrompt;
  },
  logResponse: jest.fn(),
}));

jest.mock('../../../src/llm/retry.js', () => ({
  withRetry: <T>(fn: () => Promise<T>): Promise<T> => fn(),
}));

import { LLMError } from '../../../src/llm/llm-client-types';
import {
  parseSceneDirectionOption,
  parseSceneIdeatorResponse,
  validateDiversity,
  generateSceneDirections,
} from '../../../src/llm/scene-ideator';
import { DEFAULT_SCENE_IDEA_COUNT } from '../../../src/llm/scene-ideation-contract';
import type { SceneDirectionOption } from '../../../src/models/scene-direction';
import type { SceneIdeatorOpeningContext } from '../../../src/llm/scene-ideator-types';

function validOptionRaw(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    diversityLane: 'ESCALATION',
    scenePurpose: 'CONFRONTATION',
    valuePolarityShift: 'POSITIVE_TO_NEGATIVE',
    pacingMode: 'ACCELERATING',
    sceneDirection: 'The hero faces the villain in the dark alley.',
    dramaticJustification: 'This advances the central conflict.',
    ...overrides,
  };
}

function defaultDistinctOptions(): Record<string, unknown>[] {
  return [
    validOptionRaw({
      diversityLane: 'ESCALATION',
      scenePurpose: 'CONFRONTATION',
      valuePolarityShift: 'POSITIVE_TO_NEGATIVE',
      pacingMode: 'ACCELERATING',
      sceneDirection: 'Option A direction.',
      dramaticJustification: 'Justification A.',
    }),
    validOptionRaw({
      diversityLane: 'REVELATION',
      scenePurpose: 'REVELATION',
      valuePolarityShift: 'NEGATIVE_TO_POSITIVE',
      pacingMode: 'DECELERATING',
      sceneDirection: 'Option B direction.',
      dramaticJustification: 'Justification B.',
    }),
    validOptionRaw({
      diversityLane: 'RELATIONAL_REALIGNMENT',
      scenePurpose: 'ESCAPE',
      valuePolarityShift: 'IRONIC_SHIFT',
      pacingMode: 'SUSTAINED_HIGH',
      sceneDirection: 'Option C direction.',
      dramaticJustification: 'Justification C.',
    }),
    validOptionRaw({
      diversityLane: 'TEMPTATION_OR_OPPORTUNITY',
      scenePurpose: 'NEGOTIATION',
      valuePolarityShift: 'POSITIVE_TO_DOUBLE_NEGATIVE',
      pacingMode: 'OSCILLATING',
      sceneDirection: 'Option D direction.',
      dramaticJustification: 'Justification D.',
    }),
    validOptionRaw({
      diversityLane: 'CONSEQUENCE_OR_PAYOFF',
      scenePurpose: 'AFTERMATH',
      valuePolarityShift: 'NEGATIVE_TO_DOUBLE_POSITIVE',
      pacingMode: 'BUILDING_SLOW',
      sceneDirection: 'Option E direction.',
      dramaticJustification: 'Justification E.',
    }),
  ];
}

function createMockResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        choices: [
          {
            message: {
              content: JSON.stringify(payload),
            },
          },
        ],
      }),
  } as unknown as Response;
}

function createMinimalOpeningContext(): SceneIdeatorOpeningContext {
  return {
    mode: 'opening',
    tone: 'Dark fantasy',
    decomposedCharacters: [],
    decomposedWorld: { rawWorldbuilding: 'A grim world.', facts: [] },
  };
}

describe('parseSceneDirectionOption', () => {
  it('returns a valid SceneDirectionOption from well-formed input', () => {
    const result = parseSceneDirectionOption(validOptionRaw(), 0);

    expect(result.diversityLane).toBe('ESCALATION');
    expect(result.scenePurpose).toBe('CONFRONTATION');
    expect(result.valuePolarityShift).toBe('POSITIVE_TO_NEGATIVE');
    expect(result.pacingMode).toBe('ACCELERATING');
    expect(result.sceneDirection).toBe('The hero faces the villain in the dark alley.');
    expect(result.dramaticJustification).toBe('This advances the central conflict.');
  });

  it('trims whitespace from sceneDirection and dramaticJustification', () => {
    const result = parseSceneDirectionOption(
      validOptionRaw({
        sceneDirection: '  Some direction  ',
        dramaticJustification: '  Some justification  ',
      }),
      0
    );

    expect(result.sceneDirection).toBe('Some direction');
    expect(result.dramaticJustification).toBe('Some justification');
  });

  it('throws STRUCTURE_PARSE_ERROR when raw is not an object', () => {
    expect(() => parseSceneDirectionOption('string', 0)).toThrow(LLMError);
    expect(() => parseSceneDirectionOption(null, 0)).toThrow(LLMError);
    expect(() => parseSceneDirectionOption(42, 0)).toThrow(LLMError);
    expect(() => parseSceneDirectionOption([], 0)).toThrow(LLMError);
  });

  it('includes index+1 in error messages', () => {
    try {
      parseSceneDirectionOption(null, 2);
      fail('Expected LLMError');
    } catch (error) {
      expect(error).toBeInstanceOf(LLMError);
      expect((error as LLMError).message).toContain('3');
      expect((error as LLMError).code).toBe('STRUCTURE_PARSE_ERROR');
    }
  });

  it('throws when diversityLane is invalid', () => {
    expect(() =>
      parseSceneDirectionOption(validOptionRaw({ diversityLane: 'BAD_LANE' }), 0)
    ).toThrow(/invalid diversityLane/);
  });

  it('throws when diversityLane is missing', () => {
    const raw = validOptionRaw();
    delete raw['diversityLane'];

    expect(() => parseSceneDirectionOption(raw, 0)).toThrow(/invalid diversityLane/);
  });

  it('throws when scenePurpose is invalid', () => {
    expect(() => parseSceneDirectionOption(validOptionRaw({ scenePurpose: 'INVALID' }), 0)).toThrow(
      /invalid scenePurpose/
    );
  });

  it('throws when scenePurpose is missing', () => {
    const raw = validOptionRaw();
    delete raw['scenePurpose'];

    expect(() => parseSceneDirectionOption(raw, 0)).toThrow(/invalid scenePurpose/);
  });

  it('throws when valuePolarityShift is invalid', () => {
    expect(() =>
      parseSceneDirectionOption(validOptionRaw({ valuePolarityShift: 'BAD' }), 0)
    ).toThrow(/invalid valuePolarityShift/);
  });

  it('throws when pacingMode is invalid', () => {
    expect(() =>
      parseSceneDirectionOption(validOptionRaw({ pacingMode: 'NOT_A_MODE' }), 0)
    ).toThrow(/invalid pacingMode/);
  });

  it('throws when sceneDirection is missing', () => {
    const raw = validOptionRaw();
    delete raw['sceneDirection'];

    expect(() => parseSceneDirectionOption(raw, 0)).toThrow(/missing sceneDirection/);
  });

  it('throws when sceneDirection is empty string', () => {
    expect(() => parseSceneDirectionOption(validOptionRaw({ sceneDirection: '' }), 0)).toThrow(
      /missing sceneDirection/
    );
  });

  it('throws when sceneDirection is whitespace only', () => {
    expect(() => parseSceneDirectionOption(validOptionRaw({ sceneDirection: '   ' }), 0)).toThrow(
      /missing sceneDirection/
    );
  });

  it('throws when dramaticJustification is missing', () => {
    const raw = validOptionRaw();
    delete raw['dramaticJustification'];

    expect(() => parseSceneDirectionOption(raw, 0)).toThrow(/missing dramaticJustification/);
  });

  it('throws when dramaticJustification is empty string', () => {
    expect(() =>
      parseSceneDirectionOption(validOptionRaw({ dramaticJustification: '' }), 0)
    ).toThrow(/missing dramaticJustification/);
  });

  it('throws when dramaticJustification is whitespace only', () => {
    expect(() =>
      parseSceneDirectionOption(validOptionRaw({ dramaticJustification: '   ' }), 0)
    ).toThrow(/missing dramaticJustification/);
  });

  it.each([
    'EXPOSITION',
    'INCITING_INCIDENT',
    'RISING_COMPLICATION',
    'REVERSAL',
    'REVELATION',
    'CONFRONTATION',
    'NEGOTIATION',
    'INVESTIGATION',
    'PREPARATION',
    'ESCAPE',
    'PURSUIT',
    'SACRIFICE',
    'BETRAYAL',
    'REUNION',
    'TRANSFORMATION',
    'CLIMACTIC_CHOICE',
    'AFTERMATH',
  ])('accepts valid scenePurpose %s', (purpose) => {
    const result = parseSceneDirectionOption(validOptionRaw({ scenePurpose: purpose }), 0);
    expect(result.scenePurpose).toBe(purpose);
  });

  it.each([
    'POSITIVE_TO_NEGATIVE',
    'NEGATIVE_TO_POSITIVE',
    'POSITIVE_TO_DOUBLE_NEGATIVE',
    'NEGATIVE_TO_DOUBLE_POSITIVE',
    'IRONIC_SHIFT',
  ])('accepts valid valuePolarityShift %s', (shift) => {
    const result = parseSceneDirectionOption(validOptionRaw({ valuePolarityShift: shift }), 0);
    expect(result.valuePolarityShift).toBe(shift);
  });

  it.each(['ACCELERATING', 'DECELERATING', 'SUSTAINED_HIGH', 'OSCILLATING', 'BUILDING_SLOW'])(
    'accepts valid pacingMode %s',
    (mode) => {
      const result = parseSceneDirectionOption(validOptionRaw({ pacingMode: mode }), 0);
      expect(result.pacingMode).toBe(mode);
    }
  );
});

describe('validateDiversity', () => {
  it('does not throw when all lanes and diversity combinations are unique', () => {
    const options: SceneDirectionOption[] = [
      {
        diversityLane: 'ESCALATION',
        scenePurpose: 'CONFRONTATION',
        valuePolarityShift: 'POSITIVE_TO_NEGATIVE',
        pacingMode: 'ACCELERATING',
        sceneDirection: 'A',
        dramaticJustification: 'A',
      },
      {
        diversityLane: 'REVELATION',
        scenePurpose: 'REVELATION',
        valuePolarityShift: 'NEGATIVE_TO_POSITIVE',
        pacingMode: 'DECELERATING',
        sceneDirection: 'B',
        dramaticJustification: 'B',
      },
      {
        diversityLane: 'RELATIONAL_REALIGNMENT',
        scenePurpose: 'ESCAPE',
        valuePolarityShift: 'IRONIC_SHIFT',
        pacingMode: 'SUSTAINED_HIGH',
        sceneDirection: 'C',
        dramaticJustification: 'C',
      },
    ];

    expect(() => validateDiversity(options)).not.toThrow();
  });

  it('allows same scenePurpose with different valuePolarityShift', () => {
    const options: SceneDirectionOption[] = [
      {
        diversityLane: 'ESCALATION',
        scenePurpose: 'CONFRONTATION',
        valuePolarityShift: 'POSITIVE_TO_NEGATIVE',
        pacingMode: 'ACCELERATING',
        sceneDirection: 'A',
        dramaticJustification: 'A',
      },
      {
        diversityLane: 'REVELATION',
        scenePurpose: 'CONFRONTATION',
        valuePolarityShift: 'NEGATIVE_TO_POSITIVE',
        pacingMode: 'DECELERATING',
        sceneDirection: 'B',
        dramaticJustification: 'B',
      },
    ];

    expect(() => validateDiversity(options)).not.toThrow();
  });

  it('allows same valuePolarityShift with different scenePurpose', () => {
    const options: SceneDirectionOption[] = [
      {
        diversityLane: 'ESCALATION',
        scenePurpose: 'CONFRONTATION',
        valuePolarityShift: 'POSITIVE_TO_NEGATIVE',
        pacingMode: 'ACCELERATING',
        sceneDirection: 'A',
        dramaticJustification: 'A',
      },
      {
        diversityLane: 'REVELATION',
        scenePurpose: 'REVELATION',
        valuePolarityShift: 'POSITIVE_TO_NEGATIVE',
        pacingMode: 'DECELERATING',
        sceneDirection: 'B',
        dramaticJustification: 'B',
      },
    ];

    expect(() => validateDiversity(options)).not.toThrow();
  });

  it('throws LLMError when two options share the same combination', () => {
    const options: SceneDirectionOption[] = [
      {
        diversityLane: 'ESCALATION',
        scenePurpose: 'CONFRONTATION',
        valuePolarityShift: 'POSITIVE_TO_NEGATIVE',
        pacingMode: 'ACCELERATING',
        sceneDirection: 'A',
        dramaticJustification: 'A',
      },
      {
        diversityLane: 'REVELATION',
        scenePurpose: 'CONFRONTATION',
        valuePolarityShift: 'POSITIVE_TO_NEGATIVE',
        pacingMode: 'DECELERATING',
        sceneDirection: 'B',
        dramaticJustification: 'B',
      },
    ];

    expect(() => validateDiversity(options)).toThrow(LLMError);
    expect(() => validateDiversity(options)).toThrow(/Diversity violation/);
  });

  it('includes the duplicate key in the error message', () => {
    const options: SceneDirectionOption[] = [
      {
        diversityLane: 'ESCALATION',
        scenePurpose: 'ESCAPE',
        valuePolarityShift: 'IRONIC_SHIFT',
        pacingMode: 'ACCELERATING',
        sceneDirection: 'A',
        dramaticJustification: 'A',
      },
      {
        diversityLane: 'REVELATION',
        scenePurpose: 'ESCAPE',
        valuePolarityShift: 'IRONIC_SHIFT',
        pacingMode: 'DECELERATING',
        sceneDirection: 'B',
        dramaticJustification: 'B',
      },
    ];

    try {
      validateDiversity(options);
      fail('Expected LLMError');
    } catch (error) {
      expect(error).toBeInstanceOf(LLMError);
      expect((error as LLMError).message).toContain('ESCAPE:IRONIC_SHIFT');
      expect((error as LLMError).code).toBe('STRUCTURE_PARSE_ERROR');
    }
  });

  it('rejects duplicate diversity lanes', () => {
    const options: SceneDirectionOption[] = [
      {
        diversityLane: 'ESCALATION',
        scenePurpose: 'CONFRONTATION',
        valuePolarityShift: 'POSITIVE_TO_NEGATIVE',
        pacingMode: 'ACCELERATING',
        sceneDirection: 'A',
        dramaticJustification: 'A',
      },
      {
        diversityLane: 'ESCALATION',
        scenePurpose: 'REVELATION',
        valuePolarityShift: 'NEGATIVE_TO_POSITIVE',
        pacingMode: 'DECELERATING',
        sceneDirection: 'B',
        dramaticJustification: 'B',
      },
    ];

    expect(() => validateDiversity(options)).toThrow(/duplicate diversityLane: ESCALATION/);
  });

  it('rejects duplicate (diversityLane, scenePurpose) pairs', () => {
    const options: SceneDirectionOption[] = [
      {
        diversityLane: 'ESCALATION',
        scenePurpose: 'CONFRONTATION',
        valuePolarityShift: 'POSITIVE_TO_NEGATIVE',
        pacingMode: 'ACCELERATING',
        sceneDirection: 'A',
        dramaticJustification: 'A',
      },
      {
        diversityLane: 'REVELATION',
        scenePurpose: 'NEGOTIATION',
        valuePolarityShift: 'NEGATIVE_TO_POSITIVE',
        pacingMode: 'DECELERATING',
        sceneDirection: 'B',
        dramaticJustification: 'B',
      },
      {
        diversityLane: 'ESCALATION',
        scenePurpose: 'CONFRONTATION',
        valuePolarityShift: 'IRONIC_SHIFT',
        pacingMode: 'SUSTAINED_HIGH',
        sceneDirection: 'C',
        dramaticJustification: 'C',
      },
    ];

    expect(() => validateDiversity(options)).toThrow(
      /duplicate \(diversityLane, scenePurpose\) combination: ESCALATION:CONFRONTATION/
    );
  });
});

describe('parseSceneIdeatorResponse', () => {
  it('parses a valid default-count response', () => {
    const options = defaultDistinctOptions();
    const result = parseSceneIdeatorResponse({ options }, DEFAULT_SCENE_IDEA_COUNT);

    expect(result).toHaveLength(DEFAULT_SCENE_IDEA_COUNT);
    expect(result[0]!.diversityLane).toBe('ESCALATION');
    expect(result[0]!.scenePurpose).toBe('CONFRONTATION');
    expect(result[1]!.scenePurpose).toBe('REVELATION');
    expect(result[2]!.scenePurpose).toBe('ESCAPE');
  });

  it('returns a readonly array', () => {
    const result = parseSceneIdeatorResponse(
      { options: defaultDistinctOptions() },
      DEFAULT_SCENE_IDEA_COUNT
    );
    expect(Array.isArray(result)).toBe(true);
    expect(Object.isFrozen(result)).toBe(false); // readonly type, not frozen
  });

  it('throws when parsed is not an object', () => {
    expect(() => parseSceneIdeatorResponse('string', DEFAULT_SCENE_IDEA_COUNT)).toThrow(LLMError);
    expect(() => parseSceneIdeatorResponse(null, DEFAULT_SCENE_IDEA_COUNT)).toThrow(LLMError);
    expect(() => parseSceneIdeatorResponse(42, DEFAULT_SCENE_IDEA_COUNT)).toThrow(LLMError);
  });

  it('throws when parsed is an array', () => {
    expect(() => parseSceneIdeatorResponse([], DEFAULT_SCENE_IDEA_COUNT)).toThrow(LLMError);
    expect(() => parseSceneIdeatorResponse([], DEFAULT_SCENE_IDEA_COUNT)).toThrow(/must be an object/);
  });

  it('throws when options field is missing', () => {
    expect(() => parseSceneIdeatorResponse({}, DEFAULT_SCENE_IDEA_COUNT)).toThrow(LLMError);
    expect(() => parseSceneIdeatorResponse({}, DEFAULT_SCENE_IDEA_COUNT)).toThrow(
      /missing options array/
    );
  });

  it('throws when options is not an array', () => {
    expect(() => parseSceneIdeatorResponse({ options: 'not array' }, DEFAULT_SCENE_IDEA_COUNT)).toThrow(
      /missing options array/
    );
  });

  it('throws when options has fewer than the requested count', () => {
    const options = defaultDistinctOptions().slice(0, DEFAULT_SCENE_IDEA_COUNT - 1);

    expect(() => parseSceneIdeatorResponse({ options }, DEFAULT_SCENE_IDEA_COUNT)).toThrow(
      LLMError
    );
    expect(() => parseSceneIdeatorResponse({ options }, DEFAULT_SCENE_IDEA_COUNT)).toThrow(
      new RegExp(`exactly ${DEFAULT_SCENE_IDEA_COUNT} options`)
    );
  });

  it('throws when options has more than the requested count', () => {
    const options = [
      ...defaultDistinctOptions(),
      validOptionRaw({
        diversityLane: 'IDENTITY_OR_TRANSFORMATION',
        scenePurpose: 'BETRAYAL',
        valuePolarityShift: 'POSITIVE_TO_DOUBLE_NEGATIVE',
      }),
    ];

    expect(() => parseSceneIdeatorResponse({ options }, DEFAULT_SCENE_IDEA_COUNT)).toThrow(
      new RegExp(`exactly ${DEFAULT_SCENE_IDEA_COUNT} options`)
    );
  });

  it('throws when an individual option is invalid', () => {
    const options = defaultDistinctOptions();
    options[1] = { scenePurpose: 'INVALID' };

    expect(() => parseSceneIdeatorResponse({ options }, DEFAULT_SCENE_IDEA_COUNT)).toThrow(
      LLMError
    );
  });

  it('throws on diversity violation within options', () => {
    const options = [
      validOptionRaw({
        diversityLane: 'ESCALATION',
        scenePurpose: 'CONFRONTATION',
        valuePolarityShift: 'POSITIVE_TO_NEGATIVE',
      }),
      validOptionRaw({
        diversityLane: 'REVELATION',
        scenePurpose: 'CONFRONTATION',
        valuePolarityShift: 'POSITIVE_TO_NEGATIVE',
        sceneDirection: 'Different direction.',
        dramaticJustification: 'Different justification.',
      }),
      validOptionRaw({
        diversityLane: 'RELATIONAL_REALIGNMENT',
        scenePurpose: 'ESCAPE',
        valuePolarityShift: 'IRONIC_SHIFT',
      }),
      validOptionRaw({
        diversityLane: 'TEMPTATION_OR_OPPORTUNITY',
        scenePurpose: 'NEGOTIATION',
        valuePolarityShift: 'NEGATIVE_TO_POSITIVE',
      }),
      validOptionRaw({
        diversityLane: 'CONSEQUENCE_OR_PAYOFF',
        scenePurpose: 'AFTERMATH',
        valuePolarityShift: 'NEGATIVE_TO_DOUBLE_POSITIVE',
      }),
    ];

    expect(() => parseSceneIdeatorResponse({ options }, DEFAULT_SCENE_IDEA_COUNT)).toThrow(
      /Diversity violation/
    );
  });

  it('includes received count in error message for wrong option count', () => {
    try {
      parseSceneIdeatorResponse({ options: [validOptionRaw()] }, DEFAULT_SCENE_IDEA_COUNT);
      fail('Expected LLMError');
    } catch (error) {
      expect(error).toBeInstanceOf(LLMError);
      expect((error as LLMError).message).toContain('received: 1');
    }
  });
});

describe('generateSceneDirections', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns options and rawResponse from a valid API response', async () => {
    const payload = { options: defaultDistinctOptions() };
    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    const context = createMinimalOpeningContext();
    const result = await generateSceneDirections(context, 'test-api-key');

    expect(result.options).toHaveLength(DEFAULT_SCENE_IDEA_COUNT);
    expect(result.options[0]!.scenePurpose).toBe('CONFRONTATION');
    expect(result.options[1]!.scenePurpose).toBe('REVELATION');
    expect(result.options[2]!.scenePurpose).toBe('ESCAPE');
    expect(typeof result.rawResponse).toBe('string');
    expect(result.rawResponse.length).toBeGreaterThan(0);
  });

  it('passes API key in Authorization header', async () => {
    const payload = { options: defaultDistinctOptions() };
    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    await generateSceneDirections(createMinimalOpeningContext(), 'my-secret-key');

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [, requestInit] = (globalThis.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const headers = requestInit.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer my-secret-key');
  });

  it('throws LLMError on HTTP error response', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve(JSON.stringify({ error: { message: 'Server error' } })),
    });

    await expect(
      generateSceneDirections(createMinimalOpeningContext(), 'test-key')
    ).rejects.toThrow(LLMError);
  });

  it('throws LLMError on empty response content', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ choices: [{ message: { content: '' } }] }),
      text: () => Promise.resolve(JSON.stringify({ choices: [{ message: { content: '' } }] })),
    } as unknown as Response);

    await expect(
      generateSceneDirections(createMinimalOpeningContext(), 'test-key')
    ).rejects.toThrow(/Empty response/);
  });

  it('throws LLMError when response fails parsing', async () => {
    const badPayload = { options: [validOptionRaw()] };
    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(badPayload));

    await expect(
      generateSceneDirections(createMinimalOpeningContext(), 'test-key')
    ).rejects.toThrow(LLMError);
  });
});
