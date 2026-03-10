import { EngineError } from '../engine/types.js';

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(record: Record<string, unknown>, field: string): void {
  if (typeof record[field] !== 'string' || record[field].trim().length === 0) {
    throw new EngineError(`Field "${field}" must be a non-empty string`, 'VALIDATION_FAILED');
  }
}

export interface WebPatchPayload {
  readonly castDynamicsSummary?: string;
  readonly assignments?: ReadonlyArray<{
    readonly characterName: string;
    readonly narrativeRole: string;
    readonly conflictRelationship: string;
  }>;
  readonly relationshipArchetypes?: ReadonlyArray<{
    readonly fromCharacter: string;
    readonly toCharacter: string;
    readonly essentialTension: string;
  }>;
}

function validateAssignmentEntry(entry: unknown, index: number): void {
  if (!isObjectRecord(entry)) {
    throw new EngineError(
      `assignments[${index}] must be an object`,
      'VALIDATION_FAILED',
    );
  }

  requireString(entry, 'characterName');
  requireString(entry, 'narrativeRole');
  requireString(entry, 'conflictRelationship');
}

function validateRelationshipEntry(entry: unknown, index: number): void {
  if (!isObjectRecord(entry)) {
    throw new EngineError(
      `relationshipArchetypes[${index}] must be an object`,
      'VALIDATION_FAILED',
    );
  }

  requireString(entry, 'fromCharacter');
  requireString(entry, 'toCharacter');
  requireString(entry, 'essentialTension');
}

export function validateWebPatchPayload(payload: unknown): WebPatchPayload {
  if (!isObjectRecord(payload)) {
    throw new EngineError('Web patch payload must be an object', 'VALIDATION_FAILED');
  }

  const hasSummary = 'castDynamicsSummary' in payload;
  const hasAssignments = 'assignments' in payload;
  const hasRelationships = 'relationshipArchetypes' in payload;

  if (!hasSummary && !hasAssignments && !hasRelationships) {
    throw new EngineError(
      'Web patch payload must contain at least one of: castDynamicsSummary, assignments, relationshipArchetypes',
      'VALIDATION_FAILED',
    );
  }

  if (hasSummary) {
    if (typeof payload['castDynamicsSummary'] !== 'string' || payload['castDynamicsSummary'].trim().length === 0) {
      throw new EngineError(
        'Field "castDynamicsSummary" must be a non-empty string',
        'VALIDATION_FAILED',
      );
    }
  }

  if (hasAssignments) {
    if (!Array.isArray(payload['assignments'])) {
      throw new EngineError('Field "assignments" must be an array', 'VALIDATION_FAILED');
    }

    for (let i = 0; i < payload['assignments'].length; i++) {
      validateAssignmentEntry(payload['assignments'][i], i);
    }
  }

  if (hasRelationships) {
    if (!Array.isArray(payload['relationshipArchetypes'])) {
      throw new EngineError(
        'Field "relationshipArchetypes" must be an array',
        'VALIDATION_FAILED',
      );
    }

    for (let i = 0; i < payload['relationshipArchetypes'].length; i++) {
      validateRelationshipEntry(payload['relationshipArchetypes'][i], i);
    }
  }

  return payload as WebPatchPayload;
}
