/**
 * SavedCast: persisted character cast with progressive pipeline stage outputs.
 *
 * Each stage is nullable until generated, and completedStages tracks progress.
 */

import type {
  CastRolesResult,
  CharacterKernel,
  TridimensionalProfile,
  AgencyModel,
  SocialWebResult,
  TextualPresentation,
  CastPipelineStage,
} from './character-pipeline-types.js';

export interface CastPipelineInputs {
  readonly kernelSummary?: string;
  readonly conceptSummary?: string;
  readonly userNotes?: string;
}

export interface SavedCast {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly sourceKernelId?: string;
  readonly sourceConceptId?: string;
  readonly pipelineInputs: CastPipelineInputs;
  readonly castRoles: CastRolesResult | null;
  readonly characterKernels: readonly CharacterKernel[] | null;
  readonly tridimensionalProfiles: readonly TridimensionalProfile[] | null;
  readonly agencyModels: readonly AgencyModel[] | null;
  readonly socialWeb: SocialWebResult | null;
  readonly textualPresentations: readonly TextualPresentation[] | null;
  readonly completedStages: readonly CastPipelineStage[];
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

function isPipelineInputs(value: unknown): value is CastPipelineInputs {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    (value['kernelSummary'] === undefined || typeof value['kernelSummary'] === 'string') &&
    (value['conceptSummary'] === undefined || typeof value['conceptSummary'] === 'string') &&
    (value['userNotes'] === undefined || typeof value['userNotes'] === 'string')
  );
}

function isCompletedStages(value: unknown): value is readonly CastPipelineStage[] {
  if (!Array.isArray(value)) {
    return false;
  }

  const validStages = [1, 2, 3, 4, 5, 6];
  return value.every((stage) => typeof stage === 'number' && validStages.includes(stage));
}

export function isSavedCast(value: unknown): value is SavedCast {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value['id']) &&
    isNonEmptyString(value['name']) &&
    isIsoDateString(value['createdAt']) &&
    isIsoDateString(value['updatedAt']) &&
    isPipelineInputs(value['pipelineInputs']) &&
    isCompletedStages(value['completedStages']) &&
    (value['castRoles'] === null || isObjectRecord(value['castRoles'])) &&
    (value['characterKernels'] === null || Array.isArray(value['characterKernels'])) &&
    (value['tridimensionalProfiles'] === null || Array.isArray(value['tridimensionalProfiles'])) &&
    (value['agencyModels'] === null || Array.isArray(value['agencyModels'])) &&
    (value['socialWeb'] === null || isObjectRecord(value['socialWeb'])) &&
    (value['textualPresentations'] === null || Array.isArray(value['textualPresentations']))
  );
}

export function isStageComplete(cast: SavedCast, stage: CastPipelineStage): boolean {
  return cast.completedStages.includes(stage);
}

export function canGenerateStage(cast: SavedCast, stage: CastPipelineStage): boolean {
  if (stage === 1) {
    return true;
  }

  return isStageComplete(cast, (stage - 1) as CastPipelineStage);
}

export function isFullyComplete(cast: SavedCast): boolean {
  return [1, 2, 3, 4, 5, 6].every((stage) =>
    cast.completedStages.includes(stage as CastPipelineStage)
  );
}
