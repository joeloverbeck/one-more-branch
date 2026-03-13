import type { DecomposedWorld } from './decomposed-world.js';
import type { WorldSeed } from './world-seed.js';
import type { WorldbuildingDevStage, WorldbuildingPipelineInputs } from './worldbuilding-pipeline-types.js';

export type WorldbuildingSourceKind = 'PIPELINE' | 'RAW_DECOMPOSED';

export interface SavedWorldbuilding {
  readonly id: string;
  readonly name: string;
  readonly sourceKind: WorldbuildingSourceKind;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly sourceConceptId?: string;
  readonly inputs: WorldbuildingPipelineInputs;
  readonly worldSeed: WorldSeed | null;
  readonly rawWorldMarkdown: string | null;
  readonly rawSourceText: string | null;
  readonly decomposedWorld: DecomposedWorld | null;
  readonly completedStages: readonly WorldbuildingDevStage[];
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isSavedWorldbuilding(value: unknown): value is SavedWorldbuilding {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    (value['sourceKind'] === 'PIPELINE' || value['sourceKind'] === 'RAW_DECOMPOSED') &&
    typeof value['createdAt'] === 'string' &&
    typeof value['updatedAt'] === 'string' &&
    isObjectRecord(value['inputs']) &&
    Array.isArray(value['completedStages'])
  );
}
