import type { ContentEvaluation, ContentPacket } from '../../models/content-packet.js';
import {
  getSavedContentPacketRecommendedRole,
  type SavedContentPacket,
} from '../../models/saved-content-packet.js';

export interface ContentPacketCardDetail {
  readonly key: keyof ContentPacket | 'recommendedRole';
  readonly label: string;
  readonly value: string | readonly string[];
}

export interface ContentPacketCardViewModel {
  readonly id: string;
  readonly pinned: boolean;
  readonly details: readonly ContentPacketCardDetail[];
  readonly metaDetails: readonly ContentPacketCardDetail[];
}

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
  readonly key: keyof ContentPacket;
  readonly label: string;
}>;

export interface BuildContentPacketCardViewModelOptions {
  readonly id?: string;
  readonly pinned?: boolean;
  readonly includeContentKind: boolean;
  readonly evaluation?: ContentEvaluation;
}

function getPacketFieldValue(
  packet: ContentPacket,
  key: keyof ContentPacket
): string | readonly string[] {
  return packet[key];
}

function buildMetaDetails(
  evaluation?: ContentEvaluation
): readonly ContentPacketCardDetail[] {
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

export function buildContentPacketCardViewModel(
  packet: ContentPacket,
  options: BuildContentPacketCardViewModelOptions
): ContentPacketCardViewModel {
  const details = CONTENT_PACKET_CARD_FIELD_REGISTRY.filter(
    (field) => options.includeContentKind || field.key !== 'contentKind'
  ).map((field) => ({
    key: field.key,
    label: field.label,
    value: getPacketFieldValue(packet, field.key),
  }));

  return {
    id: options.id ?? packet.contentId,
    pinned: options.pinned ?? false,
    details,
    metaDetails: buildMetaDetails(options.evaluation),
  };
}

export function buildSavedContentPacketCardViewModel(
  savedPacket: SavedContentPacket
): ContentPacketCardViewModel {
  return buildContentPacketCardViewModel(savedPacket.packet, {
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
