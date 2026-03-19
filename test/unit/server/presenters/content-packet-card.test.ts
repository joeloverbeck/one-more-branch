import type { ContentPacket } from '@/models/content-packet';
import type { SavedContentPacket } from '@/models/saved-content-packet';
import {
  buildContentPacketCardViewModel,
  buildSavedContentPacketCardWithRecommendedRole,
  CONTENT_PACKET_CARD_FIELD_REGISTRY,
} from '@/server/presenters/content-packet-card';

function makeContentPacket(overrides: Partial<ContentPacket> = {}): ContentPacket {
  return {
    contentId: 'pkt-01',
    contentKind: 'ENTITY',
    coreAnomaly: 'Test anomaly',
    humanAnchor: 'Human anchor',
    socialEngine: 'Social engine',
    choicePressure: 'Choice pressure',
    signatureImage: 'Signature image',
    escalationPath: 'Escalation path',
    wildnessInvariant: 'Wildness invariant',
    dullCollapse: 'Dull collapse',
    interactionVerbs: ['observe', 'trade', 'rupture', 'escalate'],
    ...overrides,
  };
}

function makeSavedPacket(overrides: Partial<SavedContentPacket> = {}): SavedContentPacket {
  return {
    id: 'saved-1',
    createdAt: '2026-03-19T10:00:00.000Z',
    updatedAt: '2026-03-19T10:00:00.000Z',
    pinned: true,
    assetVersion: 2,
    packet: makeContentPacket(),
    context: {
      premiseSummary: 'A charged premise summary',
      situationFrame: 'A volatile situation frame',
      worldState: 'A legible world state',
    },
    origin: {
      generationMode: 'quick',
      sourceArtifacts: [
        {
          artifactType: 'EXEMPLAR',
          sourceId: 'exemplar-01',
          contentKind: 'ENTITY',
          summary: 'An exemplar that drove the packet',
        },
      ],
    },
    evaluation: {
      contentId: 'pkt-01',
      scores: {
        imageCharge: 8,
        humanAche: 7,
        socialLoadBearing: 9,
        branchingPressure: 6,
        antiGenericity: 8,
        sceneBurst: 7,
        structuralIrony: 8,
        conceptUtility: 9,
      },
      strengths: ['Strong image'],
      weaknesses: ['Minor weakness'],
      recommendedRole: 'PRIMARY_SEED',
    },
    ...overrides,
  };
}

describe('content packet card presenter', () => {
  it('keeps the registry exhaustive and in canonical order', () => {
    const expectedFieldOrder = Object.keys(makeContentPacket());

    expect(CONTENT_PACKET_CARD_FIELD_REGISTRY.map((field) => field.key)).toEqual(expectedFieldOrder);
    expect(new Set(CONTENT_PACKET_CARD_FIELD_REGISTRY.map((field) => field.key)).size).toBe(
      expectedFieldOrder.length
    );
  });

  it('omits contentKind from grouped saved packet cards', () => {
    const card = buildSavedContentPacketCardWithRecommendedRole(makeSavedPacket());

    expect(card.details.map((detail) => detail.key)).not.toContain('contentKind');
    expect(card.metaDetails).toEqual([
      expect.objectContaining({ key: 'recommendedRole', value: 'PRIMARY_SEED' }),
    ]);
  });

  it('includes contentKind for ungrouped generated cards and preserves array values', () => {
    const card = buildContentPacketCardViewModel(makeContentPacket(), {
      includeContentKind: true,
    });

    expect(card.details.map((detail) => detail.key)).toContain('contentKind');
    expect(card.details).toContainEqual(
      expect.objectContaining({
        key: 'interactionVerbs',
        value: ['observe', 'trade', 'rupture', 'escalate'],
      })
    );
  });
});
