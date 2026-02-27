import { parseConceptArchitectResponse } from '../../../src/llm/concept-architect';
import { createConceptCharacterWorldFixture } from '../../fixtures/concept-generator';

function createValidPayload(count = 6) {
  return {
    concepts: Array.from({ length: count }, (_, i) =>
      createConceptCharacterWorldFixture(i + 1),
    ),
  };
}

describe('concept-architect', () => {
  describe('parseConceptArchitectResponse', () => {
    it('returns ConceptCharacterWorldFields[] for valid payload matching expected count', () => {
      const parsed = parseConceptArchitectResponse(createValidPayload(6), 6);
      expect(parsed).toHaveLength(6);
      expect(parsed[0]?.protagonistRole).toBe('Role 1');
      expect(parsed[0]?.actionVerbs).toHaveLength(6);
    });

    it('rejects non-object responses', () => {
      expect(() => parseConceptArchitectResponse('invalid', 6)).toThrow('must be an object');
    });

    it('rejects null responses', () => {
      expect(() => parseConceptArchitectResponse(null, 6)).toThrow('must be an object');
    });

    it('rejects array responses', () => {
      expect(() => parseConceptArchitectResponse([], 6)).toThrow('must be an object');
    });

    it('rejects missing concepts array', () => {
      expect(() => parseConceptArchitectResponse({}, 6)).toThrow('missing concepts array');
    });

    it('rejects count mismatch (fewer items)', () => {
      expect(() => parseConceptArchitectResponse(createValidPayload(5), 6)).toThrow(
        'exactly 6 items',
      );
    });

    it('rejects count mismatch (more items)', () => {
      expect(() => parseConceptArchitectResponse(createValidPayload(7), 6)).toThrow(
        'exactly 6 items',
      );
    });

    it('accepts count of 8 when expectedCount is 8', () => {
      const parsed = parseConceptArchitectResponse(createValidPayload(8), 8);
      expect(parsed).toHaveLength(8);
    });

    it('rejects items with invalid settingScale', () => {
      const payload = createValidPayload(6);
      (payload.concepts[0] as Record<string, unknown>)['settingScale'] = 'GALACTIC';
      expect(() => parseConceptArchitectResponse(payload, 6)).toThrow('invalid settingScale');
    });

    it('rejects items with missing protagonistRole', () => {
      const payload = createValidPayload(6);
      delete (payload.concepts[0] as Record<string, unknown>)['protagonistRole'];
      expect(() => parseConceptArchitectResponse(payload, 6)).toThrow('protagonistRole');
    });

    it('rejects items with too few actionVerbs', () => {
      const payload = createValidPayload(6);
      (payload.concepts[0] as Record<string, unknown>)['actionVerbs'] = ['verb1'];
      expect(() => parseConceptArchitectResponse(payload, 6)).toThrow('actionVerbs');
    });

    it('validates all 9 character/world fields', () => {
      const [first] = parseConceptArchitectResponse(createValidPayload(1), 1);
      expect(first).toHaveProperty('protagonistRole');
      expect(first).toHaveProperty('coreCompetence');
      expect(first).toHaveProperty('coreFlaw');
      expect(first).toHaveProperty('actionVerbs');
      expect(first).toHaveProperty('coreConflictLoop');
      expect(first).toHaveProperty('settingAxioms');
      expect(first).toHaveProperty('constraintSet');
      expect(first).toHaveProperty('keyInstitutions');
      expect(first).toHaveProperty('settingScale');
    });
  });
});
