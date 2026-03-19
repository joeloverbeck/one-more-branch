import { createSavedContentPacketArtifact } from '@/server/services/content-packet-artifact';
import type { ContentEvaluation, GeneratedContentPacket } from '@/models/content-packet';

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

  it('preserves quick-mode exemplar lineage without heuristics', () => {
    const candidate = makeCandidate({
      origin: {
        generationMode: 'quick',
        sourceArtifacts: [
          {
            artifactType: 'EXEMPLAR',
            sourceId: 'exemplar-01',
            summary: 'An exemplar summary',
          },
          {
            artifactType: 'EXEMPLAR',
            sourceId: 'exemplar-02',
            summary: 'Another exemplar summary',
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
