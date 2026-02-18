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
import { generateConceptIdeas, parseConceptIdeationResponse } from '../../../src/llm/concept-ideator';
import { buildConceptIdeatorPrompt } from '../../../src/llm/prompts/concept-ideator-prompt';
import { CONCEPT_IDEATION_SCHEMA } from '../../../src/llm/schemas/concept-ideator-schema';

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
  conflictType: 'PERSON_VS_SOCIETY';
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
    conflictType: 'PERSON_VS_SOCIETY',
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

function createValidPayload(): { concepts: ReturnType<typeof createValidConcept>[] } {
  return {
    concepts: Array.from({ length: 6 }, (_, index) => createValidConcept(index + 1)),
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
    id: 'or-concept-1',
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

describe('concept-ideator', () => {
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

  it('parseConceptIdeationResponse returns ConceptSpec[] for valid payload', () => {
    const parsed = parseConceptIdeationResponse(createValidPayload());
    expect(parsed).toHaveLength(6);
    expect(parsed[0]?.genreFrame).toBe('NOIR');
    expect(parsed[0]?.actionVerbs).toHaveLength(6);
  });

  it('parseConceptIdeationResponse rejects missing concepts array', () => {
    expect(() => parseConceptIdeationResponse({})).toThrow('missing concepts array');
  });

  it('parseConceptIdeationResponse rejects invalid enum values', () => {
    const payload = createValidPayload();
    (payload.concepts[0] as Record<string, unknown>)['genreFrame'] = 'INVALID';
    expect(() => parseConceptIdeationResponse(payload)).toThrow('invalid genreFrame');
  });

  it('parseConceptIdeationResponse rejects empty actionVerbs', () => {
    const payload = createValidPayload();
    (payload.concepts[0] as Record<string, unknown>)['actionVerbs'] = [];
    expect(() => parseConceptIdeationResponse(payload)).toThrow('actionVerbs must contain 6+ items');
  });

  it('parseConceptIdeationResponse rejects concept counts outside 6-8', () => {
    const payload = createValidPayload();
    payload.concepts = payload.concepts.slice(0, 5);
    expect(() => parseConceptIdeationResponse(payload)).toThrow('must include 6-8 concepts');
  });

  it('buildConceptIdeatorPrompt includes all seed fields when provided', () => {
    const messages = buildConceptIdeatorPrompt({
      genreVibes: 'sci-fi noir',
      moodKeywords: 'tense, paranoid',
      thematicInterests: 'identity and memory',
      sparkLine: 'What if memory could be taxed?',
      contentPreferences: 'No explicit sexual violence',
    });

    expect(messages).toHaveLength(2);
    const systemMessage = messages[0]?.content ?? '';
    const userMessage = messages[1]?.content ?? '';

    expect(systemMessage).toContain(CONTENT_POLICY);
    expect(systemMessage).toContain('TAXONOMY GUIDANCE');
    expect(userMessage).toContain('GENRE VIBES');
    expect(userMessage).toContain('MOOD KEYWORDS');
    expect(userMessage).toContain('THEMATIC INTERESTS');
    expect(userMessage).toContain('SPARK LINE');
    expect(userMessage).toContain('CONTENT PREFERENCES');
  });

  it('buildConceptIdeatorPrompt omits empty seed fields', () => {
    const messages = buildConceptIdeatorPrompt({
      genreVibes: '   ',
      moodKeywords: undefined,
      thematicInterests: '',
      sparkLine: '  ',
      contentPreferences: undefined,
    });
    const userMessage = messages[1]?.content ?? '';

    expect(userMessage).not.toContain('GENRE VIBES');
    expect(userMessage).not.toContain('MOOD KEYWORDS');
    expect(userMessage).not.toContain('THEMATIC INTERESTS');
    expect(userMessage).not.toContain('SPARK LINE');
    expect(userMessage).not.toContain('CONTENT PREFERENCES');
  });

  it('buildConceptIdeatorPrompt includes content policy', () => {
    const messages = buildConceptIdeatorPrompt({});
    expect(messages[0]?.content).toContain(CONTENT_POLICY);
  });

  it('generateConceptIdeas returns parsed ideation result', async () => {
    const payload = createValidPayload();
    const rawContent = JSON.stringify(payload);
    fetchMock.mockResolvedValue(responseWithMessageContent(rawContent));

    const result = await generateConceptIdeas({ genreVibes: 'noir' }, 'test-api-key');

    expect(result.rawResponse).toBe(rawContent);
    expect(result.concepts).toHaveLength(6);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const requestBody = getRequestBody();
    expect(requestBody['response_format']).toEqual(CONCEPT_IDEATION_SCHEMA);
    expect(mockLogPrompt).toHaveBeenCalledWith(mockLogger, 'conceptIdeator', expect.any(Array));
    expect(mockLogPrompt).toHaveBeenCalledTimes(1);
  });

  it.each([429, 503])(
    'generateConceptIdeas handles HTTP %i as retryable LLMError',
    async (statusCode) => {
      fetchMock.mockResolvedValue(createErrorResponse(statusCode, 'Server overloaded'));

      const pending = generateConceptIdeas({}, 'test-api-key');
      const expectation = expect(pending).rejects.toMatchObject({
        code: `HTTP_${statusCode}`,
        retryable: true,
      });

      await advanceRetryDelays();
      await expectation;

      expect(fetchMock).toHaveBeenCalledTimes(3);
    },
  );
});
