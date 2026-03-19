import type { SavedContentPacket } from '../../models/saved-content-packet.js';

export interface SavedContentPacketKindGroup {
  readonly kind: string;
  readonly displayLabel: string;
  readonly packets: readonly SavedContentPacket[];
}

export function groupSavedContentPacketsByKind(
  packets: readonly SavedContentPacket[]
): SavedContentPacketKindGroup[] {
  const map = new Map<string, SavedContentPacket[]>();

  for (const packet of packets) {
    const kind = packet.packet.contentKind || 'UNKNOWN';
    const existing = map.get(kind);
    if (existing) {
      existing.push(packet);
    } else {
      map.set(kind, [packet]);
    }
  }

  return Array.from(map.entries())
    .map(([kind, grouped]) => ({
      kind,
      displayLabel: kind.replace(/_/g, ' '),
      packets: grouped,
    }))
    .sort((a, b) => a.displayLabel.localeCompare(b.displayLabel));
}
