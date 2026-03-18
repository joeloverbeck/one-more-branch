import type { SpineOption } from '../llm/spine-generator.js';
import {
  isStorySpineType,
  isConflictType,
  isCharacterArcType,
  isNeedWantDynamic,
} from './story-spine.js';
import { isConflictAxis } from './conflict-taxonomy.js';

export interface SavedSpine {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly spineOption: SpineOption;
  readonly sourceConceptId: string;
  readonly protagonistCharacterId: string;
  readonly npcCharacterIds: readonly string[];
  readonly worldbuildingId: string;
  readonly tone: string;
  readonly startingSituation: string;
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

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isSpineOption(value: unknown): boolean {
  if (!isObjectRecord(value)) {
    return false;
  }

  if (!isNonEmptyString(value['centralDramaticQuestion'])) return false;
  if (!isStorySpineType(value['storySpineType'])) return false;
  if (!isConflictAxis(value['conflictAxis'])) return false;
  if (!isConflictType(value['conflictType'])) return false;
  if (!isCharacterArcType(value['characterArcType'])) return false;

  const nw = value['protagonistNeedVsWant'];
  if (!isObjectRecord(nw)) return false;
  if (!isNonEmptyString(nw['need'])) return false;
  if (!isNonEmptyString(nw['want'])) return false;
  if (!isNeedWantDynamic(nw['dynamic'])) return false;

  const af = value['primaryAntagonisticForce'];
  if (!isObjectRecord(af)) return false;
  if (!isNonEmptyString(af['description'])) return false;
  if (!isNonEmptyString(af['pressureMechanism'])) return false;

  if (!isStringArray(value['toneFeel'])) return false;
  if (!isStringArray(value['toneAvoid'])) return false;

  return true;
}

export function isSavedSpine(value: unknown): value is SavedSpine {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value['id']) &&
    isNonEmptyString(value['name']) &&
    isIsoDateString(value['createdAt']) &&
    isIsoDateString(value['updatedAt']) &&
    isSpineOption(value['spineOption']) &&
    isNonEmptyString(value['sourceConceptId']) &&
    isNonEmptyString(value['protagonistCharacterId']) &&
    isStringArray(value['npcCharacterIds']) &&
    isNonEmptyString(value['worldbuildingId']) &&
    typeof value['tone'] === 'string' &&
    typeof value['startingSituation'] === 'string'
  );
}
