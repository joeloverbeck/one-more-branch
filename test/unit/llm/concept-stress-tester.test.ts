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

import { parseConceptStressTestResponse, stressTestConcept } from '../../../src/llm/concept-stress-tester';
import { buildConceptStressTesterPrompt } from '../../../src/llm/prompts/concept-stress-tester-prompt';
import { CONCEPT_STRESS_TEST_SCHEMA } from '../../../src/llm/schemas/concept-stress-tester-schema';
import type { ConceptSpec, ConceptStressTesterContext } from '../../../src/models';
import type { ContentPacket } from '../../../src/models/content-packet';
import { createConceptSpecFixture } from '../../fixtures/concept-generator';

function createContentPacket(id: string): ContentPacket {
  return {
    contentId: id,
    sourceSparkIds: ['spark_1'],
    contentKind: 'ENTITY',
    coreAnomaly: `Test anomaly ${id}`,
    humanAnchor: `Test anchor ${id}`,
    socialEngine: `Test engine ${id}`,
    choicePressure: `Test pressure ${id}`,
    signatureImage: `Test image ${id}`,
    escalationPath: `Test escalation ${id}`,
    wildnessInvariant: `The ${id} invariant must never be sanded off`,
    dullCollapse: `Without the invariant, this becomes a generic ${id} story`,
    interactionVerbs: ['examine', 'exploit', 'resist'],
  };
}

function createValidConcept(index: number): ConceptSpec {
  return createConceptSpecFixture(index);
}

function createContext(): ConceptStressTesterContext {
  return {
    concept: createValidConcept(1),
    scores: {
      hookStrength: 2,
      conflictEngine: 4,
      agencyBreadth: 2,
      noveltyLeverage: 1,
      llmFeasibility: 2,
      ironicPremise: 3,
      sceneGenerativePower: 3,
      contentCharge: 2,
    },
    weaknesses: ['Weak pressure loop enforcement', 'State drift likely in long scenes'],
  };
}

function createValidPayload(): {
  hardenedConcept: ReturnType<typeof createValidConcept>;
  driftRisks: Array<{ risk: string; mitigation: string; mitigationType: 'STATE_CONSTRAINT' }>;
  playerBreaks: Array<{ scenario: string; handling: string; constraintUsed: string }>;
} {
  return {
    hardenedConcept: createValidConcept(2),
    driftRisks: [
      {
        risk: 'LLM forgets institutional retaliation escalation.',
        mitigation: 'Track a visible retaliation clock tied to institution response.',
        mitigationType: 'STATE_CONSTRAINT',
      },
    ],
    playerBreaks: [
      {
        scenario: 'Player repeatedly avoids mission-critical interactions.',
        handling: 'Escalate external pressure that forces engagement within two scenes.',
        constraintUsed: 'Deadline mechanism',
      },
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
    id: 'or-concept-stress-1',
    choices: [{ message: { content }, finish_reason: 'stop' }],
  });
}

describe('concept-stress-tester', () => {
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

  it('parseConceptStressTestResponse with valid data returns complete result', () => {
    const parsed = parseConceptStressTestResponse(createValidPayload());
    expect(parsed.hardenedConcept.genreFrame).toBe('NOIR');
    expect(parsed.driftRisks).toHaveLength(1);
    expect(parsed.playerBreaks).toHaveLength(1);
  });

  it('parseConceptStressTestResponse validates hardenedConcept enums', () => {
    const payload = createValidPayload();
    (payload.hardenedConcept as Record<string, unknown>)['genreFrame'] = 'INVALID';
    expect(() => parseConceptStressTestResponse(payload)).toThrow('invalid genreFrame');
  });

  it('parseConceptStressTestResponse validates driftRisk mitigationType', () => {
    const payload = createValidPayload();
    (payload.driftRisks[0] as Record<string, unknown>)['mitigationType'] = 'INVALID';
    expect(() => parseConceptStressTestResponse(payload)).toThrow('invalid mitigationType');
  });

  it('stress tester schema mitigationType enum includes WILDNESS_INVARIANT', () => {
    const schema = CONCEPT_STRESS_TEST_SCHEMA.json_schema.schema as Record<string, unknown>;
    const properties = schema['properties'] as Record<string, unknown>;
    const driftRisks = properties['driftRisks'] as Record<string, unknown>;
    const items = driftRisks['items'] as Record<string, unknown>;
    const itemProps = items['properties'] as Record<string, unknown>;
    const mitigationType = itemProps['mitigationType'] as Record<string, unknown>;
    const enumValues = mitigationType['enum'] as string[];

    expect(enumValues).toContain('WILDNESS_INVARIANT');
  });

  it('parseConceptStressTestResponse accepts WILDNESS_INVARIANT mitigationType', () => {
    const payload = createValidPayload();
    (payload.driftRisks[0] as Record<string, unknown>)['mitigationType'] = 'WILDNESS_INVARIANT';
    const result = parseConceptStressTestResponse(payload);
    expect(result.driftRisks[0].mitigationType).toBe('WILDNESS_INVARIANT');
  });

  it('parseConceptStressTestResponse rejects empty driftRisks', () => {
    const payload = createValidPayload();
    payload.driftRisks = [];
    expect(() => parseConceptStressTestResponse(payload)).toThrow('non-empty driftRisks');
  });

  it('parseConceptStressTestResponse rejects empty playerBreaks', () => {
    const payload = createValidPayload();
    payload.playerBreaks = [];
    expect(() => parseConceptStressTestResponse(payload)).toThrow('non-empty playerBreaks');
  });

  it('buildConceptStressTesterPrompt includes weak dimensions', () => {
    const messages = buildConceptStressTesterPrompt(createContext());
    const systemMessage = messages[0]?.content ?? '';

    expect(systemMessage).toContain('hookStrength');
    expect(systemMessage).toContain('agencyBreadth');
    expect(systemMessage).toContain('noveltyLeverage');
    expect(systemMessage).toContain('llmFeasibility');
  });

  it('buildConceptStressTesterPrompt includes adversarial directives', () => {
    const messages = buildConceptStressTesterPrompt(createContext());
    const systemMessage = messages[0]?.content ?? '';

    expect(systemMessage).toContain('adversarial story architect');
    expect(systemMessage).toContain('Drift analysis');
    expect(systemMessage).toContain('Player-break analysis');
  });

  it('stressTestConcept with mocked fetch returns parsed result', async () => {
    const payload = createValidPayload();
    const rawContent = JSON.stringify(payload);
    fetchMock.mockResolvedValue(responseWithMessageContent(rawContent));

    const result = await stressTestConcept(createContext(), 'test-api-key');

    expect(result.rawResponse).toBe(rawContent);
    expect(result.hardenedConcept.oneLineHook).toBe('Hook 2');
    expect(result.driftRisks).toHaveLength(1);
    expect(result.playerBreaks).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const requestBody = getRequestBody();
    expect(requestBody['response_format']).toEqual(CONCEPT_STRESS_TEST_SCHEMA);
    expect(mockLogPrompt).toHaveBeenCalledWith(mockLogger, 'conceptStressTester', expect.any(Array));
    expect(mockLogPrompt).toHaveBeenCalledTimes(1);
  });

  it('ConceptStressTesterContext accepts contentPackets field', () => {
    const context: ConceptStressTesterContext = {
      ...createContext(),
      contentPackets: [createContentPacket('cp_1')],
    };
    expect(context.contentPackets).toHaveLength(1);
    expect(context.contentPackets![0].wildnessInvariant).toContain('cp_1');
  });

  it('buildConceptStressTesterPrompt includes WILDNESS INVARIANT section when content packets provided', () => {
    const context: ConceptStressTesterContext = {
      ...createContext(),
      contentPackets: [createContentPacket('cp_1'), createContentPacket('cp_2')],
    };
    const messages = buildConceptStressTesterPrompt(context);
    const userMessage = messages[1]?.content ?? '';

    expect(userMessage).toContain('WILDNESS INVARIANT EROSION CHECK');
    expect(userMessage).toContain('cp_1');
    expect(userMessage).toContain('cp_2');
  });

  it('buildConceptStressTesterPrompt includes dull-collapse comparison instructions when content packets provided', () => {
    const context: ConceptStressTesterContext = {
      ...createContext(),
      contentPackets: [createContentPacket('cp_1')],
    };
    const messages = buildConceptStressTesterPrompt(context);
    const userMessage = messages[1]?.content ?? '';

    expect(userMessage).toContain('dullCollapse');
    expect(userMessage).toContain('genericCollapse');
    expect(userMessage).toContain('Without the invariant');
  });

  it('buildConceptStressTesterPrompt omits both sections when content packets undefined', () => {
    const messages = buildConceptStressTesterPrompt(createContext());
    const userMessage = messages[1]?.content ?? '';

    expect(userMessage).not.toContain('WILDNESS INVARIANT');
    expect(userMessage).not.toContain('dullCollapse');
  });

  it('prompt instructs LLM to flag invariant erosion as a drift risk with WILDNESS_INVARIANT mitigation type', () => {
    const context: ConceptStressTesterContext = {
      ...createContext(),
      contentPackets: [createContentPacket('cp_1')],
    };
    const messages = buildConceptStressTesterPrompt(context);
    const userMessage = messages[1]?.content ?? '';

    expect(userMessage).toContain('mitigationType "WILDNESS_INVARIANT"');
  });

  it('prompt instructs LLM to compare dullCollapse against genericCollapse', () => {
    const context: ConceptStressTesterContext = {
      ...createContext(),
      contentPackets: [createContentPacket('cp_1')],
    };
    const messages = buildConceptStressTesterPrompt(context);
    const userMessage = messages[1]?.content ?? '';

    expect(userMessage).toContain("Compare each packet's dullCollapse against the verification's genericCollapse");
  });

  it('stressTestConcept passes content packets through to prompt builder', async () => {
    const payload = createValidPayload();
    const rawContent = JSON.stringify(payload);
    fetchMock.mockResolvedValue(responseWithMessageContent(rawContent));

    const context: ConceptStressTesterContext = {
      ...createContext(),
      contentPackets: [createContentPacket('cp_1')],
    };
    await stressTestConcept(context, 'test-api-key');

    const requestBody = getRequestBody();
    const messages = requestBody['messages'] as Array<{ role: string; content: string }>;
    const userMessage = messages.find((m) => m.role === 'user')?.content ?? '';

    expect(userMessage).toContain('WILDNESS INVARIANT EROSION CHECK');
    expect(userMessage).toContain('cp_1');
  });

  it('existing stress tester calls without contentPackets produce identical results', async () => {
    const payload = createValidPayload();
    const rawContent = JSON.stringify(payload);
    fetchMock.mockResolvedValue(responseWithMessageContent(rawContent));

    const result = await stressTestConcept(createContext(), 'test-api-key');

    expect(result.hardenedConcept).toBeDefined();
    expect(result.driftRisks).toHaveLength(1);
    expect(result.playerBreaks).toHaveLength(1);

    const requestBody = getRequestBody();
    const messages = requestBody['messages'] as Array<{ role: string; content: string }>;
    const userMessage = messages.find((m) => m.role === 'user')?.content ?? '';

    expect(userMessage).not.toContain('WILDNESS INVARIANT');
  });

  it('prompt OUTPUT REQUIREMENTS includes WILDNESS_INVARIANT in valid mitigationType list', () => {
    const messages = buildConceptStressTesterPrompt(createContext());
    const userMessage = messages[1]?.content ?? '';

    expect(userMessage).toContain('WILDNESS_INVARIANT');
    expect(userMessage).toContain('mitigationType must be one of');
  });

  it('buildConceptStressTesterPrompt omits wildness section for empty content packets array', () => {
    const context: ConceptStressTesterContext = {
      ...createContext(),
      contentPackets: [],
    };
    const messages = buildConceptStressTesterPrompt(context);
    const userMessage = messages[1]?.content ?? '';

    expect(userMessage).not.toContain('WILDNESS INVARIANT EROSION CHECK');
  });
});
