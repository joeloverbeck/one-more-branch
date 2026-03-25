import { createSavedContentPacketArtifact } from '@/server/services/saved-content-packet-artifact';
import type {
  ContentEvaluation,
  GeneratedContentPacket,
} from '@/models/content-generation-contracts';

function makeCandidate(overrides: Partial<GeneratedContentPacket> = {}): GeneratedContentPacket {
  return {
    packet: {
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
    },
    context: {
      premiseSummary: 'A premise summary',
      situationFrame: 'A situation frame',
      worldState: 'A world state',
      playerPosition: 'You are the only actor who can still alter the arrangement.',
    },
    origin: {
      generationMode: 'pipeline',
      sourceArtifacts: [
        {
          artifactType: 'SPARK',
          sourceId: 'spark-01',
          contentKind: 'ENTITY',
          summary: 'A spark summary',
          imageSeed: 'A spark image',
          collisionTags: ['tag-a'],
        },
      ],
    },
    ...overrides,
  };
}

function makeEvaluation(overrides: Partial<ContentEvaluation> = {}): ContentEvaluation {
  return {
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
    redundancyCluster: null,
    ...overrides,
  };
}

describe('createSavedContentPacketArtifact', () => {
  it('builds a v2 saved asset from a valid generated candidate', () => {
    const candidate = makeCandidate();
    const evaluation = makeEvaluation();

    const result = createSavedContentPacketArtifact({
      id: 'cp-01',
      now: '2026-03-19T12:00:00.000Z',
      candidate,
      evaluation,
    });

    expect(result).toEqual({
      id: 'cp-01',
      createdAt: '2026-03-19T12:00:00.000Z',
      updatedAt: '2026-03-19T12:00:00.000Z',
      pinned: false,
      assetVersion: 2,
      packet: candidate.packet,
      context: candidate.context,
      origin: candidate.origin,
      evaluation,
    });
    expect(result.packet).not.toBe(candidate.packet);
    expect(result.packet.interactionVerbs).not.toBe(candidate.packet.interactionVerbs);
    expect(result.context).not.toBe(candidate.context);
    expect(result.origin).not.toBe(candidate.origin);
    expect(result.origin.sourceArtifacts).not.toBe(candidate.origin.sourceArtifacts);
  });

  it('preserves pipeline spark lineage without heuristics', () => {
    const candidate = makeCandidate({
      origin: {
        generationMode: 'pipeline',
        sourceArtifacts: [
          {
            artifactType: 'SPARK',
            sourceId: 'spark-01',
            contentKind: 'ENTITY',
            summary: 'A spark summary',
            imageSeed: 'A spark image',
            collisionTags: ['tag-a'],
          },
          {
            artifactType: 'SPARK',
            sourceId: 'spark-02',
            contentKind: 'INSTITUTION',
            summary: 'Another spark summary',
            imageSeed: 'Another spark image',
            collisionTags: ['tag-b'],
          },
        ],
      },
    });

    const result = createSavedContentPacketArtifact({
      id: 'cp-quick',
      now: '2026-03-19T12:00:00.000Z',
      candidate,
    });

    expect(result.origin).toEqual(candidate.origin);
  });

  it('rejects packet-only legacy payloads', () => {
    expect(() =>
      createSavedContentPacketArtifact({
        id: 'cp-invalid',
        now: '2026-03-19T12:00:00.000Z',
        candidate: makeCandidate().packet,
      })
    ).toThrow('Save candidate must include packet, context, and origin artifacts');
  });

  it('rejects candidates missing required origin artifacts', () => {
    const candidate = {
      ...makeCandidate(),
      origin: {
        generationMode: 'pipeline',
        sourceArtifacts: [],
      },
    };

    expect(() =>
      createSavedContentPacketArtifact({
        id: 'cp-invalid',
        now: '2026-03-19T12:00:00.000Z',
        candidate,
      })
    ).toThrow('Save candidate must include packet, context, and origin artifacts');
  });

  it('rejects invalid evaluation payloads', () => {
    expect(() =>
      createSavedContentPacketArtifact({
        id: 'cp-invalid',
        now: '2026-03-19T12:00:00.000Z',
        candidate: makeCandidate(),
        evaluation: { contentId: 'pkt-01' },
      })
    ).toThrow('Packet evaluation must match the content evaluation contract');
  });
});
