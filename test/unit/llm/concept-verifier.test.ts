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

import { parseConceptVerificationResponse, verifyConcepts } from '../../../src/llm/concept-verifier';
import { CONCEPT_VERIFIER_SCHEMA } from '../../../src/llm/schemas/concept-verifier-schema';
import type { ConceptVerifierContext } from '../../../src/models';
import type { StoryKernel } from '../../../src/models/story-kernel';
import {
  createEvaluatedConceptFixture,
  createConceptVerificationFixture,
} from '../../fixtures/concept-generator';

function createStoryKernel(): StoryKernel {
  return {
    dramaticThesis: 'Control destroys trust',
    valueAtStake: 'Trust',
    opposingForce: 'Fear of uncertainty',
    directionOfChange: 'IRONIC',
    thematicQuestion: 'Can safety exist without control?',
  antithesis: 'Counter-argument challenges the thesis.',
  };
}

function createContext(count = 2): ConceptVerifierContext {
  return {
    evaluatedConcepts: Array.from({ length: count }, (_, i) =>
      createEvaluatedConceptFixture(i + 1),
    ),
    kernel: createStoryKernel(),
  };
}

function expectedIds(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `concept_${i + 1}`);
}

function createValidPayload(count = 2): { verifications: ReturnType<typeof createVerificationData>[] } {
  return {
    verifications: Array.from({ length: count }, (_, i) => createVerificationData(i + 1)),
  };
}

function createVerificationData(index = 1): {
  conceptId: string;
  signatureScenario: string;
  escalatingSetpieces: string[];
  inevitabilityStatement: string;
  loadBearingCheck: { passes: boolean; reasoning: string; genericCollapse: string };
  kernelFidelityCheck: { passes: boolean; reasoning: string; kernelDrift: string };
  conceptIntegrityScore: number;
} {
  return {
    conceptId: `concept_${index}`,
    signatureScenario: `Signature scenario ${index}`,
    escalatingSetpieces: [
      `Setpiece 1-${index}`,
      `Setpiece 2-${index}`,
      `Setpiece 3-${index}`,
      `Setpiece 4-${index}`,
      `Setpiece 5-${index}`,
      `Setpiece 6-${index}`,
    ],
    inevitabilityStatement: `Inevitability ${index}`,
    loadBearingCheck: {
      passes: true,
      reasoning: `Reasoning ${index}`,
      genericCollapse: `Collapse ${index}`,
    },
    kernelFidelityCheck: {
      passes: true,
      reasoning: `Kernel reasoning ${index}`,
      kernelDrift: `Kernel drift ${index}`,
    },
    conceptIntegrityScore: 85,
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
    id: 'or-concept-verify-1',
    choices: [{ message: { content }, finish_reason: 'stop' }],
  });
}

describe('concept-verifier', () => {
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

  describe('parseConceptVerificationResponse', () => {
    it('parses valid response with correct concept IDs', () => {
      const payload = createValidPayload(2);
      const result = parseConceptVerificationResponse(payload, expectedIds(2));

      expect(result).toHaveLength(2);
      expect(result[0].conceptId).toBe('concept_1');
      expect(result[0].signatureScenario).toBe('Signature scenario 1');
      expect(result[0].escalatingSetpieces).toHaveLength(6);
      expect(result[0].inevitabilityStatement).toBe('Inevitability 1');
      expect(result[0].loadBearingCheck.passes).toBe(true);
      expect(result[0].loadBearingCheck.reasoning).toBe('Reasoning 1');
      expect(result[0].loadBearingCheck.genericCollapse).toBe('Collapse 1');
      expect(result[0].kernelFidelityCheck?.passes).toBe(true);
      expect(result[0].kernelFidelityCheck?.reasoning).toBe('Kernel reasoning 1');
      expect(result[0].kernelFidelityCheck?.kernelDrift).toBe('Kernel drift 1');
      expect(result[0].conceptIntegrityScore).toBe(85);
      expect(result[1].conceptId).toBe('concept_2');
    });

    it('parses reordered output correctly when conceptIds match', () => {
      const payload = createValidPayload(2);
      payload.verifications.reverse();

      const result = parseConceptVerificationResponse(payload, expectedIds(2));

      expect(result).toHaveLength(2);
      expect(result[0].conceptId).toBe('concept_2');
      expect(result[1].conceptId).toBe('concept_1');
    });

    it('clamps score above 100 to 100', () => {
      const payload = createValidPayload(1);
      payload.verifications[0].conceptIntegrityScore = 150;

      const result = parseConceptVerificationResponse(payload, expectedIds(1));
      expect(result[0].conceptIntegrityScore).toBe(100);
    });

    it('clamps negative score to 0', () => {
      const payload = createValidPayload(1);
      payload.verifications[0].conceptIntegrityScore = -10;

      const result = parseConceptVerificationResponse(payload, expectedIds(1));
      expect(result[0].conceptIntegrityScore).toBe(0);
    });

    it('rounds fractional scores', () => {
      const payload = createValidPayload(1);
      payload.verifications[0].conceptIntegrityScore = 72.6;

      const result = parseConceptVerificationResponse(payload, expectedIds(1));
      expect(result[0].conceptIntegrityScore).toBe(73);
    });

    it('rejects non-object response', () => {
      expect(() => parseConceptVerificationResponse('invalid', expectedIds(1))).toThrow(
        'must be an object',
      );
    });

    it('rejects null response', () => {
      expect(() => parseConceptVerificationResponse(null, expectedIds(1))).toThrow(
        'must be an object',
      );
    });

    it('rejects missing verifications array', () => {
      expect(() => parseConceptVerificationResponse({}, expectedIds(1))).toThrow(
        'missing verifications array',
      );
    });

    it('rejects count mismatch', () => {
      const payload = createValidPayload(2);
      expect(() => parseConceptVerificationResponse(payload, expectedIds(3))).toThrow(
        'exactly 3 verifications (received: 2)',
      );
    });

    it('rejects non-object verification item', () => {
      expect(() =>
        parseConceptVerificationResponse({ verifications: ['bad'] }, expectedIds(1)),
      ).toThrow('Verification 1 must be an object');
    });

    it('rejects missing conceptId', () => {
      const payload = createValidPayload(1);
      delete (payload.verifications[0] as Record<string, unknown>)['conceptId'];

      expect(() => parseConceptVerificationResponse(payload, expectedIds(1))).toThrow(
        'invalid conceptId',
      );
    });

    it('rejects empty conceptId', () => {
      const payload = createValidPayload(1);
      payload.verifications[0].conceptId = '   ';

      expect(() => parseConceptVerificationResponse(payload, expectedIds(1))).toThrow(
        'invalid conceptId',
      );
    });

    it('rejects unknown conceptId', () => {
      const payload = createValidPayload(1);
      payload.verifications[0].conceptId = 'concept_999';

      expect(() => parseConceptVerificationResponse(payload, expectedIds(1))).toThrow(
        'concept set does not match requested candidates',
      );
    });

    it('rejects duplicate conceptIds', () => {
      const payload = createValidPayload(2);
      payload.verifications[1].conceptId = 'concept_1';

      expect(() => parseConceptVerificationResponse(payload, expectedIds(2))).toThrow(
        'duplicate conceptIds',
      );
    });

    it('rejects empty signatureScenario', () => {
      const payload = createValidPayload(1);
      payload.verifications[0].signatureScenario = '   ';

      expect(() => parseConceptVerificationResponse(payload, expectedIds(1))).toThrow(
        'invalid signatureScenario',
      );
    });

    it('rejects empty inevitabilityStatement', () => {
      const payload = createValidPayload(1);
      payload.verifications[0].inevitabilityStatement = '';

      expect(() => parseConceptVerificationResponse(payload, expectedIds(1))).toThrow(
        'invalid inevitabilityStatement',
      );
    });

    it('rejects non-array escalatingSetpieces', () => {
      const payload = createValidPayload(1);
      (payload.verifications[0] as Record<string, unknown>)['escalatingSetpieces'] = 'not-array';

      expect(() => parseConceptVerificationResponse(payload, expectedIds(1))).toThrow(
        'escalatingSetpieces must be an array',
      );
    });

    it('rejects wrong number of setpieces', () => {
      const payload = createValidPayload(1);
      payload.verifications[0].escalatingSetpieces = ['a', 'b', 'c'];

      expect(() => parseConceptVerificationResponse(payload, expectedIds(1))).toThrow(
        'exactly 6 items (received: 3)',
      );
    });

    it('rejects empty string in setpieces', () => {
      const payload = createValidPayload(1);
      payload.verifications[0].escalatingSetpieces[2] = '  ';

      expect(() => parseConceptVerificationResponse(payload, expectedIds(1))).toThrow(
        'invalid escalatingSetpieces[2]',
      );
    });

    it('rejects non-boolean passes in loadBearingCheck', () => {
      const payload = createValidPayload(1);
      (payload.verifications[0].loadBearingCheck as Record<string, unknown>)['passes'] = 'yes';

      expect(() => parseConceptVerificationResponse(payload, expectedIds(1))).toThrow(
        'loadBearingCheck has invalid passes',
      );
    });

    it('rejects empty reasoning in loadBearingCheck', () => {
      const payload = createValidPayload(1);
      payload.verifications[0].loadBearingCheck.reasoning = '';

      expect(() => parseConceptVerificationResponse(payload, expectedIds(1))).toThrow(
        'invalid reasoning',
      );
    });

    it('rejects empty genericCollapse in loadBearingCheck', () => {
      const payload = createValidPayload(1);
      payload.verifications[0].loadBearingCheck.genericCollapse = '  ';

      expect(() => parseConceptVerificationResponse(payload, expectedIds(1))).toThrow(
        'invalid genericCollapse',
      );
    });

    it('rejects non-number conceptIntegrityScore', () => {
      const payload = createValidPayload(1);
      (payload.verifications[0] as Record<string, unknown>)['conceptIntegrityScore'] = 'high';

      expect(() => parseConceptVerificationResponse(payload, expectedIds(1))).toThrow(
        'invalid conceptIntegrityScore',
      );
    });

    it('rejects NaN conceptIntegrityScore', () => {
      const payload = createValidPayload(1);
      payload.verifications[0].conceptIntegrityScore = NaN;

      expect(() => parseConceptVerificationResponse(payload, expectedIds(1))).toThrow(
        'invalid conceptIntegrityScore',
      );
    });

    it('rejects non-object loadBearingCheck', () => {
      const payload = createValidPayload(1);
      (payload.verifications[0] as Record<string, unknown>)['loadBearingCheck'] = 'bad';

      expect(() => parseConceptVerificationResponse(payload, expectedIds(1))).toThrow(
        'loadBearingCheck must be an object',
      );
    });

    it('accepts passes: false', () => {
      const payload = createValidPayload(1);
      payload.verifications[0].loadBearingCheck.passes = false;

      const result = parseConceptVerificationResponse(payload, expectedIds(1));
      expect(result[0].loadBearingCheck.passes).toBe(false);
    });

    it('rejects non-object kernelFidelityCheck', () => {
      const payload = createValidPayload(1);
      (payload.verifications[0] as Record<string, unknown>)['kernelFidelityCheck'] = 'bad';

      expect(() => parseConceptVerificationResponse(payload, expectedIds(1))).toThrow(
        'kernelFidelityCheck must be an object',
      );
    });

    it('rejects non-boolean passes in kernelFidelityCheck', () => {
      const payload = createValidPayload(1);
      (payload.verifications[0].kernelFidelityCheck as Record<string, unknown>)['passes'] = 'yes';

      expect(() => parseConceptVerificationResponse(payload, expectedIds(1))).toThrow(
        'kernelFidelityCheck has invalid passes',
      );
    });

    it('rejects empty reasoning in kernelFidelityCheck', () => {
      const payload = createValidPayload(1);
      payload.verifications[0].kernelFidelityCheck.reasoning = '';

      expect(() => parseConceptVerificationResponse(payload, expectedIds(1))).toThrow(
        'invalid reasoning',
      );
    });

    it('rejects empty kernelDrift in kernelFidelityCheck', () => {
      const payload = createValidPayload(1);
      payload.verifications[0].kernelFidelityCheck.kernelDrift = '  ';

      expect(() => parseConceptVerificationResponse(payload, expectedIds(1))).toThrow(
        'invalid kernelDrift',
      );
    });

    it('accepts kernelFidelityCheck with passes: false', () => {
      const payload = createValidPayload(1);
      payload.verifications[0].kernelFidelityCheck.passes = false;

      const result = parseConceptVerificationResponse(payload, expectedIds(1));
      expect(result[0].kernelFidelityCheck?.passes).toBe(false);
    });

    it('trims string fields', () => {
      const payload = createValidPayload(1);
      payload.verifications[0].signatureScenario = '  padded scenario  ';
      payload.verifications[0].inevitabilityStatement = '  padded inevitability  ';

      const result = parseConceptVerificationResponse(payload, expectedIds(1));
      expect(result[0].signatureScenario).toBe('padded scenario');
      expect(result[0].inevitabilityStatement).toBe('padded inevitability');
    });
  });

  describe('verifyConcepts', () => {
    it('sends request and returns parsed result', async () => {
      const payload = createValidPayload(2);
      const rawContent = JSON.stringify(payload);
      fetchMock.mockResolvedValue(responseWithMessageContent(rawContent));

      const result = await verifyConcepts(createContext(2), 'test-api-key');

      expect(result.rawResponse).toBe(rawContent);
      expect(result.verifications).toHaveLength(2);
      expect(result.verifications[0].conceptId).toBe('concept_1');
      expect(result.verifications[0].signatureScenario).toBe('Signature scenario 1');
      expect(result.verifications[1].conceptIntegrityScore).toBe(85);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const requestBody = getRequestBody();
      expect(requestBody['response_format']).toEqual(CONCEPT_VERIFIER_SCHEMA);
      expect(mockLogPrompt).toHaveBeenCalledWith(mockLogger, 'conceptVerifier', expect.any(Array));
      expect(mockLogPrompt).toHaveBeenCalledTimes(1);
    });
  });

  describe('createConceptVerificationFixture', () => {
    it('produces a valid fixture', () => {
      const fixture = createConceptVerificationFixture();
      expect(fixture.conceptId).toBe('concept_1');
      expect(fixture.signatureScenario).toBeTruthy();
      expect(fixture.escalatingSetpieces).toHaveLength(6);
      expect(fixture.inevitabilityStatement).toBeTruthy();
      expect(fixture.loadBearingCheck.passes).toBe(true);
      expect(fixture.conceptIntegrityScore).toBe(85);
    });
  });
});
