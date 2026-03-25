import type {
  ContentEvaluation,
  ContentEvaluationScores,
  ContentPacketContext,
  ContentPacketOrigin,
  ContentPacketSourceArtifact,
  GeneratedContentPacket,
} from '../../models/content-generation-contracts.js';
import type { ConceptSeedPacket } from '../../models/concept-seed-packet.js';
import {
  getSavedContentPacketRecommendedRole,
  type SavedContentPacket,
} from '../../models/saved-content-packet.js';

export interface ContentPacketCardDetail {
  readonly key: string;
  readonly label: string;
  readonly value: string | readonly string[];
}

export interface ContentPacketEvaluationScore {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly maxValue: number;
}

export interface ContentPacketEvaluationDetails {
  readonly scores: readonly ContentPacketEvaluationScore[];
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly recommendedRole: string;
}

export interface ContentPacketCardViewModel {
  readonly id: string;
  readonly pinned: boolean;
  readonly contextDetails: readonly ContentPacketCardDetail[];
  readonly packetDetails: readonly ContentPacketCardDetail[];
  readonly originDetails: readonly ContentPacketCardDetail[];
  readonly metaDetails: readonly ContentPacketCardDetail[];
  readonly evaluationDetails?: ContentPacketEvaluationDetails;
}

type AssetBackedContentPacketCardSource = Pick<
  GeneratedContentPacket,
  'packet' | 'context' | 'origin'
>;

export const CONTENT_PACKET_CONTEXT_FIELD_REGISTRY = [
  { key: 'premiseSummary', label: 'Premise Summary' },
  { key: 'situationFrame', label: 'Situation Frame' },
  { key: 'worldState', label: 'World State' },
  { key: 'playerPosition', label: 'Player Position' },
] as const satisfies ReadonlyArray<{
  readonly key: keyof ContentPacketContext;
  readonly label: string;
}>;

export const CONTENT_PACKET_CARD_FIELD_REGISTRY = [
  { key: 'contentId', label: 'Content ID' },
  { key: 'contentKind', label: 'Kind' },
  { key: 'coreAnomaly', label: 'Core Anomaly' },
  { key: 'humanAnchor', label: 'Human Anchor' },
  { key: 'socialEngine', label: 'Social Engine' },
  { key: 'choicePressure', label: 'Choice Pressure' },
  { key: 'signatureImage', label: 'Signature Image' },
  { key: 'escalationPath', label: 'Escalation Path' },
  { key: 'wildnessInvariant', label: 'Wildness Invariant' },
  { key: 'dullCollapse', label: 'Dull Collapse' },
  { key: 'interactionVerbs', label: 'Interaction Verbs' },
] as const satisfies ReadonlyArray<{
  readonly key: keyof ConceptSeedPacket;
  readonly label: string;
}>;

const EVALUATION_SCORE_FIELD_REGISTRY: ReadonlyArray<{
  readonly key: keyof ContentEvaluationScores;
  readonly label: string;
}> = [
  { key: 'imageCharge', label: 'Image Charge' },
  { key: 'humanAche', label: 'Human Ache' },
  { key: 'socialLoadBearing', label: 'Social Load-Bearing' },
  { key: 'branchingPressure', label: 'Branching Pressure' },
  { key: 'antiGenericity', label: 'Anti-Genericity' },
  { key: 'sceneBurst', label: 'Scene Burst' },
  { key: 'structuralIrony', label: 'Structural Irony' },
  { key: 'conceptUtility', label: 'Concept Utility' },
];

export interface BuildGeneratedContentPacketCardViewModelOptions {
  readonly id?: string;
  readonly pinned?: boolean;
  readonly includeContentKind: boolean;
  readonly evaluation?: ContentEvaluation;
}

function getPacketFieldValue(
  packet: ConceptSeedPacket,
  key: keyof ConceptSeedPacket
): string | readonly string[] {
  return packet[key];
}

function buildContextDetails(context: ContentPacketContext): readonly ContentPacketCardDetail[] {
  return CONTENT_PACKET_CONTEXT_FIELD_REGISTRY.flatMap((field) => {
    const value = context[field.key];
    if (typeof value !== 'string' || value.trim().length === 0) {
      return [];
    }

    return [
      {
        key: field.key,
        label: field.label,
        value,
      },
    ];
  });
}

function buildPacketDetails(
  packet: ConceptSeedPacket,
  includeContentKind: boolean
): readonly ContentPacketCardDetail[] {
  return CONTENT_PACKET_CARD_FIELD_REGISTRY.filter(
    (field) => includeContentKind || field.key !== 'contentKind'
  ).map((field) => ({
    key: field.key,
    label: field.label,
    value: getPacketFieldValue(packet, field.key),
  }));
}

function formatSourceArtifactValue(sourceArtifact: ContentPacketSourceArtifact): readonly string[] {
  const values = [`Type: ${sourceArtifact.artifactType}`, `Source ID: ${sourceArtifact.sourceId}`];

  if (sourceArtifact.contentKind) {
    values.push(`Kind: ${sourceArtifact.contentKind}`);
  }

  values.push(`Summary: ${sourceArtifact.summary}`);

  if (sourceArtifact.imageSeed) {
    values.push(`Image Seed: ${sourceArtifact.imageSeed}`);
  }

  if (sourceArtifact.collisionTags && sourceArtifact.collisionTags.length > 0) {
    values.push(`Collision Tags: ${sourceArtifact.collisionTags.join(', ')}`);
  }

  return values;
}

function buildOriginDetails(origin: ContentPacketOrigin): readonly ContentPacketCardDetail[] {
  return [
    {
      key: 'generationMode',
      label: 'Generation Mode',
      value: origin.generationMode,
    },
    ...origin.sourceArtifacts.map((sourceArtifact, index) => ({
      key: `sourceArtifact-${index + 1}`,
      label: `Source Artifact ${index + 1}`,
      value: formatSourceArtifactValue(sourceArtifact),
    })),
  ];
}

function buildEvaluationDetails(
  evaluation?: ContentEvaluation
): ContentPacketEvaluationDetails | undefined {
  if (!evaluation) {
    return undefined;
  }

  return {
    scores: EVALUATION_SCORE_FIELD_REGISTRY.map((field) => ({
      key: field.key,
      label: field.label,
      value: evaluation.scores[field.key],
      maxValue: 5,
    })),
    strengths: [...evaluation.strengths],
    weaknesses: [...evaluation.weaknesses],
    recommendedRole: evaluation.recommendedRole,
  };
}

function buildMetaDetails(evaluation?: ContentEvaluation): readonly ContentPacketCardDetail[] {
  if (!evaluation) {
    return [];
  }

  return [
    {
      key: 'recommendedRole',
      label: 'Role',
      value: evaluation.recommendedRole,
    },
  ];
}

export function buildGeneratedContentPacketCardViewModel(
  packetCandidate: AssetBackedContentPacketCardSource,
  options: BuildGeneratedContentPacketCardViewModelOptions
): ContentPacketCardViewModel {
  return {
    id: options.id ?? packetCandidate.packet.contentId,
    pinned: options.pinned ?? false,
    contextDetails: buildContextDetails(packetCandidate.context),
    packetDetails: buildPacketDetails(packetCandidate.packet, options.includeContentKind),
    originDetails: buildOriginDetails(packetCandidate.origin),
    metaDetails: buildMetaDetails(options.evaluation),
    evaluationDetails: buildEvaluationDetails(options.evaluation),
  };
}

export function buildSavedContentPacketCardViewModel(
  savedPacket: SavedContentPacket
): ContentPacketCardViewModel {
  return buildGeneratedContentPacketCardViewModel(savedPacket, {
    id: savedPacket.id,
    pinned: savedPacket.pinned,
    includeContentKind: false,
    evaluation: savedPacket.evaluation,
  });
}

export function buildSavedContentPacketCardWithRecommendedRole(
  savedPacket: SavedContentPacket
): ContentPacketCardViewModel {
  const recommendedRole = getSavedContentPacketRecommendedRole(savedPacket);

  return {
    ...buildSavedContentPacketCardViewModel(savedPacket),
    metaDetails: [
      {
        key: 'recommendedRole',
        label: 'Role',
        value: recommendedRole,
      },
    ],
  };
}
