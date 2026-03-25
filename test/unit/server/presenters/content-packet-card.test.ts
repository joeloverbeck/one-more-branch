import type { GeneratedContentPacket } from '@/models/content-generation-contracts';
import type { ConceptSeedPacket } from '@/models/concept-seed-packet';
import type { SavedContentPacket } from '@/models/saved-content-packet';
import {
  buildGeneratedContentPacketCardViewModel,
  buildSavedContentPacketCardWithRecommendedRole,
  CONTENT_PACKET_CARD_FIELD_REGISTRY,
} from '@/server/presenters/content-packet-card';

function makeConceptSeedPacket(overrides: Partial<ConceptSeedPacket> = {}): ConceptSeedPacket {
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
    packet: makeConceptSeedPacket(),
    context: {
      premiseSummary: 'A charged premise summary',
      situationFrame: 'A volatile situation frame',
      worldState: 'A legible world state',
      playerPosition: 'You are the only witness with standing to act.',
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
    evaluation: {
      contentId: 'pkt-01',
      scores: {
        imageCharge: 5,
        humanAche: 4,
        socialLoadBearing: 5,
        branchingPressure: 4,
        surfaceFreshness: 5,
        deepOriginality: 4,
        sceneBurst: 4,
        structuralIrony: 5,
        tasteAlignment: 5,
        causalSpecificity: 4,
      },
      strengths: ['Strong image'],
      weaknesses: ['Minor weakness'],
      recommendedRole: 'PRIMARY_SEED',
      redundancyCluster: 'pkt-02',
    },
    ...overrides,
  };
}

function makeGeneratedPacket(
  overrides: Partial<GeneratedContentPacket> = {}
): GeneratedContentPacket {
  return {
    packet: makeConceptSeedPacket(),
    context: {
      premiseSummary: 'A charged premise summary',
      situationFrame: 'A volatile situation frame',
      worldState: 'A legible world state',
      playerPosition: 'You are the designated fixer trapped inside the arrangement.',
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
    const expectedFieldOrder = Object.keys(makeConceptSeedPacket());

    expect(CONTENT_PACKET_CARD_FIELD_REGISTRY.map((field) => field.key)).toEqual(
      expectedFieldOrder
    );
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
      'playerPosition',
    ]);
    expect(card.packetDetails.map((detail) => detail.key)).not.toContain('contentKind');
    expect(card.originDetails).toEqual([
      expect.objectContaining({ key: 'generationMode', value: 'pipeline' }),
      expect.objectContaining({
        key: 'sourceArtifact-1',
        label: 'Source Artifact 1',
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
    expect(card.metaDetails).toEqual([
      expect.objectContaining({ key: 'recommendedRole', value: 'PRIMARY_SEED' }),
      expect.objectContaining({ key: 'redundancyCluster', value: 'pkt-02' }),
    ]);
    expect(card.evaluationDetails?.scores.map((score) => score.key)).toEqual([
      'imageCharge',
      'humanAche',
      'socialLoadBearing',
      'branchingPressure',
      'surfaceFreshness',
      'deepOriginality',
      'sceneBurst',
      'structuralIrony',
      'tasteAlignment',
      'causalSpecificity',
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
      'Player Position',
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
