import { parseSavedConcept } from '../../../src/persistence/concept-payload-parser';
import {
  createConceptSpecFixture,
  createEvaluatedConceptFixture,
} from '../../fixtures/concept-generator';
import type { SavedConcept } from '../../../src/models/saved-concept';

function createSavedConceptFixture(overrides?: Partial<SavedConcept>): SavedConcept {
  return {
    id: 'concept-1',
    name: 'Test Concept',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
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

  it('migrates legacy payload missing incitingDisruption from coreConflictLoop', () => {
    const concept = createConceptSpecFixture();
    const { incitingDisruption: _, ...legacyConcept } = concept;
    const legacy = createSavedConceptFixture({
      evaluatedConcept: {
        ...createEvaluatedConceptFixture(),
        concept: legacyConcept as typeof concept,
      },
    });

    const result = parseSavedConcept(legacy, '/test/path.json');

    expect(result.evaluatedConcept.concept.incitingDisruption).toBe(concept.coreConflictLoop);
  });

  it('migrates legacy payload missing escapeValve from whatIfQuestion', () => {
    const concept = createConceptSpecFixture();
    const { escapeValve: _, ...legacyConcept } = concept;
    const legacy = createSavedConceptFixture({
      evaluatedConcept: {
        ...createEvaluatedConceptFixture(),
        concept: legacyConcept as typeof concept,
      },
    });

    const result = parseSavedConcept(legacy, '/test/path.json');

    expect(result.evaluatedConcept.concept.escapeValve).toBe(concept.whatIfQuestion);
  });

  it('migrates legacy payload missing both new fields', () => {
    const concept = createConceptSpecFixture();
    const { incitingDisruption: _a, escapeValve: _b, ...legacyConcept } = concept;
    const legacy = createSavedConceptFixture({
      evaluatedConcept: {
        ...createEvaluatedConceptFixture(),
        concept: legacyConcept as typeof concept,
      },
    });

    const result = parseSavedConcept(legacy, '/test/path.json');

    expect(result.evaluatedConcept.concept.incitingDisruption).toBe(concept.coreConflictLoop);
    expect(result.evaluatedConcept.concept.escapeValve).toBe(concept.whatIfQuestion);
  });

  it('throws when coreConflictLoop is empty even after migration fills incitingDisruption', () => {
    const concept = createConceptSpecFixture();
    const { incitingDisruption: _, ...legacyConcept } = concept;
    const withEmptyLoop = { ...legacyConcept, coreConflictLoop: '' };
    const legacy = createSavedConceptFixture({
      evaluatedConcept: {
        ...createEvaluatedConceptFixture(),
        concept: withEmptyLoop as typeof concept,
      },
    });

    expect(() => parseSavedConcept(legacy, '/test/path.json')).toThrow(
      'Invalid SavedConcept payload at /test/path.json'
    );
  });

  it('throws when whatIfQuestion is empty even after migration fills escapeValve', () => {
    const concept = createConceptSpecFixture();
    const { escapeValve: _, ...legacyConcept } = concept;
    const withEmptyQuestion = { ...legacyConcept, whatIfQuestion: '' };
    const legacy = createSavedConceptFixture({
      evaluatedConcept: {
        ...createEvaluatedConceptFixture(),
        concept: withEmptyQuestion as typeof concept,
      },
    });

    expect(() => parseSavedConcept(legacy, '/test/path.json')).toThrow(
      'Invalid SavedConcept payload at /test/path.json'
    );
  });

  it('migrates nested preHardenedConcept when present', () => {
    const concept = createConceptSpecFixture(2);
    const { incitingDisruption: _a, escapeValve: _b, ...legacyConcept } = concept;
    const legacy = createSavedConceptFixture({
      evaluatedConcept: createEvaluatedConceptFixture(),
      preHardenedConcept: {
        ...createEvaluatedConceptFixture(2),
        concept: legacyConcept as typeof concept,
      },
    });

    const result = parseSavedConcept(legacy, '/test/path.json');

    expect(result.preHardenedConcept?.concept.incitingDisruption).toBe(concept.coreConflictLoop);
    expect(result.preHardenedConcept?.concept.escapeValve).toBe(concept.whatIfQuestion);
  });

  it('handles preHardenedConcept: undefined gracefully', () => {
    const legacy = createSavedConceptFixture({ preHardenedConcept: undefined });

    const result = parseSavedConcept(legacy, '/test/path.json');

    expect(result.preHardenedConcept).toBeUndefined();
  });

  it('throws for completely invalid payload', () => {
    expect(() => parseSavedConcept({ id: 'x' }, '/bad/path.json')).toThrow(
      'Invalid SavedConcept payload at /bad/path.json'
    );
  });

  it.each([null, 42, 'string', undefined])('throws for non-object input: %p', (value) => {
    expect(() => parseSavedConcept(value, '/bad/path.json')).toThrow(
      'Invalid SavedConcept payload at /bad/path.json'
    );
  });
});
