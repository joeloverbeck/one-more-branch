import type { ConceptSeedPacket } from './concept-seed-packet.js';
import { isConceptSeedPacket } from './concept-seed-packet.js';
import type { ContentKind, ContentPacketRole, RiskAppetite } from './content-taxonomy.js';
import { isContentKind, isContentPacketRole } from './content-taxonomy.js';

export interface TasteProfile {
  readonly collisionPatterns: readonly string[];
  readonly favoredMechanisms: readonly string[];
  readonly humanAnchors: readonly string[];
  readonly socialEngines: readonly string[];
  readonly toneBlend: readonly string[];
  readonly sceneAppetites: readonly string[];
  readonly antiPatterns: readonly string[];
  readonly surfaceDoNotRepeat: readonly string[];
  readonly riskAppetite: RiskAppetite;
  readonly engagementModes: readonly string[];
  readonly valueTensions: readonly string[];
  readonly deepPatterns: readonly string[];
}

export interface ContentSpark {
  readonly sparkId: string;
  readonly contentKind: ContentKind;
  readonly spark: string;
  readonly imageSeed: string;
  readonly collisionTags: readonly string[];
  readonly playerRole: string;
  readonly want: string;
  readonly counterforce: string;
  readonly deepPatternRef: string;
}

export interface ContentPacketContext {
  readonly premiseSummary: string;
  readonly situationFrame: string;
  readonly worldState: string;
  readonly playerPosition: string;
}

export interface ContentPacketSourceArtifact {
  readonly artifactType: 'EXEMPLAR' | 'SPARK';
  readonly sourceId: string;
  readonly contentKind?: ContentKind;
  readonly summary: string;
  readonly imageSeed?: string;
  readonly collisionTags?: readonly string[];
}

export interface ContentPacketOrigin {
  readonly generationMode: 'quick' | 'pipeline';
  readonly sourceArtifacts: readonly ContentPacketSourceArtifact[];
}

export interface ConceptSeedOneShotPacket extends ConceptSeedPacket, ContentPacketContext {}

export interface ConceptSeedOneShotLineagedPacket extends ConceptSeedOneShotPacket {
  readonly sourceExemplarIds: readonly string[];
}

export interface ConceptSeedPacketerPacket extends ConceptSeedOneShotPacket {
  readonly sourceSparkIds: readonly string[];
}

export interface GeneratedContentPacket {
  readonly packet: ConceptSeedPacket;
  readonly context: ContentPacketContext;
  readonly origin: ContentPacketOrigin;
}

export interface ContentEvaluationScores {
  readonly imageCharge: number;
  readonly humanAche: number;
  readonly socialLoadBearing: number;
  readonly branchingPressure: number;
  readonly antiGenericity: number;
  readonly sceneBurst: number;
  readonly structuralIrony: number;
  readonly conceptUtility: number;
}

export interface ContentEvaluation {
  readonly contentId: string;
  readonly scores: ContentEvaluationScores;
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly recommendedRole: ContentPacketRole;
}

export interface TasteDistillerContext {
  readonly exemplarIdeas: readonly string[];
  readonly moodOrGenre?: string;
  readonly contentPreferences?: string;
}

export interface TasteDistillerResult {
  readonly tasteProfile: TasteProfile;
  readonly rawResponse: string;
}

export interface SparkstormerContext {
  readonly tasteProfile: TasteProfile;
  readonly kernelBlock?: string;
  readonly contentPreferences?: string;
}

export interface SparkstormerResult {
  readonly sparks: readonly ContentSpark[];
  readonly rawResponse: string;
}

export interface ContentOneShotContext {
  readonly exemplarIdeas: readonly string[];
  readonly genreVibes?: string;
  readonly moodKeywords?: string;
  readonly contentPreferences?: string;
  readonly kernelBlock?: string;
}

export interface ContentOneShotResult {
  readonly packets: readonly ConceptSeedOneShotLineagedPacket[];
  readonly rawResponse: string;
}

export interface ContentPacketerContext {
  readonly tasteProfile: TasteProfile;
  readonly sparks: readonly ContentSpark[];
  readonly kernelBlock?: string;
}

export interface ContentPacketerResult {
  readonly packets: readonly ConceptSeedPacketerPacket[];
  readonly rawResponse: string;
}

export interface ContentEvaluatorContext {
  readonly packets: readonly ConceptSeedPacket[];
  readonly tasteProfile?: TasteProfile;
}

export interface ContentEvaluatorResult {
  readonly evaluations: readonly ContentEvaluation[];
  readonly rawResponse: string;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
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

export function formatContentExemplarId(index: number): string {
  return `exemplar-${String(index + 1).padStart(2, '0')}`;
}

export function cloneContentPacketContext(context: ContentPacketContext): ContentPacketContext {
  return {
    premiseSummary: context.premiseSummary,
    situationFrame: context.situationFrame,
    worldState: context.worldState,
    playerPosition: context.playerPosition,
  };
}

export function cloneContentPacketSourceArtifact(
  artifact: ContentPacketSourceArtifact
): ContentPacketSourceArtifact {
  return {
    artifactType: artifact.artifactType,
    sourceId: artifact.sourceId,
    contentKind: artifact.contentKind,
    summary: artifact.summary,
    imageSeed: artifact.imageSeed,
    collisionTags: artifact.collisionTags ? [...artifact.collisionTags] : undefined,
  };
}

export function cloneContentPacketOrigin(origin: ContentPacketOrigin): ContentPacketOrigin {
  return {
    generationMode: origin.generationMode,
    sourceArtifacts: origin.sourceArtifacts.map(cloneContentPacketSourceArtifact),
  };
}

export function isContentPacketContext(value: unknown): value is ContentPacketContext {
  if (!isObjectRecord(value)) {
    return false;
  }

  const allowedKeys = new Set([
    'premiseSummary',
    'situationFrame',
    'worldState',
    'playerPosition',
  ]);

  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    return false;
  }

  return (
    isNonEmptyString(value['premiseSummary']) &&
    isNonEmptyString(value['situationFrame']) &&
    isNonEmptyString(value['worldState']) &&
    isNonEmptyString(value['playerPosition'])
  );
}

export function isContentPacketSourceArtifact(
  value: unknown
): value is ContentPacketSourceArtifact {
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

export function isGeneratedContentPacket(value: unknown): value is GeneratedContentPacket {
  if (!isObjectRecord(value)) {
    return false;
  }

  const allowedKeys = new Set(['packet', 'context', 'origin']);

  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    return false;
  }

  return (
    isConceptSeedPacket(value['packet']) &&
    isContentPacketContext(value['context']) &&
    isContentPacketOrigin(value['origin'])
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
