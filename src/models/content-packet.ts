// --- Enums and constants ---

export const CONTENT_KIND_VALUES = [
  'ENTITY',
  'INSTITUTION',
  'RELATIONSHIP',
  'TRANSFORMATION',
  'WORLD_INTRUSION',
  'RITUAL',
  'POLICY',
  'JOB',
  'SUBCULTURE',
  'ECONOMY',
] as const;

export type ContentKind = (typeof CONTENT_KIND_VALUES)[number];

export const CONTENT_PACKET_ROLE_VALUES = [
  'PRIMARY_SEED',
  'SECONDARY_MUTAGEN',
  'IMAGE_ONLY',
  'REJECT',
] as const;

export type ContentPacketRole = (typeof CONTENT_PACKET_ROLE_VALUES)[number];

export const RISK_APPETITE_VALUES = ['LOW', 'MEDIUM', 'HIGH', 'MAXIMAL'] as const;

export type RiskAppetite = (typeof RISK_APPETITE_VALUES)[number];

// --- Type guards for enums ---

export function isContentKind(value: unknown): value is ContentKind {
  return typeof value === 'string' && CONTENT_KIND_VALUES.includes(value as ContentKind);
}

export function isContentPacketRole(value: unknown): value is ContentPacketRole {
  return typeof value === 'string' && CONTENT_PACKET_ROLE_VALUES.includes(value as ContentPacketRole);
}

export function isRiskAppetite(value: unknown): value is RiskAppetite {
  return typeof value === 'string' && RISK_APPETITE_VALUES.includes(value as RiskAppetite);
}

// --- Domain types ---

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
}

export interface ContentSpark {
  readonly sparkId: string;
  readonly contentKind: ContentKind;
  readonly spark: string;
  readonly imageSeed: string;
  readonly collisionTags: readonly string[];
}

export interface ContentPacket {
  readonly contentId: string;
  readonly sourceSparkIds: readonly string[];
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

// --- Taste distiller types ---

export interface TasteDistillerContext {
  readonly exemplarIdeas: readonly string[];
  readonly moodOrGenre?: string;
  readonly contentPreferences?: string;
}

export interface TasteDistillerResult {
  readonly tasteProfile: TasteProfile;
  readonly rawResponse: string;
}

// --- Sparkstormer types ---

export interface SparkstormerContext {
  readonly tasteProfile: TasteProfile;
  readonly kernelBlock?: string;
  readonly contentPreferences?: string;
}

export interface SparkstormerResult {
  readonly sparks: readonly ContentSpark[];
  readonly rawResponse: string;
}

// --- One-shot content generation types ---

export interface ContentOneShotContext {
  readonly exemplarIdeas: readonly string[];
  readonly genreVibes?: string;
  readonly moodKeywords?: string;
  readonly contentPreferences?: string;
  readonly kernelBlock?: string;
}

export interface ContentOneShotPacket {
  readonly title: string;
  readonly contentKind: ContentKind;
  readonly coreAnomaly: string;
  readonly humanAnchor: string;
  readonly socialEngine: string;
  readonly choicePressure: string;
  readonly signatureImage: string;
  readonly escalationHint: string;
  readonly wildnessInvariant: string;
  readonly dullCollapse: string;
}

export interface ContentOneShotResult {
  readonly packets: readonly ContentOneShotPacket[];
  readonly rawResponse: string;
}

// --- Content packeter types ---

export interface ContentPacketerContext {
  readonly tasteProfile: TasteProfile;
  readonly sparks: readonly ContentSpark[];
  readonly kernelBlock?: string;
}

export interface ContentPacketerResult {
  readonly packets: readonly ContentPacket[];
  readonly rawResponse: string;
}

// --- Content evaluator types ---

export interface ContentEvaluatorContext {
  readonly packets: readonly ContentPacket[];
  readonly tasteProfile?: TasteProfile;
}

export interface ContentEvaluatorResult {
  readonly evaluations: readonly ContentEvaluation[];
  readonly rawResponse: string;
}
