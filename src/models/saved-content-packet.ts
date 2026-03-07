import type {
  ContentEvaluation,
  ContentEvaluationScores,
  ContentKind,
  ContentPacketRole,
  RiskAppetite,
} from './content-packet.js';
import { isContentKind, isContentPacketRole, isRiskAppetite } from './content-packet.js';

// --- Saved types ---

export interface SavedContentPacket {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly contentKind: ContentKind;
  readonly coreAnomaly: string;
  readonly humanAnchor: string;
  readonly socialEngine: string;
  readonly choicePressure: string;
  readonly signatureImage: string;
  readonly escalationPath: string;
  readonly wildnessInvariant: string;
  readonly dullCollapse: string;
  readonly interactionVerbs: readonly string[];
  readonly pinned: boolean;
  readonly recommendedRole: ContentPacketRole;
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

function isContentEvaluation(value: unknown): value is ContentEvaluation {
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

  return (
    isNonEmptyString(value['id']) &&
    isNonEmptyString(value['name']) &&
    isIsoDateString(value['createdAt']) &&
    isIsoDateString(value['updatedAt']) &&
    isContentKind(value['contentKind']) &&
    isNonEmptyString(value['coreAnomaly']) &&
    isNonEmptyString(value['humanAnchor']) &&
    isNonEmptyString(value['socialEngine']) &&
    isNonEmptyString(value['choicePressure']) &&
    isNonEmptyString(value['signatureImage']) &&
    isNonEmptyString(value['escalationPath']) &&
    isNonEmptyString(value['wildnessInvariant']) &&
    isNonEmptyString(value['dullCollapse']) &&
    isNonEmptyStringArray(value['interactionVerbs']) &&
    typeof value['pinned'] === 'boolean' &&
    isContentPacketRole(value['recommendedRole']) &&
    (value['evaluation'] === undefined || isContentEvaluation(value['evaluation']))
  );
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
