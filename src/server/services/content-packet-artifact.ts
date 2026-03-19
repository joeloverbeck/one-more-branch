import {
  cloneContentPacketContext,
  cloneContentPacketOrigin,
  isGeneratedContentPacket,
  projectConceptSeedPacket,
} from '../../models/content-packet.js';
import {
  isContentEvaluation,
  type SavedContentPacket,
} from '../../models/saved-content-packet.js';

export interface CreateSavedContentPacketArtifactInput {
  readonly id: string;
  readonly now: string;
  readonly candidate: unknown;
  readonly evaluation?: unknown;
}

export function createSavedContentPacketArtifact(
  input: CreateSavedContentPacketArtifactInput
): SavedContentPacket {
  if (!isGeneratedContentPacket(input.candidate)) {
    throw new Error('Save candidate must include packet, context, and origin artifacts');
  }

  if (input.evaluation !== undefined && !isContentEvaluation(input.evaluation)) {
    throw new Error('Packet evaluation must match the content evaluation contract');
  }

  return {
    id: input.id,
    createdAt: input.now,
    updatedAt: input.now,
    pinned: false,
    assetVersion: 2,
    packet: projectConceptSeedPacket(input.candidate),
    context: cloneContentPacketContext(input.candidate.context),
    origin: cloneContentPacketOrigin(input.candidate.origin),
    evaluation: input.evaluation,
  };
}
