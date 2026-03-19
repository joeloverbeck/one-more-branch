import { groupSavedContentPacketsByKind } from '../../src/server/utils/group-saved-content-packets-by-kind';
import type { SavedContentPacket } from '../../src/models/saved-content-packet';

function makePacket(overrides: Partial<SavedContentPacket> = {}): SavedContentPacket {
  return {
    id: 'pkt-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    pinned: false,
    assetVersion: 2,
    packet: {
      contentId: 'pkt-01',
      contentKind: 'ENTITY',
      coreAnomaly: 'anomaly',
      humanAnchor: 'anchor',
      socialEngine: 'engine',
      choicePressure: 'pressure',
      signatureImage: 'image',
      escalationPath: 'path',
      wildnessInvariant: 'invariant',
      dullCollapse: 'collapse',
      interactionVerbs: ['verb1', 'verb2', 'verb3', 'verb4'],
    },
    context: {
      premiseSummary: 'premise',
      situationFrame: 'frame',
      worldState: 'world',
    },
    origin: {
      generationMode: 'quick',
      sourceArtifacts: [
        {
          artifactType: 'EXEMPLAR',
          sourceId: 'exemplar-01',
          contentKind: 'ENTITY',
          summary: 'summary',
        },
      ],
    },
    ...overrides,
  };
}

describe('groupSavedContentPacketsByKind', () => {
  it('returns empty array for empty input', () => {
    expect(groupSavedContentPacketsByKind([])).toEqual([]);
  });

  it('groups packets by contentKind', () => {
    const packets = [
      makePacket({ id: '1', packet: { ...makePacket().packet, contentKind: 'ENTITY' } }),
      makePacket({ id: '2', packet: { ...makePacket().packet, contentKind: 'INSTITUTION' } }),
      makePacket({ id: '3', packet: { ...makePacket().packet, contentKind: 'ENTITY' } }),
    ];

    const groups = groupSavedContentPacketsByKind(packets);

    expect(groups).toHaveLength(2);
    const entityGroup = groups.find((g) => g.kind === 'ENTITY');
    const instGroup = groups.find((g) => g.kind === 'INSTITUTION');
    expect(entityGroup?.packets).toHaveLength(2);
    expect(instGroup?.packets).toHaveLength(1);
  });

  it('sorts groups alphabetically by displayLabel', () => {
    const packets = [
      makePacket({ id: '1', packet: { ...makePacket().packet, contentKind: 'RELATIONSHIP' } }),
      makePacket({ id: '2', packet: { ...makePacket().packet, contentKind: 'ENTITY' } }),
      makePacket({ id: '3', packet: { ...makePacket().packet, contentKind: 'INSTITUTION' } }),
    ];

    const groups = groupSavedContentPacketsByKind(packets);

    const labels = groups.map((g) => g.displayLabel);
    const sorted = [...labels].sort((a, b) => a.localeCompare(b));
    expect(labels).toEqual(sorted);
  });

  it('converts underscores to spaces in displayLabel', () => {
    const packets = [
      makePacket({
        id: '1',
        packet: { ...makePacket().packet, contentKind: 'SOCIAL_DYNAMIC' as never },
      }),
    ];

    const groups = groupSavedContentPacketsByKind(packets);

    expect(groups[0].displayLabel).toBe('SOCIAL DYNAMIC');
  });

  it('falls back to UNKNOWN for missing contentKind', () => {
    const packet = makePacket({ id: '1' });
    // Simulate missing contentKind
    const noKind = {
      ...packet,
      packet: { ...packet.packet, contentKind: undefined },
    } as unknown as SavedContentPacket;

    const groups = groupSavedContentPacketsByKind([noKind]);

    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe('UNKNOWN');
    expect(groups[0].displayLabel).toBe('UNKNOWN');
  });
});
