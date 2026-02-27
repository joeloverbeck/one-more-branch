import { parseConceptSeederResponse } from '../../../src/llm/concept-seeder';
import { createConceptSeedFixture } from '../../fixtures/concept-generator';

function createValidPayload(count = 6) {
  return {
    concepts: Array.from({ length: count }, (_, i) => createConceptSeedFixture(i + 1)),
  };
}

describe('concept-seeder', () => {
  describe('parseConceptSeederResponse', () => {
    it('returns ConceptSeedFields[] for valid 6-seed payload', () => {
      const parsed = parseConceptSeederResponse(createValidPayload(6));
      expect(parsed).toHaveLength(6);
      expect(parsed[0]?.genreFrame).toBe('NOIR');
      expect(parsed[0]?.oneLineHook).toBe('Hook 1');
    });

    it('accepts 7 and 8 seed payloads', () => {
      expect(parseConceptSeederResponse(createValidPayload(7))).toHaveLength(7);
      expect(parseConceptSeederResponse(createValidPayload(8))).toHaveLength(8);
    });

    it('rejects non-object responses', () => {
      expect(() => parseConceptSeederResponse('invalid')).toThrow('must be an object');
    });

    it('rejects null responses', () => {
      expect(() => parseConceptSeederResponse(null)).toThrow('must be an object');
    });

    it('rejects array responses', () => {
      expect(() => parseConceptSeederResponse([])).toThrow('must be an object');
    });

    it('rejects missing concepts array', () => {
      expect(() => parseConceptSeederResponse({})).toThrow('missing concepts array');
    });

    it('rejects fewer than 6 seeds', () => {
      expect(() => parseConceptSeederResponse(createValidPayload(5))).toThrow('6-8 seeds');
    });

    it('rejects more than 8 seeds', () => {
      expect(() => parseConceptSeederResponse(createValidPayload(9))).toThrow('6-8 seeds');
    });

    it('rejects seeds with invalid genreFrame', () => {
      const payload = createValidPayload();
      (payload.concepts[0] as Record<string, unknown>)['genreFrame'] = 'INVALID';
      expect(() => parseConceptSeederResponse(payload)).toThrow('invalid genreFrame');
    });

    it('rejects seeds with missing oneLineHook', () => {
      const payload = createValidPayload();
      delete (payload.concepts[0] as Record<string, unknown>)['oneLineHook'];
      expect(() => parseConceptSeederResponse(payload)).toThrow('oneLineHook');
    });

    it('validates all 7 seed fields', () => {
      const payload = createValidPayload();
      const first = parsed(payload);
      expect(first).toHaveProperty('oneLineHook');
      expect(first).toHaveProperty('genreFrame');
      expect(first).toHaveProperty('genreSubversion');
      expect(first).toHaveProperty('conflictAxis');
      expect(first).toHaveProperty('conflictType');
      expect(first).toHaveProperty('whatIfQuestion');
      expect(first).toHaveProperty('playerFantasy');
    });
  });
});

function parsed(payload: ReturnType<typeof createValidPayload>) {
  return parseConceptSeederResponse(payload)[0];
}
