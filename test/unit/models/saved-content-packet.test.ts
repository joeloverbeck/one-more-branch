import {
  type SavedContentPacket,
  isSavedContentPacket,
  isSavedTasteProfile,
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
      playerPosition:
        'You are the archivist entering the fog zone because your family history cannot be recovered any other way.',
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
          surfaceFreshness: 5,
          deepOriginality: 4,
          sceneBurst: 3,
          structuralIrony: 4,
          tasteAlignment: 5,
          causalSpecificity: 4,
        },
        strengths: ['vivid imagery'],
        weaknesses: ['narrow scope'],
        recommendedRole: 'PRIMARY_SEED',
        redundancyCluster: null,
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

  it('rejects legacy context that still uses viewpointPressure', () => {
    const packet = {
      ...makeValidSavedContentPacket(),
      context: {
        premiseSummary: 'A living fog feeds on memory and is now regulated by the state.',
        situationFrame: 'An archivist must enter a licensed fog zone to recover a stolen memory.',
        worldState: 'The bureau treats memory erosion as routine civic infrastructure.',
        viewpointPressure: 'legacy field',
      },
    };

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

function makeValidSavedTasteProfile(): Record<string, unknown> {
  return {
    id: 'tp-1',
    name: 'Test Profile',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    collisionPatterns: ['body horror meets bureaucracy'],
    favoredMechanisms: ['transformation'],
    humanAnchors: ['grief', 'shame'],
    socialEngines: ['licensing bureau'],
    toneBlend: ['dark comedy'],
    sceneAppetites: ['visceral transformation'],
    antiPatterns: ['chosen one narrative'],
    surfaceDoNotRepeat: ['fog', 'mist'],
    riskAppetite: 'HIGH',
    engagementModes: ['puzzle-solving', 'moral dilemma'],
    valueTensions: ['duty vs desire', 'truth vs stability'],
    deepPatterns: ['erosion of certainty', 'institutional betrayal'],
  };
}

describe('isSavedTasteProfile', () => {
  it('validates a complete valid object', () => {
    expect(isSavedTasteProfile(makeValidSavedTasteProfile())).toBe(true);
  });

  const requiredArrayFields = [
    'collisionPatterns',
    'favoredMechanisms',
    'humanAnchors',
    'socialEngines',
    'toneBlend',
    'sceneAppetites',
    'antiPatterns',
  ] as const;

  it.each(requiredArrayFields.map((field) => [field]))(
    'rejects when required array field "%s" is empty',
    (field) => {
      const profile = makeValidSavedTasteProfile();
      profile[field] = [];
      expect(isSavedTasteProfile(profile)).toBe(false);
    }
  );

  it('accepts when surfaceDoNotRepeat is empty', () => {
    const profile = { ...makeValidSavedTasteProfile(), surfaceDoNotRepeat: [] };
    expect(isSavedTasteProfile(profile)).toBe(true);
  });

  it('accepts when new array fields are empty', () => {
    const profile = {
      ...makeValidSavedTasteProfile(),
      engagementModes: [],
      valueTensions: [],
      deepPatterns: [],
    };
    expect(isSavedTasteProfile(profile)).toBe(true);
  });

  it('accepts when new array fields have values', () => {
    const profile = makeValidSavedTasteProfile();
    expect(isSavedTasteProfile(profile)).toBe(true);
    expect(profile['engagementModes']).toEqual([
      'puzzle-solving',
      'moral dilemma',
    ]);
  });

  it('rejects when riskAppetite is invalid', () => {
    const profile = { ...makeValidSavedTasteProfile(), riskAppetite: 'EXTREME' };
    expect(isSavedTasteProfile(profile)).toBe(false);
  });

  it('rejects when id is missing', () => {
    const profile = makeValidSavedTasteProfile();
    delete profile['id'];
    expect(isSavedTasteProfile(profile)).toBe(false);
  });

  it('rejects null', () => {
    expect(isSavedTasteProfile(null)).toBe(false);
  });

  it('rejects a non-object', () => {
    expect(isSavedTasteProfile(42)).toBe(false);
  });
});
