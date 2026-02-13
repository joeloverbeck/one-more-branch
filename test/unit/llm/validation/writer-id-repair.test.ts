import { repairWriterRemovalIdFieldMismatches } from '../../../../src/llm/validation/writer-id-repair';

const context = {
  removableIds: {
    threats: ['th-1', 'th-9'],
    constraints: ['cn-1'],
    threads: ['td-1', 'td-2'],
    inventory: ['inv-1'],
    health: ['hp-1'],
    characterState: ['cs-1'],
  },
};

describe('repairWriterRemovalIdFieldMismatches', () => {
  it('moves cross-category IDs into the correct removal field when ID exists in context', () => {
    const raw = {
      threatsRemoved: ['td-1', 'th-1'],
      constraintsRemoved: ['inv-1'],
      threadsResolved: [],
      inventoryRemoved: [],
      healthRemoved: ['cs-1'],
      characterStateChangesRemoved: [],
    };

    const result = repairWriterRemovalIdFieldMismatches(raw, context);
    const repaired = result.repairedJson as Record<string, unknown>;

    expect(result.repairs).toEqual([
      { id: 'td-1', fromField: 'threatsRemoved', toField: 'threadsResolved' },
      { id: 'inv-1', fromField: 'constraintsRemoved', toField: 'inventoryRemoved' },
      { id: 'cs-1', fromField: 'healthRemoved', toField: 'characterStateChangesRemoved' },
    ]);
    expect(repaired['threatsRemoved']).toEqual(['th-1']);
    expect(repaired['constraintsRemoved']).toEqual([]);
    expect(repaired['threadsResolved']).toEqual(['td-1']);
    expect(repaired['inventoryRemoved']).toEqual(['inv-1']);
    expect(repaired['healthRemoved']).toEqual([]);
    expect(repaired['characterStateChangesRemoved']).toEqual(['cs-1']);
  });

  it('does not move IDs when they are unknown in the active context', () => {
    const raw = {
      threatsRemoved: ['td-99'],
      threadsResolved: [],
    };

    const result = repairWriterRemovalIdFieldMismatches(raw, context);
    const repaired = result.repairedJson as Record<string, unknown>;

    expect(result.repairs).toEqual([]);
    expect(repaired['threatsRemoved']).toEqual(['td-99']);
    expect(repaired['threadsResolved']).toEqual([]);
  });

  it('deduplicates destination field values after repairs', () => {
    const raw = {
      threatsRemoved: ['td-1', 'td-1'],
      threadsResolved: ['td-1'],
    };

    const result = repairWriterRemovalIdFieldMismatches(raw, context);
    const repaired = result.repairedJson as Record<string, unknown>;

    expect(result.repairs).toHaveLength(2);
    expect(repaired['threatsRemoved']).toEqual([]);
    expect(repaired['threadsResolved']).toEqual(['td-1']);
  });

  it('returns input unchanged when no validation context is provided', () => {
    const raw = {
      threatsRemoved: ['td-1'],
    };

    const result = repairWriterRemovalIdFieldMismatches(raw, undefined);

    expect(result.repairs).toEqual([]);
    expect(result.repairedJson).toBe(raw);
  });
});
