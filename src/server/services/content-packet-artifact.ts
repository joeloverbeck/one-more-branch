import {
  isContentPacket,
  type ContentPacket,
  type ContentPacketProvenance,
} from '../../models/content-packet.js';
import {
  isContentEvaluation,
  type SavedContentPacket,
} from '../../models/saved-content-packet.js';

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clonePacket(packet: ContentPacket): ContentPacket {
  return {
    contentId: packet.contentId,
    contentKind: packet.contentKind,
    coreAnomaly: packet.coreAnomaly,
    humanAnchor: packet.humanAnchor,
    socialEngine: packet.socialEngine,
    choicePressure: packet.choicePressure,
    signatureImage: packet.signatureImage,
    escalationPath: packet.escalationPath,
    wildnessInvariant: packet.wildnessInvariant,
    dullCollapse: packet.dullCollapse,
    interactionVerbs: [...packet.interactionVerbs],
  };
}

function extractProvenance(packet: unknown): ContentPacketProvenance {
  if (!isObjectRecord(packet)) {
    return { generationMode: 'quick' };
  }

  const sourceSparkIds = packet['sourceSparkIds'];
  if (sourceSparkIds === undefined) {
    return { generationMode: 'quick' };
  }

  if (
    !Array.isArray(sourceSparkIds) ||
    sourceSparkIds.length === 0 ||
    !sourceSparkIds.every((id) => typeof id === 'string' && id.trim().length > 0)
  ) {
    throw new Error('Packet sourceSparkIds must be a non-empty array of non-empty strings');
  }

  const normalizedSourceSparkIds: string[] = [];
  for (const id of sourceSparkIds) {
    if (typeof id === 'string') {
      normalizedSourceSparkIds.push(id);
    }
  }

  return {
    generationMode: 'pipeline',
    sourceSparkIds: normalizedSourceSparkIds,
  };
}

export interface CreateSavedContentPacketArtifactInput {
  readonly id: string;
  readonly now: string;
  readonly packet: unknown;
  readonly evaluation?: unknown;
}

export function createSavedContentPacketArtifact(
  input: CreateSavedContentPacketArtifactInput
): SavedContentPacket {
  if (!isContentPacket(input.packet)) {
    throw new Error('Packet data must match the canonical content packet contract');
  }

  if (input.evaluation !== undefined && !isContentEvaluation(input.evaluation)) {
    throw new Error('Packet evaluation must match the content evaluation contract');
  }

  return {
    id: input.id,
    createdAt: input.now,
    updatedAt: input.now,
    pinned: false,
    packet: clonePacket(input.packet),
    provenance: extractProvenance(input.packet),
    evaluation: input.evaluation,
  };
}
