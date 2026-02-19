import type { EvaluatedKernel, KernelSeedInput } from './story-kernel.js';
import { isStoryKernel } from './story-kernel.js';

export interface SavedKernel {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly seeds: Omit<KernelSeedInput, 'apiKey'>;
  readonly evaluatedKernel: EvaluatedKernel;
}

export interface GeneratedKernelBatch {
  readonly id: string;
  readonly generatedAt: string;
  readonly seeds: Omit<KernelSeedInput, 'apiKey'>;
  readonly evaluatedKernels: readonly EvaluatedKernel[];
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isKernelSeeds(value: unknown): value is Omit<KernelSeedInput, 'apiKey'> {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    (value['thematicInterests'] === undefined || typeof value['thematicInterests'] === 'string') &&
    (value['emotionalCore'] === undefined || typeof value['emotionalCore'] === 'string') &&
    (value['sparkLine'] === undefined || typeof value['sparkLine'] === 'string')
  );
}

function isScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 5;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => isNonEmptyString(entry));
}

function isKernelDimensionScores(value: unknown): boolean {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isScore(value['dramaticClarity']) &&
    isScore(value['thematicUniversality']) &&
    isScore(value['generativePotential']) &&
    isScore(value['conflictTension']) &&
    isScore(value['emotionalDepth'])
  );
}

function isEvaluatedKernel(value: unknown): value is EvaluatedKernel {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isStoryKernel(value['kernel']) &&
    isKernelDimensionScores(value['scores']) &&
    typeof value['overallScore'] === 'number' &&
    Number.isFinite(value['overallScore']) &&
    typeof value['passes'] === 'boolean' &&
    isStringArray(value['strengths']) &&
    isStringArray(value['weaknesses']) &&
    isNonEmptyString(value['tradeoffSummary'])
  );
}

export function isSavedKernel(value: unknown): value is SavedKernel {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value['id']) &&
    isNonEmptyString(value['name']) &&
    isIsoDateString(value['createdAt']) &&
    isIsoDateString(value['updatedAt']) &&
    isKernelSeeds(value['seeds']) &&
    isEvaluatedKernel(value['evaluatedKernel'])
  );
}

export function isGeneratedKernelBatch(value: unknown): value is GeneratedKernelBatch {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value['id']) &&
    isIsoDateString(value['generatedAt']) &&
    isKernelSeeds(value['seeds']) &&
    Array.isArray(value['evaluatedKernels']) &&
    value['evaluatedKernels'].every((kernel) => isEvaluatedKernel(kernel))
  );
}
