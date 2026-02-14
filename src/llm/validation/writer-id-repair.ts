import { isCanonicalIdForPrefix, STATE_ID_PREFIXES } from './state-id-prefixes.js';
import type { WriterValidationContext } from '../generation-pipeline-types.js';

const REMOVAL_FIELDS = [
  'threatsRemoved',
  'constraintsRemoved',
  'threadsResolved',
  'inventoryRemoved',
  'healthRemoved',
  'characterStateChangesRemoved',
] as const;

type RemovalField = (typeof REMOVAL_FIELDS)[number];

type PrefixKey = Exclude<keyof typeof STATE_ID_PREFIXES, 'promises'>;

const FIELD_CONFIG: ReadonlyArray<{
  field: RemovalField;
  prefixKey: PrefixKey;
}> = [
  { field: 'threatsRemoved', prefixKey: 'threats' },
  { field: 'constraintsRemoved', prefixKey: 'constraints' },
  { field: 'threadsResolved', prefixKey: 'threads' },
  { field: 'inventoryRemoved', prefixKey: 'inventory' },
  { field: 'healthRemoved', prefixKey: 'health' },
  { field: 'characterStateChangesRemoved', prefixKey: 'characterState' },
] as const;

const DESTINATION_FIELD_BY_PREFIX: Record<PrefixKey, RemovalField> = {
  threats: 'threatsRemoved',
  constraints: 'constraintsRemoved',
  threads: 'threadsResolved',
  inventory: 'inventoryRemoved',
  health: 'healthRemoved',
  characterState: 'characterStateChangesRemoved',
};

const CONTEXT_KEY_BY_PREFIX: Record<PrefixKey, keyof WriterValidationContext['removableIds']> = {
  threats: 'threats',
  constraints: 'constraints',
  threads: 'threads',
  inventory: 'inventory',
  health: 'health',
  characterState: 'characterState',
};

export interface WriterRemovalIdRepair {
  readonly id: string;
  readonly fromField: RemovalField;
  readonly toField: RemovalField;
}

export interface WriterIdRepairResult {
  readonly repairedJson: unknown;
  readonly repairs: readonly WriterRemovalIdRepair[];
}

function hasOwnProperty(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function getCanonicalPrefixKey(id: string): PrefixKey | null {
  for (const prefixKey of Object.keys(STATE_ID_PREFIXES) as Array<keyof typeof STATE_ID_PREFIXES>) {
    if (prefixKey === 'promises') {
      continue;
    }
    if (isCanonicalIdForPrefix(id, STATE_ID_PREFIXES[prefixKey])) {
      return prefixKey;
    }
  }

  return null;
}

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const values: string[] = [];
  for (const value of input) {
    if (typeof value !== 'string') {
      continue;
    }

    const trimmed = value.trim();
    if (trimmed) {
      values.push(trimmed);
    }
  }

  return values;
}

export function repairWriterRemovalIdFieldMismatches(
  rawJson: unknown,
  context: WriterValidationContext | undefined
): WriterIdRepairResult {
  if (!context || typeof rawJson !== 'object' || rawJson === null || Array.isArray(rawJson)) {
    return { repairedJson: rawJson, repairs: [] };
  }

  const source = rawJson as Record<string, unknown>;
  const cloned: Record<string, unknown> = { ...source };
  const fieldValues = new Map<RemovalField, string[]>();
  const presentFields = new Set<RemovalField>();

  for (const field of REMOVAL_FIELDS) {
    if (hasOwnProperty(source, field)) {
      presentFields.add(field);
    }

    fieldValues.set(field, normalizeStringArray(source[field]));
  }

  const availableByPrefix = new Map<PrefixKey, Set<string>>();
  for (const prefixKey of Object.keys(STATE_ID_PREFIXES) as Array<keyof typeof STATE_ID_PREFIXES>) {
    if (prefixKey === 'promises') {
      continue;
    }
    const contextKey = CONTEXT_KEY_BY_PREFIX[prefixKey];
    availableByPrefix.set(prefixKey, new Set(context.removableIds[contextKey]));
  }

  const repairs: WriterRemovalIdRepair[] = [];

  for (const config of FIELD_CONFIG) {
    const expectedPrefix = STATE_ID_PREFIXES[config.prefixKey];
    const current = fieldValues.get(config.field) ?? [];
    const kept: string[] = [];

    for (const id of current) {
      if (isCanonicalIdForPrefix(id, expectedPrefix)) {
        kept.push(id);
        continue;
      }

      const actualPrefixKey = getCanonicalPrefixKey(id);
      if (!actualPrefixKey) {
        kept.push(id);
        continue;
      }

      const destinationField = DESTINATION_FIELD_BY_PREFIX[actualPrefixKey];
      const destinationAvailable = availableByPrefix.get(actualPrefixKey);
      if (!destinationAvailable?.has(id)) {
        kept.push(id);
        continue;
      }

      const destinationValues = fieldValues.get(destinationField) ?? [];
      destinationValues.push(id);
      fieldValues.set(destinationField, destinationValues);

      repairs.push({
        id,
        fromField: config.field,
        toField: destinationField,
      });
    }

    fieldValues.set(config.field, kept);
  }

  if (repairs.length === 0) {
    return { repairedJson: rawJson, repairs };
  }

  for (const field of REMOVAL_FIELDS) {
    const values = fieldValues.get(field) ?? [];
    const deduped = [...new Set(values)];
    if (deduped.length > 0 || presentFields.has(field)) {
      cloned[field] = deduped;
    }
  }

  return {
    repairedJson: cloned,
    repairs,
  };
}
