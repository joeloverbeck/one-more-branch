import type { SavedKernel } from '../../models/saved-kernel.js';

export interface ConflictAxisGroup {
  readonly genre: string;
  readonly displayLabel: string;
  readonly kernels: readonly SavedKernel[];
}

export function groupKernelsByConflictAxis(kernels: readonly SavedKernel[]): ConflictAxisGroup[] {
  const map = new Map<string, SavedKernel[]>();

  for (const kernel of kernels) {
    const axis = kernel.evaluatedKernel.kernel.conflictAxis || 'UNKNOWN';
    const existing = map.get(axis);
    if (existing) {
      existing.push(kernel);
    } else {
      map.set(axis, [kernel]);
    }
  }

  return Array.from(map.entries())
    .map(([axis, grouped]) => ({
      genre: axis,
      displayLabel: axis.replace(/_/g, ' '),
      kernels: grouped,
    }))
    .sort((a, b) => a.displayLabel.localeCompare(b.displayLabel));
}
