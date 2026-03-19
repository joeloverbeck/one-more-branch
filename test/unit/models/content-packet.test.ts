import {
  isContentKind,
  isContentPacket,
  isContentPacketRole,
  isRiskAppetite,
  CONTENT_KIND_VALUES,
  CONTENT_PACKET_ROLE_VALUES,
  RISK_APPETITE_VALUES,
} from '../../../src/models/content-packet';
import {
  isSavedContentPacket,
  isSavedTasteProfile,
} from '../../../src/models/saved-content-packet';

describe('isContentKind', () => {
  it.each(CONTENT_KIND_VALUES.map((v) => [v]))('accepts valid value: %s', (value) => {
    expect(isContentKind(value)).toBe(true);
  });

  it.each([['INVALID'], ['entity'], [''], [null], [undefined], [42], [true]])(
    'rejects invalid value: %p',
    (value) => {
      expect(isContentKind(value)).toBe(false);
    }
  );
});

describe('isContentPacketRole', () => {
  it.each(CONTENT_PACKET_ROLE_VALUES.map((v) => [v]))('accepts valid value: %s', (value) => {
    expect(isContentPacketRole(value)).toBe(true);
  });

  it.each([['INVALID'], ['primary_seed'], [''], [null], [undefined], [42]])(
    'rejects invalid value: %p',
    (value) => {
      expect(isContentPacketRole(value)).toBe(false);
    }
  );
});

describe('isRiskAppetite', () => {
  it.each(RISK_APPETITE_VALUES.map((v) => [v]))('accepts valid value: %s', (value) => {
    expect(isRiskAppetite(value)).toBe(true);
  });

  it.each([['INVALID'], ['low'], [''], [null], [undefined], [42]])(
    'rejects invalid value: %p',
    (value) => {
      expect(isRiskAppetite(value)).toBe(false);
    }
  );
});

function makeValidSavedContentPacket(): Record<string, unknown> {
  return {
    id: 'cp-1',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    pinned: false,
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
    provenance: {
      generationMode: 'quick',
    },
  };
}

function makeValidContentPacket(): Record<string, unknown> {
  return {
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
  };
}

describe('isContentPacket', () => {
  it('validates a complete canonical content packet', () => {
    expect(isContentPacket(makeValidContentPacket())).toBe(true);
  });

  it('rejects when contentId is missing', () => {
    const packet = makeValidContentPacket();
    delete packet['contentId'];
    expect(isContentPacket(packet)).toBe(false);
  });

  it('rejects when interactionVerbs is empty', () => {
    const packet = { ...makeValidContentPacket(), interactionVerbs: [] };
    expect(isContentPacket(packet)).toBe(false);
  });
});

describe('isSavedContentPacket', () => {
  it('validates a complete valid object', () => {
    expect(isSavedContentPacket(makeValidSavedContentPacket())).toBe(true);
  });

  it('accepts with optional evaluation present', () => {
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

  const requiredFields = [
    'id',
    'packet',
  ] as const;

  it.each(requiredFields.map((f) => [f]))(
    'rejects when required field "%s" is missing',
    (field) => {
      const packet = makeValidSavedContentPacket();
      delete packet[field];
      expect(isSavedContentPacket(packet)).toBe(false);
    }
  );

  it('rejects when contentKind is invalid', () => {
    const packet = {
      ...makeValidSavedContentPacket(),
      packet: { ...makeValidContentPacket(), contentKind: 'INVALID' },
    };
    expect(isSavedContentPacket(packet)).toBe(false);
  });

  it('rejects when nested interactionVerbs is empty', () => {
    const packet = {
      ...makeValidSavedContentPacket(),
      packet: { ...makeValidContentPacket(), interactionVerbs: [] },
    };
    expect(isSavedContentPacket(packet)).toBe(false);
  });

  it('rejects when pinned is missing', () => {
    const packet = makeValidSavedContentPacket();
    delete packet['pinned'];
    expect(isSavedContentPacket(packet)).toBe(false);
  });

  it('rejects when provenance is invalid', () => {
    const packet = {
      ...makeValidSavedContentPacket(),
      provenance: { generationMode: 'pipeline', sourceSparkIds: [] },
    };
    expect(isSavedContentPacket(packet)).toBe(false);
  });

  it('rejects when createdAt is not a valid date', () => {
    const packet = { ...makeValidSavedContentPacket(), createdAt: 'not-a-date' };
    expect(isSavedContentPacket(packet)).toBe(false);
  });

  it('rejects null', () => {
    expect(isSavedContentPacket(null)).toBe(false);
  });

  it('rejects a non-object', () => {
    expect(isSavedContentPacket('string')).toBe(false);
  });

  it('rejects legacy flattened packets that still persist name', () => {
    const legacyPacket = {
      ...makeValidSavedContentPacket(),
      name: 'Legacy Packet',
      contentKind: 'ENTITY',
      coreAnomaly: 'flattened',
    };

    expect(isSavedContentPacket(legacyPacket)).toBe(false);
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

  it.each(requiredArrayFields.map((f) => [f]))(
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
