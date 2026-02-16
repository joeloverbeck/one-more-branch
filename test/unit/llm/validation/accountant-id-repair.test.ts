import { repairAccountantIdFieldMismatches } from '../../../../src/llm/validation/accountant-id-repair';

function createValidPayload(): Record<string, unknown> {
  return {
    stateIntents: {
      currentLocation: 'The docks',
      threats: { add: [], removeIds: ['th-1'] },
      constraints: { add: [], removeIds: ['cn-2'] },
      threads: { add: [], resolveIds: ['td-3'] },
      inventory: { add: [], removeIds: ['inv-4'] },
      health: { add: [], removeIds: ['hp-5'] },
      characterState: { add: [], removeIds: ['cs-6'] },
      canon: { worldAdd: [], characterAdd: [] },
    },
  };
}

describe('repairAccountantIdFieldMismatches', () => {
  it('passes through valid IDs unchanged', () => {
    const payload = createValidPayload();
    const { repairedJson, filteredIds } = repairAccountantIdFieldMismatches(payload);
    expect(filteredIds).toHaveLength(0);

    const intents = (repairedJson as { stateIntents: Record<string, unknown> }).stateIntents;
    expect((intents.threats as { removeIds: string[] }).removeIds).toEqual(['th-1']);
    expect((intents.constraints as { removeIds: string[] }).removeIds).toEqual(['cn-2']);
    expect((intents.threads as { resolveIds: string[] }).resolveIds).toEqual(['td-3']);
    expect((intents.inventory as { removeIds: string[] }).removeIds).toEqual(['inv-4']);
    expect((intents.health as { removeIds: string[] }).removeIds).toEqual(['hp-5']);
    expect((intents.characterState as { removeIds: string[] }).removeIds).toEqual(['cs-6']);
  });

  it('filters pr-* IDs from threads.resolveIds', () => {
    const payload = createValidPayload();
    (payload.stateIntents as { threads: { resolveIds: string[] } }).threads.resolveIds = [
      'td-3',
      'pr-17',
    ];

    const { repairedJson, filteredIds } = repairAccountantIdFieldMismatches(payload);
    expect(filteredIds).toHaveLength(1);
    expect(filteredIds[0]).toEqual({
      field: 'threads.resolveIds',
      value: 'pr-17',
      expectedPrefix: 'td-',
    });

    const intents = (repairedJson as { stateIntents: Record<string, unknown> }).stateIntents;
    expect((intents.threads as { resolveIds: string[] }).resolveIds).toEqual(['td-3']);
  });

  it('filters cross-prefix IDs from threats.removeIds', () => {
    const payload = createValidPayload();
    (payload.stateIntents as { threats: { removeIds: string[] } }).threats.removeIds = [
      'cn-9',
      'th-2',
    ];

    const { repairedJson, filteredIds } = repairAccountantIdFieldMismatches(payload);
    expect(filteredIds).toHaveLength(1);
    expect(filteredIds[0]!.value).toBe('cn-9');
    expect(filteredIds[0]!.expectedPrefix).toBe('th-');

    const intents = (repairedJson as { stateIntents: Record<string, unknown> }).stateIntents;
    expect((intents.threats as { removeIds: string[] }).removeIds).toEqual(['th-2']);
  });

  it('filters multiple mismatched IDs across different fields', () => {
    const payload = createValidPayload();
    const intents = payload.stateIntents as Record<string, { removeIds?: string[]; resolveIds?: string[] }>;
    intents.threats!.removeIds = ['pr-1', 'th-5'];
    intents.threads!.resolveIds = ['pr-17', 'inv-3'];
    intents.inventory!.removeIds = ['hp-2'];

    const { repairedJson, filteredIds } = repairAccountantIdFieldMismatches(payload);
    expect(filteredIds).toHaveLength(4);

    const repaired = (repairedJson as { stateIntents: Record<string, unknown> }).stateIntents;
    expect((repaired.threats as { removeIds: string[] }).removeIds).toEqual(['th-5']);
    expect((repaired.threads as { resolveIds: string[] }).resolveIds).toEqual([]);
    expect((repaired.inventory as { removeIds: string[] }).removeIds).toEqual([]);
  });

  it('returns input unchanged when no stateIntents present', () => {
    const payload = { someOtherField: 'value' };
    const { repairedJson, filteredIds } = repairAccountantIdFieldMismatches(payload);
    expect(filteredIds).toHaveLength(0);
    expect(repairedJson).toEqual(payload);
  });

  it('returns input unchanged for null/undefined', () => {
    expect(repairAccountantIdFieldMismatches(null).filteredIds).toHaveLength(0);
    expect(repairAccountantIdFieldMismatches(undefined).filteredIds).toHaveLength(0);
  });

  it('handles empty arrays without errors', () => {
    const payload = createValidPayload();
    const intents = payload.stateIntents as Record<string, { removeIds?: string[]; resolveIds?: string[] }>;
    intents.threats!.removeIds = [];
    intents.threads!.resolveIds = [];

    const { filteredIds } = repairAccountantIdFieldMismatches(payload);
    expect(filteredIds).toHaveLength(0);
  });

  it('does not mutate the original input', () => {
    const payload = createValidPayload();
    (payload.stateIntents as { threads: { resolveIds: string[] } }).threads.resolveIds = [
      'pr-17',
      'td-1',
    ];
    const originalResolveIds = [
      ...(payload.stateIntents as { threads: { resolveIds: string[] } }).threads.resolveIds,
    ];

    repairAccountantIdFieldMismatches(payload);
    expect(
      (payload.stateIntents as { threads: { resolveIds: string[] } }).threads.resolveIds
    ).toEqual(originalResolveIds);
  });
});
