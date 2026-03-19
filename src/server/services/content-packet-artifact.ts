import { isContentPacket } from '../../models/content-packet.js';
import {
  isContentEvaluation,
  type SavedContentPacket,
} from '../../models/saved-content-packet.js';

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

  throw new Error('Saved content packet v2 asset assembly requires explicit context and origin inputs');
}
