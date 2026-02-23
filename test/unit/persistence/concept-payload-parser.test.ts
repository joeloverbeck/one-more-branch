import { parseSavedConcept } from '../../../src/persistence/concept-payload-parser';
import {
  createConceptSpecFixture,
  createEvaluatedConceptFixture,
} from '../../fixtures/concept-generator';
import { computeOverallScore, passesConceptThresholds } from '../../../src/models/concept-generator';
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

function omitKeys<T extends object, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
  const clone: Partial<T> = { ...obj };
  for (const key of keys) {
    delete clone[key];
  }
  return clone as Omit<T, K>;
}

describe('parseSavedConcept', () => {
  it('returns a valid modern payload unchanged', () => {
    const valid = createSavedConceptFixture();

    const result = parseSavedConcept(valid, '/test/path.json');

    expect(result).toEqual(valid);
  });

  it('migrates legacy payload missing incitingDisruption from coreConflictLoop', () => {
    const concept = createConceptSpecFixture();
    const legacyConcept = omitKeys(concept, 'incitingDisruption');
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
    const legacyConcept = omitKeys(concept, 'escapeValve');
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
    const legacyConcept = omitKeys(concept, 'incitingDisruption', 'escapeValve');
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
    const legacyConcept = omitKeys(concept, 'incitingDisruption');
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
    const legacyConcept = omitKeys(concept, 'escapeValve');
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
    const legacyConcept = omitKeys(concept, 'incitingDisruption', 'escapeValve');
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

  it('migrates legacy payload with branchingFitness in scores and scoreEvidence', () => {
    const modernEval = createEvaluatedConceptFixture();
    const legacyScores = {
      ...modernEval.scores,
      branchingFitness: 4,
    };
    const legacyEval = {
      ...modernEval,
      scores: legacyScores,
      overallScore: 999,
      passes: false,
    };
    const legacy = {
      id: 'concept-legacy',
      name: 'Legacy Concept',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      seeds: { genreVibes: 'noir' },
      evaluatedConcept: legacyEval,
    };

    const result = parseSavedConcept(legacy, '/test/legacy.json');

    expect((result.evaluatedConcept.scores as unknown as Record<string, unknown>)['branchingFitness']).toBeUndefined();
    expect(result.evaluatedConcept.overallScore).toBe(computeOverallScore(modernEval.scores));
    expect(result.evaluatedConcept.passes).toBe(passesConceptThresholds(modernEval.scores));
  });

  it('migrates legacy preHardenedConcept with branchingFitness', () => {
    const modernEval = createEvaluatedConceptFixture();
    const legacyScores = {
      ...modernEval.scores,
      branchingFitness: 3,
    };
    const legacyEval = {
      ...modernEval,
      scores: legacyScores,
      overallScore: 0,
      passes: false,
    };
    const legacy = {
      id: 'concept-legacy-2',
      name: 'Legacy Hardened',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      seeds: {},
      evaluatedConcept: createEvaluatedConceptFixture(),
      preHardenedConcept: legacyEval,
    };

    const result = parseSavedConcept(legacy, '/test/legacy2.json');

    expect((result.preHardenedConcept!.scores as unknown as Record<string, unknown>)['branchingFitness']).toBeUndefined();
    expect(result.preHardenedConcept!.overallScore).toBe(computeOverallScore(modernEval.scores));
  });
});
