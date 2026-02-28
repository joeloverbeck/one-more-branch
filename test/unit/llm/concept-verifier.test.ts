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

import {
  parseConceptSpecificityResponse,
  parseConceptScenarioResponse,
  verifyConcepts,
} from '../../../src/llm/concept-verifier';
import { CONCEPT_SPECIFICITY_SCHEMA } from '../../../src/llm/schemas/concept-specificity-schema';
import { CONCEPT_SCENARIO_SCHEMA } from '../../../src/llm/schemas/concept-scenario-schema';
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
    conflictAxis: 'PROGRESS_VS_TRADITION',
    dramaticStance: 'COMIC',
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

function createSpecificityData(index = 1): {
  conceptId: string;
  signatureScenario: string;
  loglineCompressible: boolean;
  logline: string;
  premisePromises: string[];
  inevitabilityStatement: string;
  loadBearingCheck: { passes: boolean; reasoning: string; genericCollapse: string };
  kernelFidelityCheck: { passes: boolean; reasoning: string; kernelDrift: string };
} {
  return {
    conceptId: `concept_${index}`,
    signatureScenario: `Signature scenario ${index}`,
    loglineCompressible: true,
    logline: `An exiled tactician must outmaneuver her own surveillance regime before a staged peace summit erupts into civil war.`,
    premisePromises: [
      `Premise promise 1-${index}`,
      `Premise promise 2-${index}`,
      `Premise promise 3-${index}`,
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
  };
}

function createScenarioData(index = 1): {
  conceptId: string;
  escalatingSetpieces: string[];
  setpieceCausalChainBroken: boolean;
  setpieceCausalLinks: string[];
  conceptIntegrityScore: number;
} {
  return {
    conceptId: `concept_${index}`,
    escalatingSetpieces: [
      `Setpiece 1-${index}`,
      `Setpiece 2-${index}`,
      `Setpiece 3-${index}`,
      `Setpiece 4-${index}`,
      `Setpiece 5-${index}`,
      `Setpiece 6-${index}`,
    ],
    setpieceCausalChainBroken: false,
    setpieceCausalLinks: [
      `Setpiece 1 causes setpiece 2 for concept ${index}`,
      `Setpiece 2 causes setpiece 3 for concept ${index}`,
      `Setpiece 3 causes setpiece 4 for concept ${index}`,
      `Setpiece 4 causes setpiece 5 for concept ${index}`,
      `Setpiece 5 causes setpiece 6 for concept ${index}`,
    ],
    conceptIntegrityScore: 85,
  };
}

function createValidSpecificityPayload(
  count = 2,
): { specificityAnalyses: ReturnType<typeof createSpecificityData>[] } {
  return {
    specificityAnalyses: Array.from({ length: count }, (_, i) => createSpecificityData(i + 1)),
  };
}

function createValidScenarioPayload(
  count = 2,
): { scenarioAnalyses: ReturnType<typeof createScenarioData>[] } {
  return {
    scenarioAnalyses: Array.from({ length: count }, (_, i) => createScenarioData(i + 1)),
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

  describe('parseConceptSpecificityResponse', () => {
    it('parses valid response with correct concept IDs', () => {
      const payload = createValidSpecificityPayload(2);
      const result = parseConceptSpecificityResponse(payload, expectedIds(2));

      expect(result).toHaveLength(2);
      expect(result[0].conceptId).toBe('concept_1');
      expect(result[0].signatureScenario).toBe('Signature scenario 1');
      expect(result[0].loglineCompressible).toBe(true);
      expect(result[0].logline).toContain('tactician');
      expect(result[0].premisePromises).toEqual([
        'Premise promise 1-1',
        'Premise promise 2-1',
        'Premise promise 3-1',
      ]);
      expect(result[0].inevitabilityStatement).toBe('Inevitability 1');
      expect(result[0].loadBearingCheck.passes).toBe(true);
      expect(result[0].loadBearingCheck.reasoning).toBe('Reasoning 1');
      expect(result[0].loadBearingCheck.genericCollapse).toBe('Collapse 1');
      expect(result[0].kernelFidelityCheck.passes).toBe(true);
      expect(result[0].kernelFidelityCheck.reasoning).toBe('Kernel reasoning 1');
      expect(result[0].kernelFidelityCheck.kernelDrift).toBe('Kernel drift 1');
      expect(result[1].conceptId).toBe('concept_2');
    });

    it('parses reordered output correctly when conceptIds match', () => {
      const payload = createValidSpecificityPayload(2);
      payload.specificityAnalyses.reverse();

      const result = parseConceptSpecificityResponse(payload, expectedIds(2));

      expect(result).toHaveLength(2);
      expect(result[0].conceptId).toBe('concept_2');
      expect(result[1].conceptId).toBe('concept_1');
    });

    it('rejects non-object response', () => {
      expect(() => parseConceptSpecificityResponse('invalid', expectedIds(1))).toThrow(
        'must be an object',
      );
    });

    it('rejects null response', () => {
      expect(() => parseConceptSpecificityResponse(null, expectedIds(1))).toThrow(
        'must be an object',
      );
    });

    it('rejects missing specificityAnalyses array', () => {
      expect(() => parseConceptSpecificityResponse({}, expectedIds(1))).toThrow(
        'missing specificityAnalyses array',
      );
    });

    it('rejects count mismatch', () => {
      const payload = createValidSpecificityPayload(2);
      expect(() => parseConceptSpecificityResponse(payload, expectedIds(3))).toThrow(
        'exactly 3 items (received: 2)',
      );
    });

    it('rejects non-object analysis item', () => {
      expect(() =>
        parseConceptSpecificityResponse({ specificityAnalyses: ['bad'] }, expectedIds(1)),
      ).toThrow('Specificity 1 must be an object');
    });

    it('rejects missing conceptId', () => {
      const payload = createValidSpecificityPayload(1);
      delete (payload.specificityAnalyses[0] as Record<string, unknown>)['conceptId'];

      expect(() => parseConceptSpecificityResponse(payload, expectedIds(1))).toThrow(
        'invalid conceptId',
      );
    });

    it('rejects empty conceptId', () => {
      const payload = createValidSpecificityPayload(1);
      payload.specificityAnalyses[0].conceptId = '   ';

      expect(() => parseConceptSpecificityResponse(payload, expectedIds(1))).toThrow(
        'invalid conceptId',
      );
    });

    it('rejects unknown conceptId', () => {
      const payload = createValidSpecificityPayload(1);
      payload.specificityAnalyses[0].conceptId = 'concept_999';

      expect(() => parseConceptSpecificityResponse(payload, expectedIds(1))).toThrow(
        'concept set does not match requested candidates',
      );
    });

    it('rejects duplicate conceptIds', () => {
      const payload = createValidSpecificityPayload(2);
      payload.specificityAnalyses[1].conceptId = 'concept_1';

      expect(() => parseConceptSpecificityResponse(payload, expectedIds(2))).toThrow(
        'duplicate conceptIds',
      );
    });

    it('rejects empty signatureScenario', () => {
      const payload = createValidSpecificityPayload(1);
      payload.specificityAnalyses[0].signatureScenario = '   ';

      expect(() => parseConceptSpecificityResponse(payload, expectedIds(1))).toThrow(
        'invalid signatureScenario',
      );
    });

    it('rejects non-boolean loglineCompressible', () => {
      const payload = createValidSpecificityPayload(1);
      (payload.specificityAnalyses[0] as Record<string, unknown>)['loglineCompressible'] = 'yes';

      expect(() => parseConceptSpecificityResponse(payload, expectedIds(1))).toThrow(
        'invalid loglineCompressible',
      );
    });

    it('rejects empty logline', () => {
      const payload = createValidSpecificityPayload(1);
      payload.specificityAnalyses[0].logline = '  ';

      expect(() => parseConceptSpecificityResponse(payload, expectedIds(1))).toThrow(
        'invalid logline',
      );
    });

    it('rejects logline over 27 words', () => {
      const payload = createValidSpecificityPayload(1);
      payload.specificityAnalyses[0].logline =
        'One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone twentytwo twentythree twentyfour twentyfive twentysix twentyseven twentyeight';

      expect(() => parseConceptSpecificityResponse(payload, expectedIds(1))).toThrow(
        'logline must be 27 words or fewer',
      );
    });

    it('rejects empty inevitabilityStatement', () => {
      const payload = createValidSpecificityPayload(1);
      payload.specificityAnalyses[0].inevitabilityStatement = '';

      expect(() => parseConceptSpecificityResponse(payload, expectedIds(1))).toThrow(
        'invalid inevitabilityStatement',
      );
    });

    it('rejects missing premisePromises array', () => {
      const payload = createValidSpecificityPayload(1);
      delete (payload.specificityAnalyses[0] as Record<string, unknown>)['premisePromises'];

      expect(() => parseConceptSpecificityResponse(payload, expectedIds(1))).toThrow(
        'premisePromises must be an array',
      );
    });

    it('rejects too few premisePromises', () => {
      const payload = createValidSpecificityPayload(1);
      payload.specificityAnalyses[0].premisePromises = ['one', 'two'];

      expect(() => parseConceptSpecificityResponse(payload, expectedIds(1))).toThrow(
        'premisePromises must have 3-5 items',
      );
    });

    it('rejects too many premisePromises', () => {
      const payload = createValidSpecificityPayload(1);
      payload.specificityAnalyses[0].premisePromises = ['1', '2', '3', '4', '5', '6'];

      expect(() => parseConceptSpecificityResponse(payload, expectedIds(1))).toThrow(
        'premisePromises must have 3-5 items',
      );
    });

    it('rejects empty premisePromise entry', () => {
      const payload = createValidSpecificityPayload(1);
      payload.specificityAnalyses[0].premisePromises[1] = '   ';

      expect(() => parseConceptSpecificityResponse(payload, expectedIds(1))).toThrow(
        'invalid premisePromises[1]',
      );
    });

    it('trims premisePromises entries', () => {
      const payload = createValidSpecificityPayload(1);
      payload.specificityAnalyses[0].premisePromises = ['  first  ', 'second', '  third'];

      const result = parseConceptSpecificityResponse(payload, expectedIds(1));
      expect(result[0].premisePromises).toEqual(['first', 'second', 'third']);
    });

    it('rejects non-boolean passes in loadBearingCheck', () => {
      const payload = createValidSpecificityPayload(1);
      (payload.specificityAnalyses[0].loadBearingCheck as Record<string, unknown>)['passes'] =
        'yes';

      expect(() => parseConceptSpecificityResponse(payload, expectedIds(1))).toThrow(
        'loadBearingCheck has invalid passes',
      );
    });

    it('rejects empty reasoning in loadBearingCheck', () => {
      const payload = createValidSpecificityPayload(1);
      payload.specificityAnalyses[0].loadBearingCheck.reasoning = '';

      expect(() => parseConceptSpecificityResponse(payload, expectedIds(1))).toThrow(
        'invalid reasoning',
      );
    });

    it('rejects empty genericCollapse in loadBearingCheck', () => {
      const payload = createValidSpecificityPayload(1);
      payload.specificityAnalyses[0].loadBearingCheck.genericCollapse = '  ';

      expect(() => parseConceptSpecificityResponse(payload, expectedIds(1))).toThrow(
        'invalid genericCollapse',
      );
    });

    it('rejects non-object loadBearingCheck', () => {
      const payload = createValidSpecificityPayload(1);
      (payload.specificityAnalyses[0] as Record<string, unknown>)['loadBearingCheck'] = 'bad';

      expect(() => parseConceptSpecificityResponse(payload, expectedIds(1))).toThrow(
        'loadBearingCheck must be an object',
      );
    });

    it('accepts passes: false', () => {
      const payload = createValidSpecificityPayload(1);
      payload.specificityAnalyses[0].loadBearingCheck.passes = false;

      const result = parseConceptSpecificityResponse(payload, expectedIds(1));
      expect(result[0].loadBearingCheck.passes).toBe(false);
    });

    it('rejects non-object kernelFidelityCheck', () => {
      const payload = createValidSpecificityPayload(1);
      (payload.specificityAnalyses[0] as Record<string, unknown>)['kernelFidelityCheck'] = 'bad';

      expect(() => parseConceptSpecificityResponse(payload, expectedIds(1))).toThrow(
        'kernelFidelityCheck must be an object',
      );
    });

    it('rejects non-boolean passes in kernelFidelityCheck', () => {
      const payload = createValidSpecificityPayload(1);
      (payload.specificityAnalyses[0].kernelFidelityCheck as Record<string, unknown>)['passes'] =
        'yes';

      expect(() => parseConceptSpecificityResponse(payload, expectedIds(1))).toThrow(
        'kernelFidelityCheck has invalid passes',
      );
    });

    it('rejects empty reasoning in kernelFidelityCheck', () => {
      const payload = createValidSpecificityPayload(1);
      payload.specificityAnalyses[0].kernelFidelityCheck.reasoning = '';

      expect(() => parseConceptSpecificityResponse(payload, expectedIds(1))).toThrow(
        'invalid reasoning',
      );
    });

    it('rejects empty kernelDrift in kernelFidelityCheck', () => {
      const payload = createValidSpecificityPayload(1);
      payload.specificityAnalyses[0].kernelFidelityCheck.kernelDrift = '  ';

      expect(() => parseConceptSpecificityResponse(payload, expectedIds(1))).toThrow(
        'invalid kernelDrift',
      );
    });

    it('accepts kernelFidelityCheck with passes: false', () => {
      const payload = createValidSpecificityPayload(1);
      payload.specificityAnalyses[0].kernelFidelityCheck.passes = false;

      const result = parseConceptSpecificityResponse(payload, expectedIds(1));
      expect(result[0].kernelFidelityCheck.passes).toBe(false);
    });

    it('trims string fields', () => {
      const payload = createValidSpecificityPayload(1);
      payload.specificityAnalyses[0].signatureScenario = '  padded scenario  ';
      payload.specificityAnalyses[0].inevitabilityStatement = '  padded inevitability  ';

      const result = parseConceptSpecificityResponse(payload, expectedIds(1));
      expect(result[0].signatureScenario).toBe('padded scenario');
      expect(result[0].inevitabilityStatement).toBe('padded inevitability');
    });
  });

  describe('parseConceptScenarioResponse', () => {
    it('parses valid response with correct concept IDs', () => {
      const payload = createValidScenarioPayload(2);
      const result = parseConceptScenarioResponse(payload, expectedIds(2));

      expect(result).toHaveLength(2);
      expect(result[0].conceptId).toBe('concept_1');
      expect(result[0].escalatingSetpieces).toHaveLength(6);
      expect(result[0].setpieceCausalChainBroken).toBe(false);
      expect(result[0].setpieceCausalLinks).toHaveLength(5);
      expect(result[0].conceptIntegrityScore).toBe(85);
      expect(result[1].conceptId).toBe('concept_2');
    });

    it('clamps score above 100 to 100', () => {
      const payload = createValidScenarioPayload(1);
      payload.scenarioAnalyses[0].conceptIntegrityScore = 150;

      const result = parseConceptScenarioResponse(payload, expectedIds(1));
      expect(result[0].conceptIntegrityScore).toBe(100);
    });

    it('clamps negative score to 0', () => {
      const payload = createValidScenarioPayload(1);
      payload.scenarioAnalyses[0].conceptIntegrityScore = -10;

      const result = parseConceptScenarioResponse(payload, expectedIds(1));
      expect(result[0].conceptIntegrityScore).toBe(0);
    });

    it('rounds fractional scores', () => {
      const payload = createValidScenarioPayload(1);
      payload.scenarioAnalyses[0].conceptIntegrityScore = 72.6;

      const result = parseConceptScenarioResponse(payload, expectedIds(1));
      expect(result[0].conceptIntegrityScore).toBe(73);
    });

    it('rejects non-object response', () => {
      expect(() => parseConceptScenarioResponse('invalid', expectedIds(1))).toThrow(
        'must be an object',
      );
    });

    it('rejects missing scenarioAnalyses array', () => {
      expect(() => parseConceptScenarioResponse({}, expectedIds(1))).toThrow(
        'missing scenarioAnalyses array',
      );
    });

    it('rejects non-array escalatingSetpieces', () => {
      const payload = createValidScenarioPayload(1);
      (payload.scenarioAnalyses[0] as Record<string, unknown>)['escalatingSetpieces'] = 'not-array';

      expect(() => parseConceptScenarioResponse(payload, expectedIds(1))).toThrow(
        'escalatingSetpieces must be an array',
      );
    });

    it('rejects wrong number of setpieces', () => {
      const payload = createValidScenarioPayload(1);
      payload.scenarioAnalyses[0].escalatingSetpieces = ['a', 'b', 'c'];

      expect(() => parseConceptScenarioResponse(payload, expectedIds(1))).toThrow(
        'exactly 6 items (received: 3)',
      );
    });

    it('rejects non-boolean setpieceCausalChainBroken', () => {
      const payload = createValidScenarioPayload(1);
      (payload.scenarioAnalyses[0] as Record<string, unknown>)['setpieceCausalChainBroken'] = 'no';

      expect(() => parseConceptScenarioResponse(payload, expectedIds(1))).toThrow(
        'invalid setpieceCausalChainBroken',
      );
    });

    it('rejects non-array setpieceCausalLinks', () => {
      const payload = createValidScenarioPayload(1);
      (payload.scenarioAnalyses[0] as Record<string, unknown>)['setpieceCausalLinks'] = 'broken';

      expect(() => parseConceptScenarioResponse(payload, expectedIds(1))).toThrow(
        'setpieceCausalLinks must be an array',
      );
    });

    it('rejects wrong number of setpieceCausalLinks', () => {
      const payload = createValidScenarioPayload(1);
      payload.scenarioAnalyses[0].setpieceCausalLinks = ['1->2', '2->3'];

      expect(() => parseConceptScenarioResponse(payload, expectedIds(1))).toThrow(
        'setpieceCausalLinks must have exactly 5 items',
      );
    });

    it('rejects empty setpieceCausalLinks entry', () => {
      const payload = createValidScenarioPayload(1);
      payload.scenarioAnalyses[0].setpieceCausalLinks[3] = '   ';

      expect(() => parseConceptScenarioResponse(payload, expectedIds(1))).toThrow(
        'invalid setpieceCausalLinks[3]',
      );
    });

    it('rejects empty string in setpieces', () => {
      const payload = createValidScenarioPayload(1);
      payload.scenarioAnalyses[0].escalatingSetpieces[2] = '  ';

      expect(() => parseConceptScenarioResponse(payload, expectedIds(1))).toThrow(
        'invalid escalatingSetpieces[2]',
      );
    });

    it('rejects non-number conceptIntegrityScore', () => {
      const payload = createValidScenarioPayload(1);
      (payload.scenarioAnalyses[0] as Record<string, unknown>)['conceptIntegrityScore'] = 'high';

      expect(() => parseConceptScenarioResponse(payload, expectedIds(1))).toThrow(
        'invalid conceptIntegrityScore',
      );
    });

    it('rejects NaN conceptIntegrityScore', () => {
      const payload = createValidScenarioPayload(1);
      payload.scenarioAnalyses[0].conceptIntegrityScore = NaN;

      expect(() => parseConceptScenarioResponse(payload, expectedIds(1))).toThrow(
        'invalid conceptIntegrityScore',
      );
    });
  });

  describe('verifyConcepts', () => {
    it('sends two sequential requests and returns combined result', async () => {
      const specificityPayload = createValidSpecificityPayload(2);
      const scenarioPayload = createValidScenarioPayload(2);

      fetchMock
        .mockResolvedValueOnce(
          responseWithMessageContent(JSON.stringify(specificityPayload)),
        )
        .mockResolvedValueOnce(
          responseWithMessageContent(JSON.stringify(scenarioPayload)),
        );

      const result = await verifyConcepts(createContext(2), 'test-api-key');

      expect(result.verifications).toHaveLength(2);
      expect(result.verifications[0].conceptId).toBe('concept_1');
      expect(result.verifications[0].signatureScenario).toBe('Signature scenario 1');
      expect(result.verifications[0].escalatingSetpieces).toHaveLength(6);
      expect(result.verifications[1].conceptIntegrityScore).toBe(85);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(mockLogPrompt).toHaveBeenCalledWith(
        mockLogger,
        'conceptSpecificity',
        expect.any(Array),
      );
      expect(mockLogPrompt).toHaveBeenCalledWith(
        mockLogger,
        'conceptScenario',
        expect.any(Array),
      );
      expect(mockLogPrompt).toHaveBeenCalledTimes(2);
    });
  });

  describe('createConceptVerificationFixture', () => {
    it('produces a valid fixture', () => {
      const fixture = createConceptVerificationFixture();
      expect(fixture.conceptId).toBe('concept_1');
      expect(fixture.signatureScenario).toBeTruthy();
      expect(typeof fixture.loglineCompressible).toBe('boolean');
      expect(fixture.logline).toBeTruthy();
      expect(fixture.premisePromises).toHaveLength(3);
      expect(fixture.escalatingSetpieces).toHaveLength(6);
      expect(fixture.setpieceCausalChainBroken).toBe(false);
      expect(fixture.setpieceCausalLinks).toHaveLength(5);
      expect(fixture.inevitabilityStatement).toBeTruthy();
      expect(fixture.loadBearingCheck.passes).toBe(true);
      expect(fixture.kernelFidelityCheck.passes).toBe(true);
      expect(fixture.conceptIntegrityScore).toBe(85);
    });
  });

  describe('CONCEPT_SPECIFICITY_SCHEMA contract', () => {
    it('requires logline and premise promises fields', () => {
      const rootSchema = CONCEPT_SPECIFICITY_SCHEMA.json_schema.schema as {
        properties: {
          specificityAnalyses: {
            items: {
              required: string[];
              properties: Record<string, unknown>;
            };
          };
        };
      };
      const analysisSchema = rootSchema.properties.specificityAnalyses.items;

      expect(analysisSchema.required).toContain('loglineCompressible');
      expect(analysisSchema.required).toContain('logline');
      expect(analysisSchema.required).toContain('premisePromises');
      expect(analysisSchema.properties['loglineCompressible']).toEqual({ type: 'boolean' });
      expect(analysisSchema.properties['logline']).toEqual({ type: 'string', minLength: 1 });
      expect(analysisSchema.properties['premisePromises']).toEqual({
        type: 'array',
        minItems: 3,
        maxItems: 5,
        items: { type: 'string', minLength: 1 },
      });
    });
  });

  describe('CONCEPT_SCENARIO_SCHEMA contract', () => {
    it('requires setpieces and causal chain fields', () => {
      const rootSchema = CONCEPT_SCENARIO_SCHEMA.json_schema.schema as {
        properties: {
          scenarioAnalyses: {
            items: {
              required: string[];
              properties: Record<string, unknown>;
            };
          };
        };
      };
      const analysisSchema = rootSchema.properties.scenarioAnalyses.items;

      expect(analysisSchema.required).toContain('escalatingSetpieces');
      expect(analysisSchema.required).toContain('setpieceCausalChainBroken');
      expect(analysisSchema.required).toContain('setpieceCausalLinks');
      expect(analysisSchema.required).toContain('conceptIntegrityScore');
      expect(analysisSchema.properties['escalatingSetpieces']).toEqual({
        type: 'array',
        minItems: 6,
        maxItems: 6,
        items: { type: 'string' },
      });
      expect(analysisSchema.properties['setpieceCausalChainBroken']).toEqual({
        type: 'boolean',
      });
      expect(analysisSchema.properties['setpieceCausalLinks']).toEqual({
        type: 'array',
        minItems: 5,
        maxItems: 5,
        items: { type: 'string', minLength: 1 },
      });
    });
  });
});
