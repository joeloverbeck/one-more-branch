import { groupContentPacketsByKind } from '../../src/server/utils/group-content-packets-by-kind';
import type { SavedContentPacket } from '../../src/models/saved-content-packet';

function makePacket(overrides: Partial<SavedContentPacket> = {}): SavedContentPacket {
  return {
    id: 'pkt-1',
    name: 'Test Packet',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    contentKind: 'ENTITY' as SavedContentPacket['contentKind'],
    coreAnomaly: 'anomaly',
    humanAnchor: 'anchor',
    socialEngine: 'engine',
    choicePressure: 'pressure',
    signatureImage: 'image',
    escalationPath: 'path',
    wildnessInvariant: 'invariant',
    dullCollapse: 'collapse',
    interactionVerbs: ['verb'],
    pinned: false,
    recommendedRole: 'PRIMARY_SEED' as SavedContentPacket['recommendedRole'],
    ...overrides,
  };
}

describe('groupContentPacketsByKind', () => {
  it('returns empty array for empty input', () => {
    expect(groupContentPacketsByKind([])).toEqual([]);
  });

  it('groups packets by contentKind', () => {
    const packets = [
      makePacket({ id: '1', contentKind: 'ENTITY' as SavedContentPacket['contentKind'] }),
      makePacket({ id: '2', contentKind: 'INSTITUTION' as SavedContentPacket['contentKind'] }),
      makePacket({ id: '3', contentKind: 'ENTITY' as SavedContentPacket['contentKind'] }),
    ];

    const groups = groupContentPacketsByKind(packets);

    expect(groups).toHaveLength(2);
    const entityGroup = groups.find((g) => g.kind === 'ENTITY');
    const instGroup = groups.find((g) => g.kind === 'INSTITUTION');
    expect(entityGroup?.packets).toHaveLength(2);
    expect(instGroup?.packets).toHaveLength(1);
  });

  it('sorts groups alphabetically by displayLabel', () => {
    const packets = [
      makePacket({ id: '1', contentKind: 'RELATIONSHIP' as SavedContentPacket['contentKind'] }),
      makePacket({ id: '2', contentKind: 'ENTITY' as SavedContentPacket['contentKind'] }),
      makePacket({ id: '3', contentKind: 'INSTITUTION' as SavedContentPacket['contentKind'] }),
    ];

    const groups = groupContentPacketsByKind(packets);

    const labels = groups.map((g) => g.displayLabel);
    const sorted = [...labels].sort((a, b) => a.localeCompare(b));
    expect(labels).toEqual(sorted);
  });

  it('converts underscores to spaces in displayLabel', () => {
    const packets = [
      makePacket({
        id: '1',
        contentKind: 'SOCIAL_DYNAMIC' as SavedContentPacket['contentKind'],
      }),
    ];

    const groups = groupContentPacketsByKind(packets);

    expect(groups[0].displayLabel).toBe('SOCIAL DYNAMIC');
  });

  it('falls back to UNKNOWN for missing contentKind', () => {
    const packet = makePacket({ id: '1' });
    // Simulate missing contentKind
    const noKind = { ...packet, contentKind: undefined } as unknown as SavedContentPacket;

    const groups = groupContentPacketsByKind([noKind]);

    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe('UNKNOWN');
    expect(groups[0].displayLabel).toBe('UNKNOWN');
  });
});
