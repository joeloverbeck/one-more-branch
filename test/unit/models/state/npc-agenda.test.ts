import {
  applyAgendaUpdates,
  createEmptyAccumulatedNpcAgendas,
} from '../../../../src/models/state/npc-agenda';
import type { NpcAgenda, AccumulatedNpcAgendas } from '../../../../src/models/state/npc-agenda';

function buildAgenda(overrides?: Partial<NpcAgenda>): NpcAgenda {
  return {
    npcName: 'Garak',
    currentGoal: 'Acquire the artifact',
    leverage: 'Knows the location of the vault',
    fear: 'Being exposed as a spy',
    offScreenBehavior: 'Gathering allies in the shadows',
    ...overrides,
  };
}

describe('createEmptyAccumulatedNpcAgendas', () => {
  it('returns an empty object', () => {
    const result = createEmptyAccumulatedNpcAgendas();
    expect(result).toEqual({});
  });
});

describe('applyAgendaUpdates', () => {
  it('returns current unchanged when updates are empty', () => {
    const current: AccumulatedNpcAgendas = {
      Garak: buildAgenda(),
    };
    const result = applyAgendaUpdates(current, []);
    expect(result).toBe(current); // reference equality — no copy
  });

  it('adds a new NPC agenda', () => {
    const current = createEmptyAccumulatedNpcAgendas();
    const update = buildAgenda({ npcName: 'Kira' });
    const result = applyAgendaUpdates(current, [update]);

    expect(result['Kira']).toEqual(update);
    expect(Object.keys(result)).toHaveLength(1);
  });

  it('replaces an existing NPC agenda by exact name match', () => {
    const original = buildAgenda({ currentGoal: 'Old goal' });
    const current: AccumulatedNpcAgendas = { Garak: original };
    const updated = buildAgenda({ currentGoal: 'New goal' });

    const result = applyAgendaUpdates(current, [updated]);
    expect(result['Garak'].currentGoal).toBe('New goal');
  });

  it('matches NPC names case-insensitively', () => {
    const original = buildAgenda({ npcName: 'Garak', currentGoal: 'Old goal' });
    const current: AccumulatedNpcAgendas = { Garak: original };
    const updated = buildAgenda({ npcName: 'garak', currentGoal: 'Updated goal' });

    const result = applyAgendaUpdates(current, [updated]);
    // Should update using the original key
    expect(result['Garak'].currentGoal).toBe('Updated goal');
    expect(result['Garak'].npcName).toBe('garak');
    expect(Object.keys(result)).toHaveLength(1);
  });

  it('preserves NPCs not in updates', () => {
    const current: AccumulatedNpcAgendas = {
      Garak: buildAgenda({ npcName: 'Garak' }),
      Kira: buildAgenda({ npcName: 'Kira', currentGoal: 'Defend the station' }),
    };
    const update = buildAgenda({ npcName: 'Garak', currentGoal: 'Escape' });

    const result = applyAgendaUpdates(current, [update]);
    expect(result['Garak'].currentGoal).toBe('Escape');
    expect(result['Kira'].currentGoal).toBe('Defend the station');
    expect(Object.keys(result)).toHaveLength(2);
  });

  it('handles multiple updates at once', () => {
    const current: AccumulatedNpcAgendas = {
      Garak: buildAgenda({ npcName: 'Garak', currentGoal: 'Old goal' }),
    };
    const updates: NpcAgenda[] = [
      buildAgenda({ npcName: 'Garak', currentGoal: 'New Garak goal' }),
      buildAgenda({ npcName: 'Odo', currentGoal: 'Maintain order' }),
    ];

    const result = applyAgendaUpdates(current, updates);
    expect(result['Garak'].currentGoal).toBe('New Garak goal');
    expect(result['Odo'].currentGoal).toBe('Maintain order');
    expect(Object.keys(result)).toHaveLength(2);
  });

  it('does not mutate the original current object', () => {
    const current: AccumulatedNpcAgendas = {
      Garak: buildAgenda({ npcName: 'Garak' }),
    };
    const update = buildAgenda({ npcName: 'Kira' });

    const result = applyAgendaUpdates(current, [update]);
    expect(Object.keys(current)).toHaveLength(1);
    expect(Object.keys(result)).toHaveLength(2);
  });
});
