import {
  isContentKind,
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

  it.each([
    ['INVALID'],
    ['entity'],
    [''],
    [null],
    [undefined],
    [42],
    [true],
  ])('rejects invalid value: %p', (value) => {
    expect(isContentKind(value)).toBe(false);
  });
});

describe('isContentPacketRole', () => {
  it.each(CONTENT_PACKET_ROLE_VALUES.map((v) => [v]))('accepts valid value: %s', (value) => {
    expect(isContentPacketRole(value)).toBe(true);
  });

  it.each([
    ['INVALID'],
    ['primary_seed'],
    [''],
    [null],
    [undefined],
    [42],
  ])('rejects invalid value: %p', (value) => {
    expect(isContentPacketRole(value)).toBe(false);
  });
});

describe('isRiskAppetite', () => {
  it.each(RISK_APPETITE_VALUES.map((v) => [v]))('accepts valid value: %s', (value) => {
    expect(isRiskAppetite(value)).toBe(true);
  });

  it.each([
    ['INVALID'],
    ['low'],
    [''],
    [null],
    [undefined],
    [42],
  ])('rejects invalid value: %p', (value) => {
    expect(isRiskAppetite(value)).toBe(false);
  });
});

function makeValidSavedContentPacket(): Record<string, unknown> {
  return {
    id: 'cp-1',
    name: 'Test Packet',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
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
    pinned: false,
    recommendedRole: 'PRIMARY_SEED',
  };
}

describe('isSavedContentPacket', () => {
  it('validates a complete valid object', () => {
    expect(isSavedContentPacket(makeValidSavedContentPacket())).toBe(true);
  });

  it('accepts with optional evaluation present', () => {
    const packet = {
      ...makeValidSavedContentPacket(),
      evaluation: {
        contentId: 'cp-1',
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

  const requiredStringFields = [
    'id',
    'name',
    'coreAnomaly',
    'humanAnchor',
    'socialEngine',
    'choicePressure',
    'signatureImage',
    'escalationPath',
    'wildnessInvariant',
    'dullCollapse',
  ] as const;

  it.each(requiredStringFields.map((f) => [f]))(
    'rejects when required string field "%s" is missing',
    (field) => {
      const packet = makeValidSavedContentPacket();
      delete packet[field];
      expect(isSavedContentPacket(packet)).toBe(false);
    }
  );

  it('rejects when contentKind is invalid', () => {
    const packet = { ...makeValidSavedContentPacket(), contentKind: 'INVALID' };
    expect(isSavedContentPacket(packet)).toBe(false);
  });

  it('rejects when interactionVerbs is empty', () => {
    const packet = { ...makeValidSavedContentPacket(), interactionVerbs: [] };
    expect(isSavedContentPacket(packet)).toBe(false);
  });

  it('rejects when pinned is missing', () => {
    const packet = makeValidSavedContentPacket();
    delete packet['pinned'];
    expect(isSavedContentPacket(packet)).toBe(false);
  });

  it('rejects when recommendedRole is invalid', () => {
    const packet = { ...makeValidSavedContentPacket(), recommendedRole: 'INVALID' };
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
