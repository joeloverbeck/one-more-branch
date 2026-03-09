import {
  needsChoiceRepair,
  buildSupplementaryMessages,
  validateSupplementaryResponse,
  repairInsufficientChoices,
} from '../../../../src/llm/validation/writer-choice-insufficiency-repair';

jest.mock('../../../../src/config/stage-model', () => ({
  getStageModel: jest.fn().mockReturnValue('anthropic/claude-sonnet-4.5'),
}));

jest.mock('../../../../src/logging/index', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../../src/logging/prompt-formatter', () => ({
  logPrompt: jest.fn(),
  logResponse: jest.fn(),
}));

function buildOpenRouterResponse(choices: object[]): object {
  return {
    id: 'test-id',
    choices: [
      {
        message: {
          content: JSON.stringify({ choices }),
        },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
  };
}

function mockFetchSuccess(choices: object[]): jest.SpyInstance {
  const responseBody = buildOpenRouterResponse(choices);
  return jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(responseBody)),
    json: () => Promise.resolve(responseBody),
  } as unknown as Response);
}

function mockFetchFailure(status: number): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: false,
    status,
    text: () => Promise.resolve('Internal Server Error'),
  } as unknown as Response);
}

function mockFetchNetworkError(): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
}

const VALID_CHOICE_A = {
  text: 'Confront the guard directly',
  choiceType: 'CONTEST',
  primaryDelta: 'THREAT_LEVEL_CHANGE',
};

const VALID_CHOICE_B = {
  text: 'Sneak past through the shadows',
  choiceType: 'INTERVENE',
  primaryDelta: 'LOCATION_ACCESS_CHANGE',
};

const VALID_CHOICE_C = {
  text: 'Search for an alternate route',
  choiceType: 'INVESTIGATE',
  primaryDelta: 'INFORMATION_STATE_CHANGE',
};

const BASE_WRITER_OUTPUT = {
  narrative: 'The corridor stretched before them, dimly lit by flickering torches. '.repeat(5),
  sceneSummary: 'The party faces a guarded corridor.',
  protagonistAffect: {
    primaryEmotion: 'tension',
    primaryIntensity: 'moderate',
    primaryCause: 'The guard blocks the path',
    secondaryEmotions: [],
    dominantMotivation: 'Get past the obstacle',
  },
};

describe('needsChoiceRepair', () => {
  it('returns true when exactly 1 choice and not ending', () => {
    const input = { ...BASE_WRITER_OUTPUT, choices: [VALID_CHOICE_A] };
    expect(needsChoiceRepair(input)).toBe(true);
  });

  it('returns false when 2+ choices', () => {
    const input = { ...BASE_WRITER_OUTPUT, choices: [VALID_CHOICE_A, VALID_CHOICE_B] };
    expect(needsChoiceRepair(input)).toBe(false);
  });

  it('returns false when 3+ choices', () => {
    const input = {
      ...BASE_WRITER_OUTPUT,
      choices: [VALID_CHOICE_A, VALID_CHOICE_B, VALID_CHOICE_C],
    };
    expect(needsChoiceRepair(input)).toBe(false);
  });

  it('returns true when 1 choice regardless of isEnding field', () => {
    const input = { ...BASE_WRITER_OUTPUT, choices: [VALID_CHOICE_A] };
    expect(needsChoiceRepair(input)).toBe(true);
  });

  it('returns false when 0 choices (deeper confusion)', () => {
    const input = { ...BASE_WRITER_OUTPUT, choices: [] };
    expect(needsChoiceRepair(input)).toBe(false);
  });

  it('returns false for non-object input', () => {
    expect(needsChoiceRepair(null)).toBe(false);
    expect(needsChoiceRepair(42)).toBe(false);
    expect(needsChoiceRepair('string')).toBe(false);
    expect(needsChoiceRepair([1, 2])).toBe(false);
  });

  it('returns false when choices is not an array', () => {
    const input = { ...BASE_WRITER_OUTPUT, choices: 'not an array' };
    expect(needsChoiceRepair(input)).toBe(false);
  });
});

describe('buildSupplementaryMessages', () => {
  it('returns system + user messages', () => {
    const messages = buildSupplementaryMessages('A short narrative.', 'Scene summary.', [
      VALID_CHOICE_A,
    ]);
    expect(messages).toHaveLength(2);
    expect(messages[0]!.role).toBe('system');
    expect(messages[1]!.role).toBe('user');
  });

  it('includes existing choices in user message', () => {
    const messages = buildSupplementaryMessages('Narrative.', 'Summary.', [VALID_CHOICE_A]);
    const userContent = messages[1]!.content;
    expect(userContent).toContain('Confront the guard directly');
    expect(userContent).toContain('CONTEST');
    expect(userContent).toContain('THREAT_LEVEL_CHANGE');
  });

  it('truncates narrative exceeding 2000 chars', () => {
    const longNarrative = 'A'.repeat(3000);
    const messages = buildSupplementaryMessages(longNarrative, 'Summary.', [VALID_CHOICE_A]);
    const userContent = messages[1]!.content;
    expect(userContent).toContain('...');
    expect(userContent.length).toBeLessThan(longNarrative.length);
  });

  it('does not truncate narrative within 2000 chars', () => {
    const shortNarrative = 'A short narrative passage.';
    const messages = buildSupplementaryMessages(shortNarrative, 'Summary.', [VALID_CHOICE_A]);
    const userContent = messages[1]!.content;
    expect(userContent).toContain(shortNarrative);
  });

  it('includes scene summary in user message', () => {
    const messages = buildSupplementaryMessages('Narrative.', 'The hero reaches the gate.', [
      VALID_CHOICE_A,
    ]);
    expect(messages[1]!.content).toContain('The hero reaches the gate.');
  });
});

describe('validateSupplementaryResponse', () => {
  it('returns valid choices when all are well-formed', () => {
    const result = validateSupplementaryResponse([VALID_CHOICE_B, VALID_CHOICE_C]);
    expect(result).toHaveLength(2);
    expect(result![0]!.text).toBe(VALID_CHOICE_B.text);
    expect(result![1]!.text).toBe(VALID_CHOICE_C.text);
  });

  it('filters out choices with invalid choiceType', () => {
    const invalid = { text: 'Do something', choiceType: 'INVALID_TYPE', primaryDelta: 'GOAL_PRIORITY_CHANGE' };
    const result = validateSupplementaryResponse([VALID_CHOICE_B, invalid]);
    expect(result).toHaveLength(1);
    expect(result![0]!.text).toBe(VALID_CHOICE_B.text);
  });

  it('filters out choices with invalid primaryDelta', () => {
    const invalid = {
      text: 'Do something',
      choiceType: 'INTERVENE',
      primaryDelta: 'INVALID_DELTA',
    };
    const result = validateSupplementaryResponse([invalid, VALID_CHOICE_C]);
    expect(result).toHaveLength(1);
    expect(result![0]!.text).toBe(VALID_CHOICE_C.text);
  });

  it('filters out choices with text shorter than 3 chars', () => {
    const tooShort = {
      text: 'Go',
      choiceType: 'INTERVENE',
      primaryDelta: 'LOCATION_ACCESS_CHANGE',
    };
    const result = validateSupplementaryResponse([tooShort, VALID_CHOICE_B]);
    expect(result).toHaveLength(1);
  });

  it('returns null when no valid choices', () => {
    const invalid1 = { text: 'X', choiceType: 'BAD', primaryDelta: 'BAD' };
    const invalid2 = { text: '', choiceType: 'ALSO_BAD', primaryDelta: 'STILL_BAD' };
    expect(validateSupplementaryResponse([invalid1, invalid2])).toBeNull();
  });

  it('returns null for non-array input', () => {
    expect(validateSupplementaryResponse('not an array')).toBeNull();
    expect(validateSupplementaryResponse(null)).toBeNull();
    expect(validateSupplementaryResponse(42)).toBeNull();
  });

  it('caps at 4 supplementary choices', () => {
    const choices = Array.from({ length: 6 }, (_, i) => ({
      text: `Choice number ${i + 1} with enough text`,
      choiceType: 'INTERVENE',
      primaryDelta: 'LOCATION_ACCESS_CHANGE',
    }));
    const result = validateSupplementaryResponse(choices);
    expect(result).toHaveLength(4);
  });

  it('trims whitespace from choice text', () => {
    const choice = {
      text: '  Walk through the door  ',
      choiceType: 'INTERVENE',
      primaryDelta: 'LOCATION_ACCESS_CHANGE',
    };
    const result = validateSupplementaryResponse([choice]);
    expect(result![0]!.text).toBe('Walk through the door');
  });

  it('filters out non-object candidates', () => {
    const result = validateSupplementaryResponse([null, 42, 'string', VALID_CHOICE_B]);
    expect(result).toHaveLength(1);
    expect(result![0]!.text).toBe(VALID_CHOICE_B.text);
  });
});

describe('repairInsufficientChoices', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('no-op cases', () => {
    it('returns unchanged when 2+ choices present', async () => {
      const input = { ...BASE_WRITER_OUTPUT, choices: [VALID_CHOICE_A, VALID_CHOICE_B] };
      const result = await repairInsufficientChoices(input, 'test-key', undefined, undefined);
      expect(result.repaired).toBe(false);
      expect(result.repairedJson).toBe(input);
    });

    it('returns unchanged when 0 choices (no isEnding check)', async () => {
      const input = { ...BASE_WRITER_OUTPUT, choices: [] };
      const result = await repairInsufficientChoices(input, 'test-key', undefined, undefined);
      expect(result.repaired).toBe(false);
      expect(result.repairedJson).toBe(input);
    });

    it('returns unchanged when 0 choices', async () => {
      const input = { ...BASE_WRITER_OUTPUT, choices: [] };
      const result = await repairInsufficientChoices(input, 'test-key', undefined, undefined);
      expect(result.repaired).toBe(false);
      expect(result.repairedJson).toBe(input);
    });

    it('returns unchanged for non-object input', async () => {
      const result = await repairInsufficientChoices(null, 'test-key', undefined, undefined);
      expect(result.repaired).toBe(false);
    });

    it('returns unchanged when narrative is missing', async () => {
      const input = { choices: [VALID_CHOICE_A], sceneSummary: 'summary' };
      const result = await repairInsufficientChoices(input, 'test-key', undefined, undefined);
      expect(result.repaired).toBe(false);
    });

    it('returns unchanged when sceneSummary is missing', async () => {
      const input = { choices: [VALID_CHOICE_A], narrative: 'some text' };
      const result = await repairInsufficientChoices(input, 'test-key', undefined, undefined);
      expect(result.repaired).toBe(false);
    });
  });

  describe('successful repair', () => {
    it('merges supplementary choices when LLM returns 2 valid choices', async () => {
      mockFetchSuccess([VALID_CHOICE_B, VALID_CHOICE_C]);

      const input = { ...BASE_WRITER_OUTPUT, choices: [VALID_CHOICE_A] };
      const result = await repairInsufficientChoices(input, 'test-key', 'test-model', undefined);

      expect(result.repaired).toBe(true);
      expect(result.repairDetails).toContain('Added 2 supplementary choice(s)');
      expect(result.repairDetails).toContain('1 original + 2 new = 3 total');

      const repaired = result.repairedJson as Record<string, unknown>;
      const choices = repaired['choices'] as unknown[];
      expect(choices).toHaveLength(3);
    });

    it('preserves existing choice as first element', async () => {
      mockFetchSuccess([VALID_CHOICE_B, VALID_CHOICE_C]);

      const input = { ...BASE_WRITER_OUTPUT, choices: [VALID_CHOICE_A] };
      const result = await repairInsufficientChoices(input, 'test-key', 'test-model', undefined);

      const repaired = result.repairedJson as Record<string, unknown>;
      const choices = repaired['choices'] as Array<{ text: string }>;
      expect(choices[0]!.text).toBe(VALID_CHOICE_A.text);
    });

    it('preserves all other fields in the JSON', async () => {
      mockFetchSuccess([VALID_CHOICE_B, VALID_CHOICE_C]);

      const input = { ...BASE_WRITER_OUTPUT, choices: [VALID_CHOICE_A] };
      const result = await repairInsufficientChoices(input, 'test-key', 'test-model', undefined);

      const repaired = result.repairedJson as Record<string, unknown>;
      expect(repaired['narrative']).toBe(input.narrative);
      expect(repaired['sceneSummary']).toBe(input.sceneSummary);
      expect(repaired['sceneSummary']).toBe(input.sceneSummary);
      expect(repaired['protagonistAffect']).toBe(input.protagonistAffect);
    });
  });

  describe('partial repair', () => {
    it('merges only valid supplementary choices when some are invalid', async () => {
      const invalidChoice = {
        text: 'X',
        choiceType: 'INVALID',
        primaryDelta: 'ALSO_INVALID',
      };
      mockFetchSuccess([VALID_CHOICE_B, invalidChoice]);

      const input = { ...BASE_WRITER_OUTPUT, choices: [VALID_CHOICE_A] };
      const result = await repairInsufficientChoices(input, 'test-key', 'test-model', undefined);

      expect(result.repaired).toBe(true);
      expect(result.repairDetails).toContain('Added 1 supplementary choice(s)');

      const repaired = result.repairedJson as Record<string, unknown>;
      const choices = repaired['choices'] as unknown[];
      expect(choices).toHaveLength(2);
    });
  });

  describe('failed repair', () => {
    it('returns unchanged on HTTP error', async () => {
      mockFetchFailure(500);

      const input = { ...BASE_WRITER_OUTPUT, choices: [VALID_CHOICE_A] };
      const result = await repairInsufficientChoices(input, 'test-key', 'test-model', undefined);

      expect(result.repaired).toBe(false);
      expect(result.repairedJson).toBe(input);
    });

    it('returns unchanged on network error', async () => {
      mockFetchNetworkError();

      const input = { ...BASE_WRITER_OUTPUT, choices: [VALID_CHOICE_A] };
      const result = await repairInsufficientChoices(input, 'test-key', 'test-model', undefined);

      expect(result.repaired).toBe(false);
      expect(result.repairedJson).toBe(input);
    });

    it('returns unchanged when LLM returns invalid JSON', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('not json'),
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as unknown as Response);

      const input = { ...BASE_WRITER_OUTPUT, choices: [VALID_CHOICE_A] };
      const result = await repairInsufficientChoices(input, 'test-key', 'test-model', undefined);

      expect(result.repaired).toBe(false);
    });

    it('returns unchanged when all supplementary choices are invalid', async () => {
      mockFetchSuccess([
        { text: 'X', choiceType: 'INVALID', primaryDelta: 'BAD' },
        { text: '', choiceType: 'NOPE', primaryDelta: 'WRONG' },
      ]);

      const input = { ...BASE_WRITER_OUTPUT, choices: [VALID_CHOICE_A] };
      const result = await repairInsufficientChoices(input, 'test-key', 'test-model', undefined);

      expect(result.repaired).toBe(false);
    });

    it('returns unchanged when LLM returns empty choices array', async () => {
      mockFetchSuccess([]);

      const input = { ...BASE_WRITER_OUTPUT, choices: [VALID_CHOICE_A] };
      const result = await repairInsufficientChoices(input, 'test-key', 'test-model', undefined);

      expect(result.repaired).toBe(false);
    });
  });
});
