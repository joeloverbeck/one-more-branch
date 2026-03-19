import type {
  ConceptSeedPacket,
  ContentEvaluation,
  ContentEvaluationScores,
  ContentPacketContext,
  ContentPacketOrigin,
  ContentPacketRole,
  RiskAppetite,
} from './content-packet.js';
import {
  isConceptSeedPacket,
  isContentPacketContext,
  isContentPacketOrigin,
  isContentPacketRole,
  isRiskAppetite,
  projectConceptSeedPacket,
} from './content-packet.js';
export {
  isContentPacketContext,
  isContentPacketOrigin,
  isContentPacketSourceArtifact,
} from './content-packet.js';

// --- Saved types ---

export interface SavedContentPacket {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly pinned: boolean;
  readonly assetVersion: 2;
  readonly packet: ConceptSeedPacket;
  readonly context: ContentPacketContext;
  readonly origin: ContentPacketOrigin;
  readonly evaluation?: ContentEvaluation;
}

export interface SavedTasteProfile {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly collisionPatterns: readonly string[];
  readonly favoredMechanisms: readonly string[];
  readonly humanAnchors: readonly string[];
  readonly socialEngines: readonly string[];
  readonly toneBlend: readonly string[];
  readonly sceneAppetites: readonly string[];
  readonly antiPatterns: readonly string[];
  readonly surfaceDoNotRepeat: readonly string[];
  readonly riskAppetite: RiskAppetite;
}

// --- Helpers ---

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNonEmptyStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => isNonEmptyString(item));
}

function isIsoDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isFiniteScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isContentEvaluationScores(value: unknown): value is ContentEvaluationScores {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isFiniteScore(value['imageCharge']) &&
    isFiniteScore(value['humanAche']) &&
    isFiniteScore(value['socialLoadBearing']) &&
    isFiniteScore(value['branchingPressure']) &&
    isFiniteScore(value['antiGenericity']) &&
    isFiniteScore(value['sceneBurst']) &&
    isFiniteScore(value['structuralIrony']) &&
    isFiniteScore(value['conceptUtility'])
  );
}

export function isContentEvaluation(value: unknown): value is ContentEvaluation {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value['contentId']) &&
    isContentEvaluationScores(value['scores']) &&
    isStringArray(value['strengths']) &&
    isStringArray(value['weaknesses']) &&
    isContentPacketRole(value['recommendedRole'])
  );
}

// --- Public type guards ---

export function isSavedContentPacket(value: unknown): value is SavedContentPacket {
  if (!isObjectRecord(value)) {
    return false;
  }

  const allowedKeys = new Set([
    'id',
    'createdAt',
    'updatedAt',
    'pinned',
    'assetVersion',
    'packet',
    'context',
    'origin',
    'evaluation',
  ]);

  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    return false;
  }

  return (
    isNonEmptyString(value['id']) &&
    isIsoDateString(value['createdAt']) &&
    isIsoDateString(value['updatedAt']) &&
    typeof value['pinned'] === 'boolean' &&
    value['assetVersion'] === 2 &&
    isConceptSeedPacket(value['packet']) &&
    isContentPacketContext(value['context']) &&
    isContentPacketOrigin(value['origin']) &&
    (value['evaluation'] === undefined || isContentEvaluation(value['evaluation']))
  );
}

export function getSavedContentPacketRecommendedRole(
  packet: SavedContentPacket
): ContentPacketRole | 'UNSCORED' {
  return packet.evaluation?.recommendedRole ?? 'UNSCORED';
}

export function projectSavedConceptSeedPacket(packet: SavedContentPacket): ConceptSeedPacket {
  return projectConceptSeedPacket(packet);
}

export function isSavedTasteProfile(value: unknown): value is SavedTasteProfile {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value['id']) &&
    isNonEmptyString(value['name']) &&
    isIsoDateString(value['createdAt']) &&
    isIsoDateString(value['updatedAt']) &&
    isNonEmptyStringArray(value['collisionPatterns']) &&
    isNonEmptyStringArray(value['favoredMechanisms']) &&
    isNonEmptyStringArray(value['humanAnchors']) &&
    isNonEmptyStringArray(value['socialEngines']) &&
    isNonEmptyStringArray(value['toneBlend']) &&
    isNonEmptyStringArray(value['sceneAppetites']) &&
    isNonEmptyStringArray(value['antiPatterns']) &&
    isStringArray(value['surfaceDoNotRepeat']) &&
    isRiskAppetite(value['riskAppetite'])
  );
}
