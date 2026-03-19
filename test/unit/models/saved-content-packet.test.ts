import {
  type SavedContentPacket,
  isContentPacketContext,
  isContentPacketOrigin,
  isContentPacketSourceArtifact,
  isSavedContentPacket,
  projectSavedConceptSeedPacket,
} from '../../../src/models/saved-content-packet';

function makeValidSavedContentPacket(): SavedContentPacket {
  return {
    id: 'cp-1',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    pinned: false,
    assetVersion: 2,
    packet: {
      contentId: 'pkt-01',
      contentKind: 'ENTITY',
      coreAnomaly: 'A sentient fog that digests memory',
      humanAnchor: 'A grieving archivist',
      socialEngine: 'A government bureau that licenses fog zones',
      choicePressure: 'Surrender memories or let others suffer',
      signatureImage: 'A child breathing silver mist from a jar',
      escalationPath: 'The fog learns to imitate the dead',
      wildnessInvariant: 'The fog must remain sentient and hungry',
      dullCollapse: 'Generic monster story',
      interactionVerbs: ['inhale', 'archive', 'negotiate', 'flee'],
    },
    context: {
      premiseSummary: 'A living fog feeds on memory and is now regulated by the state.',
      situationFrame: 'An archivist must enter a licensed fog zone to recover a stolen memory.',
      worldState: 'The bureau treats memory erosion as routine civic infrastructure.',
      viewpointPressure: 'The archivist cannot recover their family history any other way.',
    },
    origin: {
      generationMode: 'pipeline',
      sourceArtifacts: [
        {
          artifactType: 'SPARK',
          sourceId: 'spark-01',
          contentKind: 'ENTITY',
          summary: 'A sentient fog that eats memory',
          imageSeed: 'A child breathing silver mist from a jar',
          collisionTags: ['memory loss', 'bureaucracy'],
        },
      ],
    },
  };
}

describe('isContentPacketContext', () => {
  it('accepts complete context blocks', () => {
    expect(isContentPacketContext(makeValidSavedContentPacket().context)).toBe(true);
  });

  it('rejects context blocks missing required fields', () => {
    expect(
      isContentPacketContext({
        premiseSummary: 'present',
        situationFrame: 'present',
      })
    ).toBe(false);
  });
});

describe('isContentPacketSourceArtifact', () => {
  it('accepts complete source artifacts', () => {
    expect(isContentPacketSourceArtifact(makeValidSavedContentPacket().origin.sourceArtifacts[0])).toBe(
      true
    );
  });

  it('rejects artifacts with invalid content kind', () => {
    expect(
      isContentPacketSourceArtifact({
        artifactType: 'SPARK',
        sourceId: 'spark-01',
        contentKind: 'INVALID',
        summary: 'bad kind',
      })
    ).toBe(false);
  });
});

describe('isContentPacketOrigin', () => {
  it('accepts origins with one or more source artifacts', () => {
    expect(isContentPacketOrigin(makeValidSavedContentPacket().origin)).toBe(true);
  });

  it('rejects origins with no source artifacts', () => {
    expect(
      isContentPacketOrigin({
        generationMode: 'quick',
        sourceArtifacts: [],
      })
    ).toBe(false);
  });
});

describe('isSavedContentPacket', () => {
  it('validates a complete v2 saved content packet', () => {
    expect(isSavedContentPacket(makeValidSavedContentPacket())).toBe(true);
  });

  it('accepts optional evaluation metadata', () => {
    const packet = {
      ...makeValidSavedContentPacket(),
      evaluation: {
        contentId: 'pkt-01',
        scores: {
          imageCharge: 4,
          humanAche: 3,
          socialLoadBearing: 5,
          branchingPressure: 4,
          antiGenericity: 5,
          sceneBurst: 3,
          structuralIrony: 4,
          conceptUtility: 5,
        },
        strengths: ['vivid imagery'],
        weaknesses: ['narrow scope'],
        recommendedRole: 'PRIMARY_SEED',
      },
    };

    expect(isSavedContentPacket(packet)).toBe(true);
  });

  it('rejects the previous packet-plus-provenance shape', () => {
    expect(
      isSavedContentPacket({
        id: 'cp-1',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        pinned: false,
        packet: makeValidSavedContentPacket().packet,
        provenance: { generationMode: 'quick' },
      })
    ).toBe(false);
  });

  it('rejects when assetVersion is missing', () => {
    const packet = { ...makeValidSavedContentPacket() } as Record<string, unknown>;
    delete packet['assetVersion'];
    expect(isSavedContentPacket(packet)).toBe(false);
  });

  it('rejects when context is missing', () => {
    const packet = { ...makeValidSavedContentPacket() } as Record<string, unknown>;
    delete packet['context'];
    expect(isSavedContentPacket(packet)).toBe(false);
  });

  it('rejects when origin has no source artifacts', () => {
    const packet = {
      ...makeValidSavedContentPacket(),
      origin: {
        generationMode: 'pipeline',
        sourceArtifacts: [],
      },
    };

    expect(isSavedContentPacket(packet)).toBe(false);
  });

  it('rejects legacy flattened packets that still persist packet fields at the top level', () => {
    const legacyPacket = {
      ...makeValidSavedContentPacket(),
      name: 'Legacy Packet',
      contentKind: 'ENTITY',
      coreAnomaly: 'flattened',
    };

    expect(isSavedContentPacket(legacyPacket)).toBe(false);
  });

  it('rejects null and non-object inputs', () => {
    expect(isSavedContentPacket(null)).toBe(false);
    expect(isSavedContentPacket('string')).toBe(false);
  });
});

describe('projectSavedConceptSeedPacket', () => {
  it('returns a cloned lean packet projection', () => {
    const savedPacket = makeValidSavedContentPacket();
    const projected = projectSavedConceptSeedPacket(savedPacket);

    expect(projected).toEqual(savedPacket.packet);
    expect(projected).not.toBe(savedPacket.packet);
    expect(projected.interactionVerbs).not.toBe(savedPacket.packet.interactionVerbs);
  });
});
