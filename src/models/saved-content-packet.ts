import type {
  ContentEvaluation,
  ContentEvaluationScores,
  ContentPacket,
  ContentPacketRole,
  RiskAppetite,
} from './content-packet.js';
import {
  isContentKind,
  isContentPacket,
  isContentPacketRole,
  projectContentPacket,
  isRiskAppetite,
} from './content-packet.js';

// --- Saved types ---

export interface SavedContentPacket {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly pinned: boolean;
  readonly assetVersion: 2;
  readonly packet: ContentPacket;
  readonly context: ContentPacketContext;
  readonly origin: ContentPacketOrigin;
  readonly evaluation?: ContentEvaluation;
}

export interface ContentPacketContext {
  readonly premiseSummary: string;
  readonly situationFrame: string;
  readonly worldState: string;
  readonly viewpointPressure?: string;
}

export interface ContentPacketSourceArtifact {
  readonly artifactType: 'EXEMPLAR' | 'SPARK';
  readonly sourceId: string;
  readonly contentKind?: ContentPacket['contentKind'];
  readonly summary: string;
  readonly imageSeed?: string;
  readonly collisionTags?: readonly string[];
}

export interface ContentPacketOrigin {
  readonly generationMode: 'quick' | 'pipeline';
  readonly sourceArtifacts: readonly ContentPacketSourceArtifact[];
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

export function isContentPacketContext(value: unknown): value is ContentPacketContext {
  if (!isObjectRecord(value)) {
    return false;
  }

  const allowedKeys = new Set([
    'premiseSummary',
    'situationFrame',
    'worldState',
    'viewpointPressure',
  ]);

  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    return false;
  }

  return (
    isNonEmptyString(value['premiseSummary']) &&
    isNonEmptyString(value['situationFrame']) &&
    isNonEmptyString(value['worldState']) &&
    (value['viewpointPressure'] === undefined || isNonEmptyString(value['viewpointPressure']))
  );
}

export function isContentPacketSourceArtifact(value: unknown): value is ContentPacketSourceArtifact {
  if (!isObjectRecord(value)) {
    return false;
  }

  const allowedKeys = new Set([
    'artifactType',
    'sourceId',
    'contentKind',
    'summary',
    'imageSeed',
    'collisionTags',
  ]);

  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    return false;
  }

  return (
    (value['artifactType'] === 'EXEMPLAR' || value['artifactType'] === 'SPARK') &&
    isNonEmptyString(value['sourceId']) &&
    (value['contentKind'] === undefined || isContentKind(value['contentKind'])) &&
    isNonEmptyString(value['summary']) &&
    (value['imageSeed'] === undefined || isNonEmptyString(value['imageSeed'])) &&
    (value['collisionTags'] === undefined || isStringArray(value['collisionTags']))
  );
}

export function isContentPacketOrigin(value: unknown): value is ContentPacketOrigin {
  if (!isObjectRecord(value)) {
    return false;
  }

  const allowedKeys = new Set(['generationMode', 'sourceArtifacts']);

  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    return false;
  }

  return (
    (value['generationMode'] === 'quick' || value['generationMode'] === 'pipeline') &&
    Array.isArray(value['sourceArtifacts']) &&
    value['sourceArtifacts'].length > 0 &&
    value['sourceArtifacts'].every((artifact) => isContentPacketSourceArtifact(artifact))
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
    isContentPacket(value['packet']) &&
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

export function projectSavedContentPacket(packet: SavedContentPacket): ContentPacket {
  return projectContentPacket(packet);
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
