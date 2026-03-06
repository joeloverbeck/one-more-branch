import type { SavedKernel } from '../../../../src/models/saved-kernel.js';
import { groupKernelsByConflictAxis } from '../../../../src/server/utils/group-kernels-by-conflict-axis.js';

function makeKernel(id: string, conflictAxis: string | undefined): SavedKernel {
  return {
    id,
    name: `Kernel ${id}`,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    seeds: {},
    evaluatedKernel: {
      kernel: { conflictAxis },
      scores: {},
      overallScore: 5,
      strengths: [],
      weaknesses: [],
      passes: true,
    } as unknown as SavedKernel['evaluatedKernel'],
  };
}

describe('groupKernelsByConflictAxis', () => {
  it('returns empty array for no kernels', () => {
    expect(groupKernelsByConflictAxis([])).toEqual([]);
  });

  it('groups kernels by conflictAxis', () => {
    const kernels = [
      makeKernel('1', 'POWER_VS_MORALITY'),
      makeKernel('2', 'DUTY_VS_DESIRE'),
      makeKernel('3', 'POWER_VS_MORALITY'),
    ];
    const groups = groupKernelsByConflictAxis(kernels);

    expect(groups).toHaveLength(2);
    expect(groups[0].genre).toBe('DUTY_VS_DESIRE');
    expect(groups[0].kernels).toHaveLength(1);
    expect(groups[1].genre).toBe('POWER_VS_MORALITY');
    expect(groups[1].kernels).toHaveLength(2);
  });

  it('sorts groups alphabetically by display label', () => {
    const kernels = [
      makeKernel('1', 'PROGRESS_VS_TRADITION'),
      makeKernel('2', 'DUTY_VS_DESIRE'),
      makeKernel('3', 'LOYALTY_VS_SURVIVAL'),
    ];
    const groups = groupKernelsByConflictAxis(kernels);

    expect(groups.map((g) => g.genre)).toEqual([
      'DUTY_VS_DESIRE',
      'LOYALTY_VS_SURVIVAL',
      'PROGRESS_VS_TRADITION',
    ]);
  });

  it('sets displayLabel to genre with underscores replaced by spaces', () => {
    const kernels = [makeKernel('1', 'INDIVIDUAL_VS_SYSTEM')];
    const groups = groupKernelsByConflictAxis(kernels);

    expect(groups[0].displayLabel).toBe('INDIVIDUAL VS SYSTEM');
  });

  it('handles missing conflictAxis by defaulting to UNKNOWN', () => {
    const kernel = makeKernel('1', undefined);
    const groups = groupKernelsByConflictAxis([kernel]);

    expect(groups[0].genre).toBe('UNKNOWN');
  });
});
