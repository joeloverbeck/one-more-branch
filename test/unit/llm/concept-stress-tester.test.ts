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
import type { ConceptStressTesterContext } from '../../../src/models';

function createValidConcept(index: number): {
  oneLineHook: string;
  elevatorParagraph: string;
  genreFrame: 'NOIR';
  genreSubversion: string;
  protagonistRole: string;
  coreCompetence: string;
  coreFlaw: string;
  actionVerbs: readonly string[];
  coreConflictLoop: string;
  conflictAxis: 'TRUTH_VS_STABILITY';
  pressureSource: string;
  stakesPersonal: string;
  stakesSystemic: string;
  deadlineMechanism: string;
  settingAxioms: readonly string[];
  constraintSet: readonly string[];
  keyInstitutions: readonly string[];
  settingScale: 'LOCAL';
  branchingPosture: 'RECONVERGE';
  stateComplexity: 'MEDIUM';
} {
  return {
    oneLineHook: `Hook ${index}`,
    elevatorParagraph: `Elevator paragraph ${index}`,
    genreFrame: 'NOIR',
    genreSubversion: `Subversion ${index}`,
    protagonistRole: `Role ${index}`,
    coreCompetence: `Competence ${index}`,
    coreFlaw: `Flaw ${index}`,
    actionVerbs: ['negotiate', 'investigate', 'sabotage', 'deceive', 'protect', 'infiltrate'],
    coreConflictLoop: `Conflict loop ${index}`,
    conflictAxis: 'TRUTH_VS_STABILITY',
    pressureSource: `Pressure ${index}`,
    stakesPersonal: `Personal stakes ${index}`,
    stakesSystemic: `Systemic stakes ${index}`,
    deadlineMechanism: `Deadline ${index}`,
    settingAxioms: ['Axiom 1', 'Axiom 2'],
    constraintSet: ['Constraint 1', 'Constraint 2', 'Constraint 3'],
    keyInstitutions: ['Institution 1', 'Institution 2'],
    settingScale: 'LOCAL',
    branchingPosture: 'RECONVERGE',
    stateComplexity: 'MEDIUM',
  } as const;
}

function createContext(): ConceptStressTesterContext {
  return {
    concept: createValidConcept(1),
    scores: {
      hookStrength: 2,
      conflictEngine: 4,
      agencyBreadth: 2,
      noveltyLeverage: 1,
      branchingFitness: 3,
      llmFeasibility: 2,
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
});
