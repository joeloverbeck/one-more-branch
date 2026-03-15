import { EngineError } from '../engine/types.js';
import type { CharacterDevStage } from '../models/character-pipeline-types.js';

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function requireString(record: Record<string, unknown>, field: string): void {
  if (typeof record[field] !== 'string') {
    throw new EngineError(`Field "${field}" must be a string`, 'VALIDATION_FAILED');
  }
}

function requireStringArray(record: Record<string, unknown>, field: string): void {
  if (!isStringArray(record[field])) {
    throw new EngineError(`Field "${field}" must be an array of strings`, 'VALIDATION_FAILED');
  }
}

function requireEnum(record: Record<string, unknown>, field: string, allowed: readonly string[]): void {
  const value = record[field];
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw new EngineError(
      `Field "${field}" must be one of: ${allowed.join(', ')}`,
      'VALIDATION_FAILED',
    );
  }
}

const EMOTION_SALIENCE_VALUES = ['LOW', 'MEDIUM', 'HIGH'] as const;
const PIPELINE_RELATIONSHIP_TYPE_VALUES = [
  'KIN',
  'ALLY',
  'RIVAL',
  'PATRON',
  'CLIENT',
  'MENTOR',
  'SUBORDINATE',
  'ROMANTIC',
  'EX_ROMANTIC',
  'INFORMANT',
] as const;
const RELATIONSHIP_VALENCE_VALUES = ['POSITIVE', 'NEGATIVE', 'AMBIVALENT'] as const;

function validateCharacterKernelPayload(payload: unknown): void {
  if (!isObjectRecord(payload)) {
    throw new EngineError('Character kernel payload must be an object', 'VALIDATION_FAILED');
  }

  requireString(payload, 'superObjective');
  requireStringArray(payload, 'immediateObjectives');
  requireString(payload, 'primaryOpposition');
  requireStringArray(payload, 'stakes');
  requireStringArray(payload, 'constraints');
  requireString(payload, 'pressurePoint');
}

function validateTridimensionalProfilePayload(payload: unknown): void {
  if (!isObjectRecord(payload)) {
    throw new EngineError(
      'Tridimensional profile payload must be an object',
      'VALIDATION_FAILED',
    );
  }

  requireString(payload, 'physiology');
  requireString(payload, 'sociology');
  requireString(payload, 'psychology');
  requireStringArray(payload, 'coreTraits');
}

function validateAgencyModelPayload(payload: unknown): void {
  if (!isObjectRecord(payload)) {
    throw new EngineError('Agency model payload must be an object', 'VALIDATION_FAILED');
  }

  requireEnum(payload, 'emotionSalience', EMOTION_SALIENCE_VALUES);
  requireStringArray(payload, 'coreBeliefs');
  requireStringArray(payload, 'desires');
  requireStringArray(payload, 'currentIntentions');
  requireStringArray(payload, 'falseBeliefs');
  requireString(payload, 'decisionPattern');
}

function validateRelationship(rel: unknown, index: number): void {
  if (!isObjectRecord(rel)) {
    throw new EngineError(
      `Relationship at index ${index} must be an object`,
      'VALIDATION_FAILED',
    );
  }

  requireString(rel, 'fromCharacter');
  requireString(rel, 'toCharacter');
  requireEnum(rel, 'relationshipType', PIPELINE_RELATIONSHIP_TYPE_VALUES);
  requireEnum(rel, 'valence', RELATIONSHIP_VALENCE_VALUES);

  if (typeof rel['numericValence'] !== 'number') {
    throw new EngineError(
      `Relationship at index ${index}: "numericValence" must be a number`,
      'VALIDATION_FAILED',
    );
  }

  requireString(rel, 'history');
  requireString(rel, 'currentTension');
  requireString(rel, 'leverage');
}

function validateDeepRelationshipsPayload(payload: unknown): void {
  if (!isObjectRecord(payload)) {
    throw new EngineError(
      'Deep relationships payload must be an object',
      'VALIDATION_FAILED',
    );
  }

  if (!Array.isArray(payload['relationships'])) {
    throw new EngineError(
      'Field "relationships" must be an array',
      'VALIDATION_FAILED',
    );
  }

  for (let i = 0; i < payload['relationships'].length; i++) {
    validateRelationship(payload['relationships'][i], i);
  }

  requireStringArray(payload, 'secrets');
  requireStringArray(payload, 'personalDilemmas');
}

function validateSpeechFingerprint(fp: unknown): void {
  if (!isObjectRecord(fp)) {
    throw new EngineError(
      'Field "speechFingerprint" must be an object',
      'VALIDATION_FAILED',
    );
  }

  requireStringArray(fp, 'catchphrases');
  requireString(fp, 'vocabularyProfile');
  requireString(fp, 'sentencePatterns');
  requireStringArray(fp, 'verbalTics');
  requireStringArray(fp, 'dialogueSamples');
  requireString(fp, 'metaphorFrames');
  requireStringArray(fp, 'antiExamples');
  requireStringArray(fp, 'discourseMarkers');
  requireString(fp, 'registerShifts');
}

function validateTextualPresentationPayload(payload: unknown): void {
  if (!isObjectRecord(payload)) {
    throw new EngineError(
      'Textual presentation payload must be an object',
      'VALIDATION_FAILED',
    );
  }

  validateSpeechFingerprint(payload['speechFingerprint']);
  requireString(payload, 'appearance');
  requireString(payload, 'knowledgeBoundaries');
  requireString(payload, 'conflictPriority');
}

export function validateStagePayload(stage: CharacterDevStage, payload: unknown): void {
  switch (stage) {
    case 1:
      validateCharacterKernelPayload(payload);
      break;
    case 2:
      validateTridimensionalProfilePayload(payload);
      break;
    case 3:
      validateAgencyModelPayload(payload);
      break;
    case 4:
      validateDeepRelationshipsPayload(payload);
      break;
    case 5:
      validateTextualPresentationPayload(payload);
      break;
    default:
      throw new EngineError(`Invalid stage: ${String(stage)}`, 'VALIDATION_FAILED');
  }
}
