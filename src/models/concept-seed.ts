import type { ConflictAxis } from './conflict-taxonomy.js';
import { isConflictAxis, isConflictType } from './conflict-taxonomy.js';
import type { ConflictType } from './story-spine.js';
import type { GenreFrame, SettingScale } from './concept-generator.js';
import { isGenreFrame, isSettingScale } from './concept-generator.js';

export interface ConceptSeed {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly sourceKernelId: string;
  readonly protagonistDetails: string;
  readonly genreVibes?: string;
  readonly moodKeywords?: string;
  readonly contentPreferences?: string;
  readonly excludedGenres?: readonly GenreFrame[];
  readonly oneLineHook: string;
  readonly genreFrame: GenreFrame;
  readonly genreSubversion: string;
  readonly conflictAxis: ConflictAxis;
  readonly conflictType: ConflictType;
  readonly whatIfQuestion: string;
  readonly playerFantasy: string;
  readonly protagonistRole: string;
  readonly coreCompetence: string;
  readonly coreFlaw: string;
  readonly actionVerbs: readonly string[];
  readonly coreConflictLoop: string;
  readonly settingAxioms: readonly string[];
  readonly constraintSet: readonly string[];
  readonly keyInstitutions: readonly string[];
  readonly settingScale: SettingScale;
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

function isNonEmptyStringArray(value: unknown, minItems: number): boolean {
  return (
    Array.isArray(value) &&
    value.length >= minItems &&
    value.every((item) => isNonEmptyString(item))
  );
}

export function isConceptSeed(value: unknown): value is ConceptSeed {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value['id']) &&
    isNonEmptyString(value['name']) &&
    isIsoDateString(value['createdAt']) &&
    isIsoDateString(value['updatedAt']) &&
    isNonEmptyString(value['sourceKernelId']) &&
    isNonEmptyString(value['protagonistDetails']) &&
    (value['genreVibes'] === undefined || typeof value['genreVibes'] === 'string') &&
    (value['moodKeywords'] === undefined || typeof value['moodKeywords'] === 'string') &&
    (value['contentPreferences'] === undefined || typeof value['contentPreferences'] === 'string') &&
    (value['excludedGenres'] === undefined ||
      (Array.isArray(value['excludedGenres']) &&
        value['excludedGenres'].every((g: unknown) => isGenreFrame(g)))) &&
    isNonEmptyString(value['oneLineHook']) &&
    isGenreFrame(value['genreFrame']) &&
    isNonEmptyString(value['genreSubversion']) &&
    isConflictAxis(value['conflictAxis']) &&
    isConflictType(value['conflictType']) &&
    isNonEmptyString(value['whatIfQuestion']) &&
    isNonEmptyString(value['playerFantasy']) &&
    isNonEmptyString(value['protagonistRole']) &&
    isNonEmptyString(value['coreCompetence']) &&
    isNonEmptyString(value['coreFlaw']) &&
    isNonEmptyStringArray(value['actionVerbs'], 6) &&
    isNonEmptyString(value['coreConflictLoop']) &&
    isNonEmptyStringArray(value['settingAxioms'], 2) &&
    isNonEmptyStringArray(value['constraintSet'], 2) &&
    isNonEmptyStringArray(value['keyInstitutions'], 2) &&
    isSettingScale(value['settingScale'])
  );
}

export function parseConceptSeedEntity(value: unknown, sourcePath: string): ConceptSeed {
  if (isConceptSeed(value)) {
    return value;
  }
  throw new Error(`Invalid ConceptSeed data in ${sourcePath}`);
}
