import {
  cloneConceptSeedPacket,
  type ConceptSeedPacket,
  projectConceptSeedPacket,
} from '../../../src/models/concept-seed-packet';
import { isConceptSeedPacket } from '../../../src/models/concept-seed-packet';

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

describe('isConceptSeedPacket', () => {
  it('validates a complete canonical content packet', () => {
    expect(isConceptSeedPacket(makeValidContentPacket())).toBe(true);
  });

  it('rejects when contentId is missing', () => {
    const packet = makeValidContentPacket();
    delete packet['contentId'];
    expect(isConceptSeedPacket(packet)).toBe(false);
  });

  it('rejects when interactionVerbs is empty', () => {
    const packet = { ...makeValidContentPacket(), interactionVerbs: [] };
    expect(isConceptSeedPacket(packet)).toBe(false);
  });

  it('clones canonical packets without sharing the interaction verbs array', () => {
    const packet = makeValidContentPacket() as ConceptSeedPacket;
    const cloned = cloneConceptSeedPacket(packet);

    expect(cloned).toEqual(packet);
    expect(cloned).not.toBe(packet);
    expect(cloned.interactionVerbs).not.toBe(packet.interactionVerbs);
  });

  it('projects packet-bearing sources to a lean canonical packet clone', () => {
    const packet = makeValidContentPacket() as ConceptSeedPacket;
    const projected = projectConceptSeedPacket({
      packet,
    });

    expect(projected).toEqual(packet);
    expect(projected).not.toBe(packet);
  });

  it('projects a direct projection object to a cloned concept seed packet', () => {
    const packet = makeValidContentPacket() as ConceptSeedPacket;

    const projected = projectConceptSeedPacket(packet);

    expect(projected).toEqual(packet);
    expect(projected).not.toBe(packet);
    expect(projected.interactionVerbs).not.toBe(packet.interactionVerbs);
  });
});
