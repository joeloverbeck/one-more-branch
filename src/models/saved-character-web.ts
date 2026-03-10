import type { CastPipelineInputs, CastRoleAssignment, RelationshipArchetype } from './character-pipeline-types.js';

export interface SavedCharacterWeb {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly sourceConceptId: string;
  readonly protagonistName: string;
  readonly inputs: CastPipelineInputs;
  readonly assignments: readonly CastRoleAssignment[];
  readonly relationshipArchetypes: readonly RelationshipArchetype[];
  readonly castDynamicsSummary: string;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isSavedCharacterWeb(value: unknown): value is SavedCharacterWeb {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    typeof value['createdAt'] === 'string' &&
    typeof value['updatedAt'] === 'string' &&
    typeof value['sourceConceptId'] === 'string' &&
    value['sourceConceptId'].length > 0 &&
    typeof value['protagonistName'] === 'string' &&
    isObjectRecord(value['inputs']) &&
    typeof (value['inputs'] as Record<string, unknown>)['worldbuilding'] === 'string' &&
    Array.isArray(value['assignments']) &&
    Array.isArray(value['relationshipArchetypes']) &&
    typeof value['castDynamicsSummary'] === 'string'
  );
}

export function getProtagonistAssignment(
  assignments: readonly CastRoleAssignment[],
): CastRoleAssignment {
  const protagonists = assignments.filter((assignment) => assignment.isProtagonist);

  if (protagonists.length !== 1) {
    throw new Error(
      `Character web requires exactly one protagonist assignment; found ${protagonists.length}`,
    );
  }

  return protagonists[0]!;
}
