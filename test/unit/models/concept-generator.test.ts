import { isConceptSpec } from '../../../src/models/concept-generator';
import { createConceptSpecFixture } from '../../fixtures/concept-generator';

describe('isConceptSpec', () => {
  it('accepts a valid ConceptSpec with minimum array sizes', () => {
    const spec = createConceptSpecFixture();
    expect(isConceptSpec(spec)).toBe(true);
  });

  it('accepts settingAxioms with more than 5 items', () => {
    const spec = {
      ...createConceptSpecFixture(),
      settingAxioms: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'],
    };
    expect(isConceptSpec(spec)).toBe(true);
  });

  it('accepts constraintSet with more than 5 items', () => {
    const spec = {
      ...createConceptSpecFixture(),
      constraintSet: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'],
    };
    expect(isConceptSpec(spec)).toBe(true);
  });

  it('accepts keyInstitutions with more than 4 items', () => {
    const spec = {
      ...createConceptSpecFixture(),
      keyInstitutions: ['I1', 'I2', 'I3', 'I4', 'I5', 'I6'],
    };
    expect(isConceptSpec(spec)).toBe(true);
  });

  it('rejects settingAxioms with fewer than 2 items', () => {
    const spec = {
      ...createConceptSpecFixture(),
      settingAxioms: ['Only one'],
    };
    expect(isConceptSpec(spec)).toBe(false);
  });

  it('rejects non-object values', () => {
    expect(isConceptSpec(null)).toBe(false);
    expect(isConceptSpec(42)).toBe(false);
    expect(isConceptSpec('string')).toBe(false);
  });
});
