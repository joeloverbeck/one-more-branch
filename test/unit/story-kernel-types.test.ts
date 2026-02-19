import {
  DIRECTION_OF_CHANGE_VALUES,
  KERNEL_PASS_THRESHOLDS,
  KERNEL_SCORING_WEIGHTS,
  computeKernelOverallScore,
  isDirectionOfChange,
  isStoryKernel,
  passesKernelThresholds,
  type KernelDimensionScores,
  type StoryKernel,
} from '../../src/models/story-kernel';

describe('story-kernel types', () => {
  const invalidValues: readonly unknown[] = ['INVALID', null, undefined, 123, {}, []];

  it('validates direction of change values', () => {
    for (const value of DIRECTION_OF_CHANGE_VALUES) {
      expect(isDirectionOfChange(value)).toBe(true);
    }

    for (const value of invalidValues) {
      expect(isDirectionOfChange(value)).toBe(false);
    }
  });

  it('validates StoryKernel objects', () => {
    const validKernel: StoryKernel = {
      dramaticThesis: 'Obsessive control destroys what it tries to protect.',
      valueAtStake: 'Trust',
      opposingForce: 'Fear of loss drives the need to control.',
      directionOfChange: 'IRONIC',
      thematicQuestion: 'Can protection exist without control?',
    };

    expect(isStoryKernel(validKernel)).toBe(true);
    expect(
      isStoryKernel({
        ...validKernel,
        directionOfChange: 'UNKNOWN',
      }),
    ).toBe(false);
    expect(
      isStoryKernel({
        ...validKernel,
        thematicQuestion: '   ',
      }),
    ).toBe(false);
    expect(
      isStoryKernel({
        dramaticThesis: validKernel.dramaticThesis,
        valueAtStake: validKernel.valueAtStake,
        opposingForce: validKernel.opposingForce,
        directionOfChange: validKernel.directionOfChange,
      }),
    ).toBe(false);
    expect(isStoryKernel(null)).toBe(false);
    expect(isStoryKernel('not-an-object')).toBe(false);
  });

  it('computes overall score as 100 when all dimensions are 5', () => {
    const scores: KernelDimensionScores = {
      dramaticClarity: 5,
      thematicUniversality: 5,
      generativePotential: 5,
      conflictTension: 5,
      emotionalDepth: 5,
    };

    expect(computeKernelOverallScore(scores)).toBe(100);
  });

  it('computes overall score as 0 when all dimensions are 0', () => {
    const scores: KernelDimensionScores = {
      dramaticClarity: 0,
      thematicUniversality: 0,
      generativePotential: 0,
      conflictTension: 0,
      emotionalDepth: 0,
    };

    expect(computeKernelOverallScore(scores)).toBe(0);
  });

  it('computes expected weighted score for known values', () => {
    const scores: KernelDimensionScores = {
      dramaticClarity: 5,
      thematicUniversality: 4,
      generativePotential: 3,
      conflictTension: 2,
      emotionalDepth: 1,
    };

    expect(computeKernelOverallScore(scores)).toBe(60);
  });

  it('keeps scoring weights normalized to 100', () => {
    const totalWeight = Object.values(KERNEL_SCORING_WEIGHTS).reduce((sum, weight) => sum + weight, 0);

    expect(totalWeight).toBe(100);
  });

  it('passes threshold checks only when all dimensions meet minimums', () => {
    const passing: KernelDimensionScores = {
      dramaticClarity: KERNEL_PASS_THRESHOLDS.dramaticClarity,
      thematicUniversality: KERNEL_PASS_THRESHOLDS.thematicUniversality,
      generativePotential: KERNEL_PASS_THRESHOLDS.generativePotential,
      conflictTension: KERNEL_PASS_THRESHOLDS.conflictTension,
      emotionalDepth: KERNEL_PASS_THRESHOLDS.emotionalDepth,
    };

    const failing: KernelDimensionScores = {
      ...passing,
      conflictTension: KERNEL_PASS_THRESHOLDS.conflictTension - 1,
    };

    expect(passesKernelThresholds(passing)).toBe(true);
    expect(passesKernelThresholds(failing)).toBe(false);
  });
});
