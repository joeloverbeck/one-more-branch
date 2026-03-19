import type { ContentKind } from './content-taxonomy.js';
import { isContentKind } from './content-taxonomy.js';

export interface ConceptSeedPacket {
  readonly contentId: string;
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

export interface ConceptSeedPacketProjectionSource {
  readonly packet: ConceptSeedPacket;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonEmptyStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => isNonEmptyString(item));
}

export function cloneConceptSeedPacket(packet: ConceptSeedPacket): ConceptSeedPacket {
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

export function projectConceptSeedPacket(
  value: ConceptSeedPacket | ConceptSeedPacketProjectionSource
): ConceptSeedPacket {
  return cloneConceptSeedPacket('packet' in value ? value.packet : value);
}

export function isConceptSeedPacket(value: unknown): value is ConceptSeedPacket {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value['contentId']) &&
    isContentKind(value['contentKind']) &&
    isNonEmptyString(value['coreAnomaly']) &&
    isNonEmptyString(value['humanAnchor']) &&
    isNonEmptyString(value['socialEngine']) &&
    isNonEmptyString(value['choicePressure']) &&
    isNonEmptyString(value['signatureImage']) &&
    isNonEmptyString(value['escalationPath']) &&
    isNonEmptyString(value['wildnessInvariant']) &&
    isNonEmptyString(value['dullCollapse']) &&
    isNonEmptyStringArray(value['interactionVerbs'])
  );
}
