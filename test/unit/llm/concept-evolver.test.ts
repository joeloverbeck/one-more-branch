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
import { evolveConceptIdeas, parseConceptEvolutionResponse } from '../../../src/llm/concept-evolver';
import { buildConceptEvolverPrompt } from '../../../src/llm/prompts/concept-evolver-prompt';
import { CONCEPT_EVOLUTION_SCHEMA } from '../../../src/llm/schemas/concept-evolver-schema';
import type { ConceptEvolverContext, ConceptSpec, ConflictAxis, GenreFrame } from '../../../src/models';
import { createConceptSpecFixture, createEvaluatedConceptFixture } from '../../fixtures/concept-generator';

function createEvolvedConcept(
  index: number,
  genreFrame: GenreFrame,
  conflictAxis: ConflictAxis,
): ConceptSpec {
  return {
    ...createConceptSpecFixture(index),
    genreFrame,
    conflictAxis,
  };
}

function createValidPayload(): { concepts: ConceptSpec[] } {
  const genreFrames: GenreFrame[] = ['NOIR', 'SCI_FI', 'FANTASY', 'THRILLER', 'DRAMA', 'GOTHIC'];
  const conflictAxes: ConflictAxis[] = [
    'TRUTH_VS_STABILITY',
    'INDIVIDUAL_VS_SYSTEM',
    'POWER_VS_MORALITY',
    'DUTY_VS_DESIRE',
    'FREEDOM_VS_SAFETY',
    'IDENTITY_VS_BELONGING',
  ];

  return {
    concepts: Array.from({ length: 6 }, (_, index) =>
      createEvolvedConcept(index + 1, genreFrames[index], conflictAxes[index]),
    ),
  };
}

function createContext(): ConceptEvolverContext {
  return {
    kernel: {
      dramaticThesis: 'Control corrodes trust',
      valueAtStake: 'Trust',
      opposingForce: 'Fear of uncertainty',
      directionOfChange: 'IRONIC',
      thematicQuestion: 'Can safety exist without control?',
    },
    parentConcepts: [createEvaluatedConceptFixture(1), createEvaluatedConceptFixture(2)],
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

describe('concept-evolver', () => {
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

  describe('parseConceptEvolutionResponse', () => {
    it('returns ConceptSpec[] for valid payload', () => {
      const parsed = parseConceptEvolutionResponse(createValidPayload());
      expect(parsed).toHaveLength(6);
      expect(parsed[0]?.genreFrame).toBe('NOIR');
    });

    it('rejects missing concepts array', () => {
      expect(() => parseConceptEvolutionResponse({})).toThrow('missing concepts array');
    });

    it('rejects responses with non-6 count', () => {
      const payload = createValidPayload();
      payload.concepts = payload.concepts.slice(0, 5);
      expect(() => parseConceptEvolutionResponse(payload)).toThrow('exactly 6 concepts');
    });

    it('rejects duplicate genreFrame+conflictAxis pairs', () => {
      const payload = createValidPayload();
      payload.concepts[5] = {
        ...payload.concepts[5],
        genreFrame: payload.concepts[0].genreFrame,
        conflictAxis: payload.concepts[0].conflictAxis,
      };

      expect(() => parseConceptEvolutionResponse(payload)).toThrow(
        'duplicate genreFrame+conflictAxis pair',
      );
    });

    it('reuses concept spec parser validation', () => {
      const payload = createValidPayload();
      (payload.concepts[0] as Record<string, unknown>)['genreFrame'] = 'INVALID';
      expect(() => parseConceptEvolutionResponse(payload)).toThrow('invalid genreFrame');
    });
  });

  describe('buildConceptEvolverPrompt', () => {
    it('includes kernel and parent evaluation data', () => {
      const context = createContext();
      const messages = buildConceptEvolverPrompt(context);
      expect(messages).toHaveLength(2);

      const systemMessage = messages[0]?.content ?? '';
      const userMessage = messages[1]?.content ?? '';
      expect(systemMessage).toContain(CONTENT_POLICY);
      expect(systemMessage).toContain('MUTATION STRATEGIES');
      expect(systemMessage).toContain('DIVERSITY CONSTRAINTS');
      expect(userMessage).toContain('STORY KERNEL');
      expect(userMessage).toContain('dramaticThesis: Control corrodes trust');
      expect(userMessage).toContain('"strengths"');
      expect(userMessage).toContain('"weaknesses"');
      expect(userMessage).toContain('"tradeoffSummary"');
    });
  });

  describe('evolveConceptIdeas', () => {
    it('sends request and returns parsed result', async () => {
      const payload = createValidPayload();
      const rawContent = JSON.stringify(payload);
      fetchMock.mockResolvedValue(responseWithMessageContent(rawContent));

      const result = await evolveConceptIdeas(createContext(), 'test-api-key');

      expect(result.rawResponse).toBe(rawContent);
      expect(result.concepts).toHaveLength(6);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const requestBody = getRequestBody();
      expect(requestBody['response_format']).toEqual(CONCEPT_EVOLUTION_SCHEMA);
      expect(mockLogPrompt).toHaveBeenCalledWith(mockLogger, 'conceptEvolver', expect.any(Array));
      expect(mockLogPrompt).toHaveBeenCalledTimes(1);
    });
  });
});
