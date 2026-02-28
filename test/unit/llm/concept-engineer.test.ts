import { parseConceptEngineerResponse } from '../../../src/llm/concept-engineer';
import { createConceptEngineFixture } from '../../fixtures/concept-generator';

function createValidPayload(count = 6): { concepts: Array<ReturnType<typeof createConceptEngineFixture>> } {
  return {
    concepts: Array.from({ length: count }, (_, i) => createConceptEngineFixture(i + 1)),
  };
}

describe('concept-engineer', () => {
  describe('parseConceptEngineerResponse', () => {
    it('returns ConceptEngineFields[] for valid payload matching expected count', () => {
      const parsed = parseConceptEngineerResponse(createValidPayload(6), 6);
      expect(parsed).toHaveLength(6);
      expect(parsed[0]?.pressureSource).toBe('Pressure 1');
      expect(parsed[0]?.elevatorParagraph).toBe('Elevator paragraph 1');
    });

    it('rejects non-object responses', () => {
      expect(() => parseConceptEngineerResponse('invalid', 6)).toThrow('must be an object');
    });

    it('rejects null responses', () => {
      expect(() => parseConceptEngineerResponse(null, 6)).toThrow('must be an object');
    });

    it('rejects array responses', () => {
      expect(() => parseConceptEngineerResponse([], 6)).toThrow('must be an object');
    });

    it('rejects missing concepts array', () => {
      expect(() => parseConceptEngineerResponse({}, 6)).toThrow('missing concepts array');
    });

    it('rejects count mismatch (fewer items)', () => {
      expect(() => parseConceptEngineerResponse(createValidPayload(5), 6)).toThrow(
        'exactly 6 items',
      );
    });

    it('rejects count mismatch (more items)', () => {
      expect(() => parseConceptEngineerResponse(createValidPayload(7), 6)).toThrow(
        'exactly 6 items',
      );
    });

    it('accepts count of 8 when expectedCount is 8', () => {
      const parsed = parseConceptEngineerResponse(createValidPayload(8), 8);
      expect(parsed).toHaveLength(8);
    });

    it('rejects items with missing pressureSource', () => {
      const payload = createValidPayload(6);
      delete (payload.concepts[0] as Record<string, unknown>)['pressureSource'];
      expect(() => parseConceptEngineerResponse(payload, 6)).toThrow('pressureSource');
    });

    it('rejects items with empty elevatorParagraph', () => {
      const payload = createValidPayload(6);
      (payload.concepts[0] as Record<string, unknown>)['elevatorParagraph'] = '';
      expect(() => parseConceptEngineerResponse(payload, 6)).toThrow('elevatorParagraph');
    });

    it('validates all 8 engine fields', () => {
      const [first] = parseConceptEngineerResponse(createValidPayload(1), 1);
      expect(first).toHaveProperty('pressureSource');
      expect(first).toHaveProperty('stakesPersonal');
      expect(first).toHaveProperty('stakesSystemic');
      expect(first).toHaveProperty('deadlineMechanism');
      expect(first).toHaveProperty('ironicTwist');
      expect(first).toHaveProperty('incitingDisruption');
      expect(first).toHaveProperty('escapeValve');
      expect(first).toHaveProperty('elevatorParagraph');
    });
  });
});
