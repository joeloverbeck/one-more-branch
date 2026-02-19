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
}));

import { evaluateKernels, parseKernelScoringResponse } from '../../../src/llm/kernel-evaluator';
import {
  buildKernelEvaluatorDeepEvalPrompt,
  buildKernelEvaluatorScoringPrompt,
} from '../../../src/llm/prompts/kernel-evaluator-prompt';
import {
  KERNEL_EVALUATION_DEEP_SCHEMA,
  KERNEL_EVALUATION_SCORING_SCHEMA,
} from '../../../src/llm/schemas/kernel-evaluator-schema';
import { computeKernelOverallScore, type StoryKernel } from '../../../src/models';

function createKernel(index: number): StoryKernel {
  return {
    dramaticThesis: `Thesis ${index}`,
    valueAtStake: `Value ${index}`,
    opposingForce: `Force ${index}`,
    directionOfChange: index % 3 === 0 ? 'NEGATIVE' : index % 2 === 0 ? 'IRONIC' : 'POSITIVE',
    thematicQuestion: `Question ${index}?`,
  };
}

function createScoredKernelPayload(index: number): {
  kernel: StoryKernel;
  scores: {
    dramaticClarity: number;
    thematicUniversality: number;
    generativePotential: number;
    conflictTension: number;
    emotionalDepth: number;
  };
  scoreEvidence: {
    dramaticClarity: readonly string[];
    thematicUniversality: readonly string[];
    generativePotential: readonly string[];
    conflictTension: readonly string[];
    emotionalDepth: readonly string[];
  };
} {
  return {
    kernel: createKernel(index),
    scores: {
      dramaticClarity: 3 + (index % 2),
      thematicUniversality: 3,
      generativePotential: 4,
      conflictTension: 4,
      emotionalDepth: 3,
    },
    scoreEvidence: {
      dramaticClarity: [`Clarity evidence ${index}`],
      thematicUniversality: [`Universality evidence ${index}`],
      generativePotential: [`Potential evidence ${index}`],
      conflictTension: [`Tension evidence ${index}`],
      emotionalDepth: [`Depth evidence ${index}`],
    },
  };
}

function createScoringPayload(): {
  scoredKernels: Array<ReturnType<typeof createScoredKernelPayload>>;
} {
  return {
    scoredKernels: [
      createScoredKernelPayload(1),
      createScoredKernelPayload(2),
      createScoredKernelPayload(3),
      createScoredKernelPayload(4),
      createScoredKernelPayload(5),
      createScoredKernelPayload(6),
    ],
  };
}

function createJsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

function responseWithMessageContent(content: string): Response {
  return createJsonResponse(200, {
    id: 'or-kernel-evaluator-1',
    choices: [{ message: { content }, finish_reason: 'stop' }],
  });
}

describe('kernel-evaluator', () => {
  const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    mockLogPrompt.mockReset();
    mockLogger.warn.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  function getRequestBody(callIndex = 0): Record<string, unknown> {
    const call = fetchMock.mock.calls[callIndex];
    if (!call) {
      return {};
    }

    const init = call[1];
    if (!init || typeof init.body !== 'string') {
      return {};
    }

    return JSON.parse(init.body) as Record<string, unknown>;
  }

  it('parseKernelScoringResponse returns all kernels sorted and rescored', () => {
    const payload = createScoringPayload();
    payload.scoredKernels[0]!.scores.dramaticClarity = 1;
    payload.scoredKernels[1]!.scores.dramaticClarity = 5;

    const expectedKernels = payload.scoredKernels.map((item) => item.kernel);
    const parsed = parseKernelScoringResponse(payload, expectedKernels);

    expect(parsed).toHaveLength(6);
    expect(parsed[0]!.kernel.dramaticThesis).toBe('Thesis 2');
    expect(parsed[0]!.overallScore).toBe(computeKernelOverallScore(parsed[0]!.scores));
  });

  it('parseKernelScoringResponse clamps out-of-range scores', () => {
    const payload = createScoringPayload();
    payload.scoredKernels[0]!.scores.dramaticClarity = 9;
    payload.scoredKernels[0]!.scores.emotionalDepth = -1;

    const expectedKernels = payload.scoredKernels.map((item) => item.kernel);
    const parsed = parseKernelScoringResponse(payload, expectedKernels);
    const target = parsed.find((item) => item.kernel.dramaticThesis === 'Thesis 1');

    expect(target?.scores.dramaticClarity).toBe(5);
    expect(target?.scores.emotionalDepth).toBe(0);
    expect(mockLogger.warn).toHaveBeenCalledTimes(2);
  });

  it('parseKernelScoringResponse rejects missing scoredKernels', () => {
    expect(() => parseKernelScoringResponse({}, [createKernel(1)])).toThrow('missing scoredKernels array');
  });

  it('parseKernelScoringResponse rejects omitted kernels', () => {
    const payload = createScoringPayload();
    payload.scoredKernels = payload.scoredKernels.slice(0, 5);

    const expectedKernels = Array.from({ length: 6 }, (_, index) => createKernel(index + 1));
    expect(() => parseKernelScoringResponse(payload, expectedKernels)).toThrow(
      'must include exactly 6 kernels',
    );
  });

  it('buildKernelEvaluatorScoringPrompt includes all-kernel scoring instructions', () => {
    const messages = buildKernelEvaluatorScoringPrompt({
      kernels: Array.from({ length: 6 }, (_, index) => createKernel(index + 1)),
      userSeeds: {
        apiKey: 'test-api-key',
        thematicInterests: 'control and trust',
      },
    });

    const systemMessage = messages[0]?.content ?? '';
    expect(systemMessage).toContain('Score every candidate kernel');
    expect(systemMessage).toContain('Do not rank, filter, or select kernels');
    expect(systemMessage).toContain('SCORING RUBRIC (0-5)');
  });

  it('buildKernelEvaluatorDeepEvalPrompt includes no-rescore instruction', () => {
    const messages = buildKernelEvaluatorDeepEvalPrompt(
      {
        kernels: Array.from({ length: 6 }, (_, index) => createKernel(index + 1)),
        userSeeds: {
          apiKey: 'test-api-key',
        },
      },
      [
        {
          kernel: createKernel(1),
          scores: createScoredKernelPayload(1).scores,
          scoreEvidence: createScoredKernelPayload(1).scoreEvidence,
          overallScore: 80,
          passes: true,
        },
      ],
    );

    const systemMessage = messages[0]?.content ?? '';
    expect(systemMessage).toContain('Evaluate all provided kernels');
    expect(systemMessage).toContain('Do not rescore and do not alter kernels');
  });

  it('evaluateKernels runs scoring then deep-eval and returns all evaluated kernels', async () => {
    const scoringPayload = createScoringPayload();
    scoringPayload.scoredKernels[1]!.scores.dramaticClarity = 5;
    scoringPayload.scoredKernels[3]!.scores.dramaticClarity = 4;

    const deepPayload = {
      evaluatedKernels: [
        {
          kernel: createKernel(3),
          strengths: ['Strength 3a', 'Strength 3b'],
          weaknesses: ['Weakness 3a', 'Weakness 3b'],
          tradeoffSummary: 'Tradeoff 3',
        },
        {
          kernel: createKernel(1),
          strengths: ['Strength 1a', 'Strength 1b'],
          weaknesses: ['Weakness 1a', 'Weakness 1b'],
          tradeoffSummary: 'Tradeoff 1',
        },
        {
          kernel: createKernel(2),
          strengths: ['Strength 2a', 'Strength 2b'],
          weaknesses: ['Weakness 2a', 'Weakness 2b'],
          tradeoffSummary: 'Tradeoff 2',
        },
        {
          kernel: createKernel(4),
          strengths: ['Strength 4a', 'Strength 4b'],
          weaknesses: ['Weakness 4a', 'Weakness 4b'],
          tradeoffSummary: 'Tradeoff 4',
        },
        {
          kernel: createKernel(5),
          strengths: ['Strength 5a', 'Strength 5b'],
          weaknesses: ['Weakness 5a', 'Weakness 5b'],
          tradeoffSummary: 'Tradeoff 5',
        },
        {
          kernel: createKernel(6),
          strengths: ['Strength 6a', 'Strength 6b'],
          weaknesses: ['Weakness 6a', 'Weakness 6b'],
          tradeoffSummary: 'Tradeoff 6',
        },
      ],
    };

    fetchMock
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(scoringPayload)))
      .mockResolvedValueOnce(responseWithMessageContent(JSON.stringify(deepPayload)));

    const result = await evaluateKernels(
      {
        kernels: Array.from({ length: 6 }, (_, index) => createKernel(index + 1)),
        userSeeds: {
          apiKey: 'test-api-key',
          thematicInterests: 'sacrifice',
        },
      },
      'test-api-key',
    );

    expect(result.scoredKernels).toHaveLength(6);
    expect(result.evaluatedKernels).toHaveLength(6);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const scoringRequestBody = getRequestBody(0);
    const deepRequestBody = getRequestBody(1);
    expect(scoringRequestBody['response_format']).toEqual(KERNEL_EVALUATION_SCORING_SCHEMA);
    expect(deepRequestBody['response_format']).toEqual(KERNEL_EVALUATION_DEEP_SCHEMA);
    expect(mockLogPrompt).toHaveBeenCalledWith(mockLogger, 'kernelEvaluator', expect.any(Array));
    expect(mockLogPrompt).toHaveBeenCalledTimes(2);
  });
});
