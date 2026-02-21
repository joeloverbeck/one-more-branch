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

import { CONTENT_POLICY } from '../../../src/llm/content-policy';
import { evolveKernels, parseKernelEvolutionResponse } from '../../../src/llm/kernel-evolver';
import { buildKernelEvolverPrompt } from '../../../src/llm/prompts/kernel-evolver-prompt';
import { KERNEL_EVOLUTION_SCHEMA } from '../../../src/llm/schemas/kernel-evolver-schema';
import type { DirectionOfChange, KernelEvolverContext, StoryKernel } from '../../../src/models';

function createKernel(index: number, direction: DirectionOfChange = 'POSITIVE'): StoryKernel {
  return {
    dramaticThesis: `Thesis ${index}`,
    valueAtStake: `Value ${index}`,
    opposingForce: `Force ${index}`,
    directionOfChange: direction,
    thematicQuestion: `Question ${index}?`,
  };
}

function createValidPayload(): { kernels: StoryKernel[] } {
  const directions: DirectionOfChange[] = [
    'POSITIVE',
    'NEGATIVE',
    'IRONIC',
    'AMBIGUOUS',
    'POSITIVE',
    'NEGATIVE',
  ];

  return {
    kernels: Array.from({ length: 6 }, (_, index) => createKernel(index + 1, directions[index])),
  };
}

function createEvaluatedKernelFixture(index: number) {
  return {
    kernel: createKernel(index),
    scores: {
      dramaticClarity: 4,
      thematicUniversality: 3,
      generativePotential: 4,
      conflictTension: 5,
      emotionalDepth: 3,
    },
    overallScore: 78,
    passes: true,
    strengths: [`Strength ${index}`],
    weaknesses: [`Weakness ${index}`],
    tradeoffSummary: `Tradeoff ${index}`,
  };
}

function createContext(): KernelEvolverContext {
  return {
    parentKernels: [createEvaluatedKernelFixture(1), createEvaluatedKernelFixture(2)],
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
    id: 'or-evolver-1',
    choices: [{ message: { content }, finish_reason: 'stop' }],
  });
}

describe('kernel-evolver', () => {
  const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    mockLogPrompt.mockReset();
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

  describe('parseKernelEvolutionResponse', () => {
    it('rejects non-object responses', () => {
      expect(() => parseKernelEvolutionResponse('invalid')).toThrow(
        'response must be an object',
      );
    });

    it('rejects null responses', () => {
      expect(() => parseKernelEvolutionResponse(null)).toThrow(
        'response must be an object',
      );
    });

    it('rejects array responses', () => {
      expect(() => parseKernelEvolutionResponse([])).toThrow(
        'response must be an object',
      );
    });

    it('returns StoryKernel[] for valid payload', () => {
      const parsed = parseKernelEvolutionResponse(createValidPayload());
      expect(parsed).toHaveLength(6);
      expect(parsed[0]?.directionOfChange).toBe('POSITIVE');
    });

    it('rejects missing kernels array', () => {
      expect(() => parseKernelEvolutionResponse({})).toThrow('missing kernels array');
    });

    it('rejects responses with non-6 count', () => {
      const payload = createValidPayload();
      payload.kernels = payload.kernels.slice(0, 5);
      expect(() => parseKernelEvolutionResponse(payload)).toThrow('exactly 6 kernels');
    });

    it('rejects too many kernels', () => {
      const payload = createValidPayload();
      payload.kernels.push(createKernel(7, 'IRONIC'));
      expect(() => parseKernelEvolutionResponse(payload)).toThrow('exactly 6 kernels');
    });

    it('rejects invalid kernel items', () => {
      const payload = createValidPayload();
      (payload.kernels[0] as unknown as Record<string, unknown>)['dramaticThesis'] = '';
      expect(() => parseKernelEvolutionResponse(payload)).toThrow(
        'not a valid StoryKernel',
      );
    });

    it('rejects duplicate valueAtStake (case-insensitive)', () => {
      const payload = createValidPayload();
      payload.kernels[5] = {
        ...payload.kernels[5],
        valueAtStake: payload.kernels[0].valueAtStake.toUpperCase(),
      };
      expect(() => parseKernelEvolutionResponse(payload)).toThrow(
        'duplicate valueAtStake',
      );
    });

    it('rejects duplicate opposingForce (case-insensitive)', () => {
      const payload = createValidPayload();
      payload.kernels[5] = {
        ...payload.kernels[5],
        opposingForce: payload.kernels[0].opposingForce.toUpperCase(),
      };
      expect(() => parseKernelEvolutionResponse(payload)).toThrow(
        'duplicate opposingForce',
      );
    });

    it('rejects insufficient directionOfChange diversity', () => {
      const payload = {
        kernels: Array.from({ length: 6 }, (_, index) => createKernel(index + 1, 'POSITIVE')),
      };
      // All 6 have 'POSITIVE' which is only 1 distinct value
      expect(() => parseKernelEvolutionResponse(payload)).toThrow(
        'at least 3 distinct directionOfChange',
      );
    });

    it('accepts exactly 3 distinct directionOfChange values', () => {
      const directions: DirectionOfChange[] = [
        'POSITIVE',
        'POSITIVE',
        'NEGATIVE',
        'NEGATIVE',
        'IRONIC',
        'IRONIC',
      ];
      const payload = {
        kernels: Array.from({ length: 6 }, (_, index) => createKernel(index + 1, directions[index])),
      };
      const parsed = parseKernelEvolutionResponse(payload);
      expect(parsed).toHaveLength(6);
    });
  });

  describe('buildKernelEvolverPrompt', () => {
    it('includes content policy and mutation strategies', () => {
      const context = createContext();
      const messages = buildKernelEvolverPrompt(context);
      expect(messages).toHaveLength(2);

      const systemMessage = messages[0]?.content ?? '';
      expect(systemMessage).toContain(CONTENT_POLICY);
      expect(systemMessage).toContain('MUTATION STRATEGIES');
      expect(systemMessage).toContain('thesis-inversion');
      expect(systemMessage).toContain('force-escalation');
      expect(systemMessage).toContain('value-transplant');
      expect(systemMessage).toContain('direction-pivot');
      expect(systemMessage).toContain('synthesis');
      expect(systemMessage).toContain('radicalize');
    });

    it('includes diversity constraints and quality anchors', () => {
      const context = createContext();
      const messages = buildKernelEvolverPrompt(context);
      const systemMessage = messages[0]?.content ?? '';

      expect(systemMessage).toContain('DIVERSITY CONSTRAINTS');
      expect(systemMessage).toContain('QUALITY ANCHORS');
      expect(systemMessage).toContain('DIRECTION OF CHANGE TAXONOMY');
      expect(systemMessage).toContain('PROHIBITIONS');
    });

    it('includes parent evaluation data in user message', () => {
      const context = createContext();
      const messages = buildKernelEvolverPrompt(context);
      const userMessage = messages[1]?.content ?? '';

      expect(userMessage).toContain('PARENT KERNELS INPUT');
      expect(userMessage).toContain('"parentId": "parent_1"');
      expect(userMessage).toContain('"parentId": "parent_2"');
      expect(userMessage).toContain('"strengths"');
      expect(userMessage).toContain('"weaknesses"');
      expect(userMessage).toContain('"tradeoffSummary"');
      expect(userMessage).toContain('"overallScore"');
    });

    it('includes all parents when context has 3 parent kernels', () => {
      const context: KernelEvolverContext = {
        parentKernels: [
          createEvaluatedKernelFixture(1),
          createEvaluatedKernelFixture(2),
          createEvaluatedKernelFixture(3),
        ],
      };
      const messages = buildKernelEvolverPrompt(context);
      const userMessage = messages[1]?.content ?? '';

      expect(userMessage).toContain('"parentId": "parent_1"');
      expect(userMessage).toContain('"parentId": "parent_2"');
      expect(userMessage).toContain('"parentId": "parent_3"');
    });

    it('includes output requirements', () => {
      const context = createContext();
      const messages = buildKernelEvolverPrompt(context);
      const userMessage = messages[1]?.content ?? '';

      expect(userMessage).toContain('OUTPUT REQUIREMENTS');
      expect(userMessage).toContain('exactly 6');
      expect(userMessage).toContain('Do not copy any parent unchanged');
    });
  });

  describe('evolveKernels', () => {
    it('sends request and returns parsed result', async () => {
      const payload = createValidPayload();
      const rawContent = JSON.stringify(payload);
      fetchMock.mockResolvedValue(responseWithMessageContent(rawContent));

      const result = await evolveKernels(createContext(), 'test-api-key');

      expect(result.rawResponse).toBe(rawContent);
      expect(result.kernels).toHaveLength(6);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const requestBody = getRequestBody();
      expect(requestBody['response_format']).toEqual(KERNEL_EVOLUTION_SCHEMA);
      expect(mockLogPrompt).toHaveBeenCalledWith(mockLogger, 'kernelEvolver', expect.any(Array));
      expect(mockLogPrompt).toHaveBeenCalledTimes(1);
    });
  });
});
