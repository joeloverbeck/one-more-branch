import type { ContentPacket, GeneratedContentPacket } from '@/models/content-packet';
import type { SavedContentPacket } from '@/models/saved-content-packet';
import {
  buildGeneratedContentPacketCardViewModel,
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

function makeGeneratedPacket(
  overrides: Partial<GeneratedContentPacket> = {}
): GeneratedContentPacket {
  return {
    packet: makeContentPacket(),
    context: {
      premiseSummary: 'A charged premise summary',
      situationFrame: 'A volatile situation frame',
      worldState: 'A legible world state',
    },
    origin: {
      generationMode: 'pipeline',
      sourceArtifacts: [
        {
          artifactType: 'SPARK',
          sourceId: 'spark-01',
          contentKind: 'ENTITY',
          summary: 'A spark that drove the packet',
          imageSeed: 'Floodlit salvage rig',
          collisionTags: ['salt', 'debt'],
        },
      ],
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

  it('omits contentKind from grouped saved packet cards and exposes sectioned details', () => {
    const card = buildSavedContentPacketCardWithRecommendedRole(makeSavedPacket());

    expect(card.contextDetails.map((detail) => detail.key)).toEqual([
      'premiseSummary',
      'situationFrame',
      'worldState',
    ]);
    expect(card.packetDetails.map((detail) => detail.key)).not.toContain('contentKind');
    expect(card.originDetails).toEqual([
      expect.objectContaining({ key: 'generationMode', value: 'quick' }),
      expect.objectContaining({
        key: 'sourceArtifact-1',
        label: 'Source Artifact 1',
        value: [
          'Type: EXEMPLAR',
          'Source ID: exemplar-01',
          'Kind: ENTITY',
          'Summary: An exemplar that drove the packet',
        ],
      }),
    ]);
    expect(card.metaDetails).toEqual([
      expect.objectContaining({ key: 'recommendedRole', value: 'PRIMARY_SEED' }),
    ]);
  });

  it('includes contentKind for generated cards and preserves section ordering', () => {
    const card = buildGeneratedContentPacketCardViewModel(makeGeneratedPacket(), {
      includeContentKind: true,
    });

    expect(card.contextDetails.map((detail) => detail.label)).toEqual([
      'Premise Summary',
      'Situation Frame',
      'World State',
    ]);
    expect(card.packetDetails.map((detail) => detail.key)).toContain('contentKind');
    expect(card.packetDetails).toContainEqual(
      expect.objectContaining({
        key: 'interactionVerbs',
        value: ['observe', 'trade', 'rupture', 'escalate'],
      })
    );
    expect(card.originDetails).toEqual([
      expect.objectContaining({ key: 'generationMode', value: 'pipeline' }),
      expect.objectContaining({
        key: 'sourceArtifact-1',
        value: [
          'Type: SPARK',
          'Source ID: spark-01',
          'Kind: ENTITY',
          'Summary: A spark that drove the packet',
          'Image Seed: Floodlit salvage rig',
          'Collision Tags: salt, debt',
        ],
      }),
    ]);
  });
});
