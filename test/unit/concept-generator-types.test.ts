import {
  BRANCHING_POSTURES,
  CONCEPT_SCORING_WEIGHTS,
  CONFLICT_AXES,
  DRIFT_RISK_MITIGATION_TYPES,
  GENRE_FRAMES,
  SETTING_SCALES,
  computeOverallScore,
  isBranchingPosture,
  isConflictAxis,
  isConceptSpec,
  isDriftRiskMitigationType,
  isGenreFrame,
  isSettingScale,
  type ConceptDimensionScores,
} from '../../src/models/concept-generator';
import { createConceptSpecFixture } from '../fixtures/concept-generator';

describe('concept-generator types', () => {
  const invalidValues: readonly unknown[] = ['INVALID', null, undefined, 123, {}, []];

  function expectTypeGuardBehavior<T extends string>(
    values: readonly T[],
    guard: (value: unknown) => boolean,
  ): void {
    for (const value of values) {
      expect(guard(value)).toBe(true);
    }

    for (const value of invalidValues) {
      expect(guard(value)).toBe(false);
    }
  }

  function createValidConceptSpec(): Record<string, unknown> {
    return createConceptSpecFixture(1) as unknown as Record<string, unknown>;
  }

  it('validates all enum type guards', () => {
    expectTypeGuardBehavior(GENRE_FRAMES, isGenreFrame);
    expectTypeGuardBehavior(CONFLICT_AXES, isConflictAxis);
    expectTypeGuardBehavior(BRANCHING_POSTURES, isBranchingPosture);
    expectTypeGuardBehavior(SETTING_SCALES, isSettingScale);
    expectTypeGuardBehavior(DRIFT_RISK_MITIGATION_TYPES, isDriftRiskMitigationType);
  });

  it('defines complete enum arrays with spec counts', () => {
    expect(GENRE_FRAMES).toHaveLength(16);
    expect(CONFLICT_AXES).toHaveLength(8);
    expect(BRANCHING_POSTURES).toHaveLength(4);
    expect(SETTING_SCALES).toHaveLength(4);
    expect(DRIFT_RISK_MITIGATION_TYPES).toHaveLength(4);
  });

  it('computes overall score as 100 when all dimensions are 5', () => {
    const scores: ConceptDimensionScores = {
      hookStrength: 5,
      conflictEngine: 5,
      agencyBreadth: 5,
      noveltyLeverage: 5,
      branchingFitness: 5,
      llmFeasibility: 5,
    };

    expect(computeOverallScore(scores)).toBe(100);
  });

  it('computes overall score as 0 when all dimensions are 0', () => {
    const scores: ConceptDimensionScores = {
      hookStrength: 0,
      conflictEngine: 0,
      agencyBreadth: 0,
      noveltyLeverage: 0,
      branchingFitness: 0,
      llmFeasibility: 0,
    };

    expect(computeOverallScore(scores)).toBe(0);
  });

  it('computes expected weighted score for known values', () => {
    const scores: ConceptDimensionScores = {
      hookStrength: 5,
      conflictEngine: 4,
      agencyBreadth: 3,
      noveltyLeverage: 2,
      branchingFitness: 1,
      llmFeasibility: 0,
    };

    expect(computeOverallScore(scores)).toBe(45);
  });

  it('keeps scoring weights normalized to 100', () => {
    const totalWeight = Object.values(CONCEPT_SCORING_WEIGHTS).reduce(
      (sum, weight) => sum + weight,
      0,
    );

    expect(totalWeight).toBe(100);
  });

  it('requires concept enrichment fields in isConceptSpec', () => {
    const valid = createValidConceptSpec();
    expect(isConceptSpec(valid)).toBe(true);

    const missingWhatIf = { ...valid };
    delete missingWhatIf['whatIfQuestion'];
    expect(isConceptSpec(missingWhatIf)).toBe(false);

    const missingIronic = { ...valid };
    delete missingIronic['ironicTwist'];
    expect(isConceptSpec(missingIronic)).toBe(false);

    const missingFantasy = { ...valid };
    delete missingFantasy['playerFantasy'];
    expect(isConceptSpec(missingFantasy)).toBe(false);

    const missingDisruption = { ...valid };
    delete missingDisruption['incitingDisruption'];
    expect(isConceptSpec(missingDisruption)).toBe(false);

    const missingEscapeValve = { ...valid };
    delete missingEscapeValve['escapeValve'];
    expect(isConceptSpec(missingEscapeValve)).toBe(false);
  });
});
