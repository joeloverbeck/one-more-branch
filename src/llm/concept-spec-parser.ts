import type { ConceptSpec } from '../models/index.js';
import {
  isBranchingPosture,
  isConflictAxis,
  isGenreFrame,
  isSettingScale,
  isStateComplexity,
} from '../models/index.js';
import { isConflictType } from '../models/story-spine.js';
import { LLMError } from './llm-client-types.js';

function requireNonEmptyString(value: unknown, fieldName: string, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new LLMError(`${label} has invalid ${fieldName}`, 'STRUCTURE_PARSE_ERROR', true);
  }

  return value.trim();
}

function requireStringArray(
  value: unknown,
  fieldName: string,
  label: string,
  minItems: number,
  maxItems?: number,
): readonly string[] {
  if (!Array.isArray(value)) {
    throw new LLMError(`${label} has invalid ${fieldName}`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const items = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (items.length < minItems || (typeof maxItems === 'number' && items.length > maxItems)) {
    const rangeLabel = typeof maxItems === 'number' ? `${minItems}-${maxItems}` : `${minItems}+`;
    throw new LLMError(
      `${label} ${fieldName} must contain ${rangeLabel} items`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return items;
}

export function parseConceptSpec(
  raw: unknown,
  index: number,
  prefix: string = 'Concept',
): ConceptSpec {
  const label = `${prefix} ${index + 1}`;

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new LLMError(`${label} must be an object`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = raw as Record<string, unknown>;

  if (!isGenreFrame(data['genreFrame'])) {
    throw new LLMError(
      `${label} has invalid genreFrame: ${String(data['genreFrame'])}`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }
  if (!isConflictAxis(data['conflictAxis'])) {
    throw new LLMError(
      `${label} has invalid conflictAxis: ${String(data['conflictAxis'])}`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }
  if (!isConflictType(data['conflictType'])) {
    throw new LLMError(
      `${label} has invalid conflictType: ${String(data['conflictType'])}`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }
  if (!isSettingScale(data['settingScale'])) {
    throw new LLMError(
      `${label} has invalid settingScale: ${String(data['settingScale'])}`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }
  if (!isBranchingPosture(data['branchingPosture'])) {
    throw new LLMError(
      `${label} has invalid branchingPosture: ${String(data['branchingPosture'])}`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }
  if (!isStateComplexity(data['stateComplexity'])) {
    throw new LLMError(
      `${label} has invalid stateComplexity: ${String(data['stateComplexity'])}`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return {
    oneLineHook: requireNonEmptyString(data['oneLineHook'], 'oneLineHook', label),
    elevatorParagraph: requireNonEmptyString(data['elevatorParagraph'], 'elevatorParagraph', label),
    genreFrame: data['genreFrame'],
    genreSubversion: requireNonEmptyString(data['genreSubversion'], 'genreSubversion', label),
    protagonistRole: requireNonEmptyString(data['protagonistRole'], 'protagonistRole', label),
    coreCompetence: requireNonEmptyString(data['coreCompetence'], 'coreCompetence', label),
    coreFlaw: requireNonEmptyString(data['coreFlaw'], 'coreFlaw', label),
    actionVerbs: requireStringArray(data['actionVerbs'], 'actionVerbs', label, 6),
    coreConflictLoop: requireNonEmptyString(data['coreConflictLoop'], 'coreConflictLoop', label),
    conflictAxis: data['conflictAxis'],
    conflictType: data['conflictType'],
    pressureSource: requireNonEmptyString(data['pressureSource'], 'pressureSource', label),
    stakesPersonal: requireNonEmptyString(data['stakesPersonal'], 'stakesPersonal', label),
    stakesSystemic: requireNonEmptyString(data['stakesSystemic'], 'stakesSystemic', label),
    deadlineMechanism: requireNonEmptyString(data['deadlineMechanism'], 'deadlineMechanism', label),
    settingAxioms: requireStringArray(data['settingAxioms'], 'settingAxioms', label, 2, 5),
    constraintSet: requireStringArray(data['constraintSet'], 'constraintSet', label, 3, 5),
    keyInstitutions: requireStringArray(data['keyInstitutions'], 'keyInstitutions', label, 2, 4),
    settingScale: data['settingScale'],
    branchingPosture: data['branchingPosture'],
    stateComplexity: data['stateComplexity'],
  };
}
