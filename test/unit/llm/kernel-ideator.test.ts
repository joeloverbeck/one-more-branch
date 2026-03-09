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

import { CONTENT_POLICY } from '../../../src/llm/content-policy';
import { generateKernels, parseKernelIdeationResponse } from '../../../src/llm/kernel-ideator';
import { buildKernelIdeatorPrompt } from '../../../src/llm/prompts/kernel-ideator-prompt';
import { KERNEL_IDEATION_SCHEMA } from '../../../src/llm/schemas/kernel-ideator-schema';
import type { StoryKernel } from '../../../src/models';

const CONFLICT_AXES = [
  'INDIVIDUAL_VS_SYSTEM',
  'TRUTH_VS_STABILITY',
  'DUTY_VS_DESIRE',
  'FREEDOM_VS_SAFETY',
  'KNOWLEDGE_VS_INNOCENCE',
  'POWER_VS_MORALITY',
  'LOYALTY_VS_SURVIVAL',
  'IDENTITY_VS_BELONGING',
] as const;

const DRAMATIC_STANCES = ['COMIC', 'ROMANTIC', 'TRAGIC', 'IRONIC'] as const;

function createValidKernel(index: number): StoryKernel {
  return {
    dramaticThesis: `Kernel thesis ${index}`,
    antithesis: `Kernel antithesis ${index}`,
    valueAtStake: `Value ${index}`,
    opposingForce: `Opposing force ${index}`,
    directionOfChange: index % 3 === 0 ? 'NEGATIVE' : index % 2 === 0 ? 'IRONIC' : 'POSITIVE',
    conflictAxis: CONFLICT_AXES[(index - 1) % CONFLICT_AXES.length],
    dramaticStance: DRAMATIC_STANCES[(index - 1) % DRAMATIC_STANCES.length],
    thematicQuestion: `Question ${index}?`,
    moralArgument: 'Test moral argument',
    valueSpectrum: {
      positive: 'Love',
      contrary: 'Indifference',
      contradictory: 'Hate',
      negationOfNegation: 'Self-destruction through love',
    },
  };
}

function createValidPayload(count = 6): { kernels: StoryKernel[] } {
  return {
    kernels: Array.from({ length: count }, (_, index) => createValidKernel(index + 1)),
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
    id: 'or-kernel-1',
    choices: [{ message: { content }, finish_reason: 'stop' }],
  });
}

function createErrorResponse(status: number, message: string): Response {
  return {
    ok: false,
    status,
    json: jest.fn(),
    text: jest.fn().mockResolvedValue(message),
  } as unknown as Response;
}

async function advanceRetryDelays(): Promise<void> {
  await jest.advanceTimersByTimeAsync(1000);
  await jest.advanceTimersByTimeAsync(2000);
}

describe('kernel-ideator', () => {
  const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock.mockReset();
    mockLogPrompt.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.useRealTimers();
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

  it('parseKernelIdeationResponse returns StoryKernel[] for valid payload', () => {
    const parsed = parseKernelIdeationResponse(createValidPayload());
    expect(parsed).toHaveLength(6);
    expect(parsed[0]?.directionOfChange).toBe('POSITIVE');
  });

  it('parseKernelIdeationResponse rejects missing kernels array', () => {
    expect(() => parseKernelIdeationResponse({})).toThrow('missing kernels array');
  });

  it('parseKernelIdeationResponse rejects kernel counts outside 6-8', () => {
    expect(() => parseKernelIdeationResponse(createValidPayload(5))).toThrow('must include 6-8 kernels');
    expect(() => parseKernelIdeationResponse(createValidPayload(9))).toThrow('must include 6-8 kernels');
  });

  it('parseKernelIdeationResponse rejects invalid kernel objects', () => {
    const payload = createValidPayload();
    (payload.kernels[0] as unknown as Record<string, unknown>)['directionOfChange'] = 'INVALID';

    expect(() => parseKernelIdeationResponse(payload)).toThrow('invalid kernel at index 0');
  });

  it('buildKernelIdeatorPrompt includes system sections', () => {
    const messages = buildKernelIdeatorPrompt({
      thematicInterests: 'identity and loyalty',
      emotionalCore: 'grief and resentment',
      sparkLine: 'A protector becomes the threat',
    });

    expect(messages).toHaveLength(2);
    const systemMessage = messages[0]?.content ?? '';

    expect(systemMessage).toContain('dramatic theorist');
    expect(systemMessage).toContain(CONTENT_POLICY);
    expect(systemMessage).toContain('DIVERSITY CONSTRAINTS');
    expect(systemMessage).toContain('DIRECTION OF CHANGE TAXONOMY');
    expect(systemMessage).toContain('Do not include genre framing');
    expect(systemMessage).toContain('Do not include setting/world details');
    expect(systemMessage).toContain('Do not include named characters');
    expect(systemMessage).toContain('Do not include plot beats');
    expect(systemMessage).toContain('strongest credible counter-argument');
    expect(systemMessage).toContain(
      'CRITICAL: Diversity means different dramatic propositions',
    );
  });

  it('buildKernelIdeatorPrompt includes USER CREATIVE MANDATE when seeds provided', () => {
    const messages = buildKernelIdeatorPrompt({
      thematicInterests: 'identity and loyalty',
      emotionalCore: 'grief and resentment',
      sparkLine: 'A protector becomes the threat',
    });

    const userMessage = messages[1]?.content ?? '';

    expect(userMessage).toContain('USER CREATIVE MANDATE');
    expect(userMessage).toContain('Thematic Interests: identity and loyalty');
    expect(userMessage).toContain('Emotional Core: grief and resentment');
    expect(userMessage).toContain('Spark Line: A protector becomes the threat');
    expect(userMessage).toContain('non-negotiable');
  });

  it('buildKernelIdeatorPrompt omits mandate block when no seeds and includes fallback', () => {
    const messages = buildKernelIdeatorPrompt({
      thematicInterests: '   ',
      emotionalCore: undefined,
      sparkLine: '',
    });
    const userMessage = messages[1]?.content ?? '';

    expect(userMessage).not.toContain('USER CREATIVE MANDATE');
    expect(userMessage).toContain('universal human themes');
  });

  it('buildKernelIdeatorPrompt includes partial seeds in mandate block', () => {
    const messages = buildKernelIdeatorPrompt({
      thematicInterests: 'identity',
      emotionalCore: undefined,
      sparkLine: '',
    });
    const userMessage = messages[1]?.content ?? '';

    expect(userMessage).toContain('USER CREATIVE MANDATE');
    expect(userMessage).toContain('Thematic Interests: identity');
    expect(userMessage).not.toContain('Emotional Core');
    expect(userMessage).not.toContain('Spark Line');
  });

  it('generateKernels returns parsed ideation result', async () => {
    const payload = createValidPayload();
    const rawContent = JSON.stringify(payload);
    fetchMock.mockResolvedValue(responseWithMessageContent(rawContent));

    const result = await generateKernels({ thematicInterests: 'trust' }, 'test-api-key');

    expect(result.rawResponse).toBe(rawContent);
    expect(result.kernels).toHaveLength(6);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const requestBody = getRequestBody();
    expect(requestBody['response_format']).toEqual(KERNEL_IDEATION_SCHEMA);
    expect(mockLogPrompt).toHaveBeenCalledWith(mockLogger, 'kernelIdeator', expect.any(Array));
    expect(mockLogPrompt).toHaveBeenCalledTimes(1);
  });

  it.each([429, 503])('generateKernels handles HTTP %i as retryable LLMError', async (statusCode) => {
    fetchMock.mockResolvedValue(createErrorResponse(statusCode, 'Server overloaded'));

    const pending = generateKernels({}, 'test-api-key');
    const expectation = expect(pending).rejects.toMatchObject({
      code: `HTTP_${statusCode}`,
      retryable: true,
    });

    await advanceRetryDelays();
    await expectation;

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
