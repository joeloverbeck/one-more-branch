import {
  applyRelationshipUpdates,
  createEmptyAccumulatedNpcRelationships,
} from '../../../../src/models/state/npc-relationship';
import type {
  NpcRelationship,
  AccumulatedNpcRelationships,
} from '../../../../src/models/state/npc-relationship';

function buildRelationship(overrides?: Partial<NpcRelationship>): NpcRelationship {
  return {
    npcName: 'Garak',
    valence: 2,
    dynamic: 'ally',
    history: 'Met during the siege of Thornwall.',
    currentTension: 'Garak suspects the protagonist is hiding something.',
    leverage: 'Knows the location of the vault.',
    ...overrides,
  };
}

describe('createEmptyAccumulatedNpcRelationships', () => {
  it('returns an empty object', () => {
    const result = createEmptyAccumulatedNpcRelationships();
    expect(result).toEqual({});
  });
});

describe('applyRelationshipUpdates', () => {
  it('returns current unchanged when updates are empty', () => {
    const current: AccumulatedNpcRelationships = {
      Garak: buildRelationship(),
    };
    const result = applyRelationshipUpdates(current, []);
    expect(result).toBe(current); // reference equality — no copy
  });

  it('adds a new NPC relationship', () => {
    const current = createEmptyAccumulatedNpcRelationships();
    const update = buildRelationship({ npcName: 'Kira' });
    const result = applyRelationshipUpdates(current, [update]);

    expect(result['Kira']).toEqual(update);
    expect(Object.keys(result)).toHaveLength(1);
  });

  it('replaces an existing NPC relationship by exact name match', () => {
    const original = buildRelationship({ valence: 2 });
    const current: AccumulatedNpcRelationships = { Garak: original };
    const updated = buildRelationship({ valence: -3, dynamic: 'rival' });

    const result = applyRelationshipUpdates(current, [updated]);
    expect(result['Garak'].valence).toBe(-3);
    expect(result['Garak'].dynamic).toBe('rival');
  });

  it('matches NPC names case-insensitively', () => {
    const original = buildRelationship({ npcName: 'Garak', valence: 2 });
    const current: AccumulatedNpcRelationships = { Garak: original };
    const updated = buildRelationship({ npcName: 'garak', valence: 4 });

    const result = applyRelationshipUpdates(current, [updated]);
    // Should update using the original key
    expect(result['Garak'].valence).toBe(4);
    expect(result['Garak'].npcName).toBe('garak');
    expect(Object.keys(result)).toHaveLength(1);
  });

  it('preserves NPCs not in updates', () => {
    const current: AccumulatedNpcRelationships = {
      Garak: buildRelationship({ npcName: 'Garak' }),
      Kira: buildRelationship({ npcName: 'Kira', valence: -1 }),
    };
    const update = buildRelationship({ npcName: 'Garak', valence: 5 });

    const result = applyRelationshipUpdates(current, [update]);
    expect(result['Garak'].valence).toBe(5);
    expect(result['Kira'].valence).toBe(-1);
    expect(Object.keys(result)).toHaveLength(2);
  });

  it('handles multiple updates at once', () => {
    const current: AccumulatedNpcRelationships = {
      Garak: buildRelationship({ npcName: 'Garak', valence: 0 }),
    };
    const updates: NpcRelationship[] = [
      buildRelationship({ npcName: 'Garak', valence: 3 }),
      buildRelationship({ npcName: 'Odo', valence: -2, dynamic: 'adversary' }),
    ];

    const result = applyRelationshipUpdates(current, updates);
    expect(result['Garak'].valence).toBe(3);
    expect(result['Odo'].valence).toBe(-2);
    expect(Object.keys(result)).toHaveLength(2);
  });

  it('does not mutate the original current object', () => {
    const current: AccumulatedNpcRelationships = {
      Garak: buildRelationship({ npcName: 'Garak' }),
    };
    const update = buildRelationship({ npcName: 'Kira' });

    const result = applyRelationshipUpdates(current, [update]);
    expect(Object.keys(current)).toHaveLength(1);
    expect(Object.keys(result)).toHaveLength(2);
  });
});
