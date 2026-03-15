import { parseSavedConcept } from '../../../src/persistence/concept-payload-parser';
import { createEvaluatedConceptFixture } from '../../fixtures/concept-generator';
import type { SavedConcept } from '../../../src/models/saved-concept';

function createSavedConceptFixture(overrides?: Partial<SavedConcept>): SavedConcept {
  return {
    id: 'concept-1',
    name: 'Test Concept',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    sourceKernelId: 'kernel-1',
    seeds: { genreVibes: 'dark fantasy' },
    evaluatedConcept: createEvaluatedConceptFixture(),
    ...overrides,
  };
}

describe('parseSavedConcept', () => {
  it('returns a valid modern payload unchanged', () => {
    const valid = createSavedConceptFixture();

    const result = parseSavedConcept(valid, '/test/path.json');

    expect(result).toEqual(valid);
  });

  it('handles preHardenedConcept: undefined gracefully', () => {
    const fixture = createSavedConceptFixture({ preHardenedConcept: undefined });

    const result = parseSavedConcept(fixture, '/test/path.json');

    expect(result.preHardenedConcept).toBeUndefined();
  });

  it('throws for completely invalid payload', () => {
    expect(() => parseSavedConcept({ id: 'x' }, '/bad/path.json')).toThrow(
      /Invalid SavedConcept payload at \/bad\/path\.json/
    );
  });

  it.each([null, 42, 'string', undefined])('throws for non-object input: %p', (value) => {
    expect(() => parseSavedConcept(value, '/bad/path.json')).toThrow(
      /Invalid SavedConcept payload at \/bad\/path\.json/
    );
  });

  it('upcasts legacy payload missing contentCharge in evaluatedConcept scores', () => {
    const modern = createSavedConceptFixture();
    const scoresWithout: Record<string, unknown> = { ...modern.evaluatedConcept.scores };
    delete scoresWithout['contentCharge'];
    const legacy = {
      ...modern,
      evaluatedConcept: {
        ...modern.evaluatedConcept,
        scores: scoresWithout,
      },
    };

    const result = parseSavedConcept(legacy, '/test/path.json');

    expect(result.evaluatedConcept.scores.contentCharge).toBe(0);
  });

  it('upcasts legacy payload missing contentCharge in preHardenedConcept scores', () => {
    const modern = createSavedConceptFixture({
      preHardenedConcept: createEvaluatedConceptFixture(2),
    });
    const scoresWithout: Record<string, unknown> = { ...modern.preHardenedConcept!.scores };
    delete scoresWithout['contentCharge'];
    const legacy = {
      ...modern,
      preHardenedConcept: {
        ...modern.preHardenedConcept!,
        scores: scoresWithout,
      },
    };

    const result = parseSavedConcept(legacy, '/test/path.json');

    expect(result.preHardenedConcept!.scores.contentCharge).toBe(0);
  });

  it('preserves existing contentCharge score during upcast', () => {
    const modern = createSavedConceptFixture();

    const result = parseSavedConcept(modern, '/test/path.json');

    expect(result.evaluatedConcept.scores.contentCharge).toBe(
      modern.evaluatedConcept.scores.contentCharge
    );
  });

  it('accepts a SavedConcept whose concept has oversized arrays from seed passthrough', () => {
    const fixture = createSavedConceptFixture();
    const oversized = {
      ...fixture,
      evaluatedConcept: {
        ...fixture.evaluatedConcept,
        concept: {
          ...fixture.evaluatedConcept.concept,
          settingAxioms: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'],
          constraintSet: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'],
          keyInstitutions: ['I1', 'I2', 'I3', 'I4', 'I5', 'I6'],
        },
      },
    };

    const result = parseSavedConcept(oversized, '/test/path.json');

    expect(result.evaluatedConcept.concept.settingAxioms).toHaveLength(6);
    expect(result.evaluatedConcept.concept.constraintSet).toHaveLength(6);
    expect(result.evaluatedConcept.concept.keyInstitutions).toHaveLength(6);
  });
});
