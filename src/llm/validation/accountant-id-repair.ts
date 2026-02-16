import {
  STATE_ID_PREFIXES,
  isCanonicalIdForPrefix,
  type CanonicalStateIdPrefix,
} from './state-id-prefixes.js';

export interface AccountantIdRepairResult {
  readonly repairedJson: unknown;
  readonly filteredIds: readonly FilteredId[];
}

export interface FilteredId {
  readonly field: string;
  readonly value: string;
  readonly expectedPrefix: CanonicalStateIdPrefix;
}

const ID_FIELD_PREFIX_MAP: ReadonlyArray<{
  path: readonly string[];
  fieldName: string;
  expectedPrefix: CanonicalStateIdPrefix;
}> = [
  {
    path: ['stateIntents', 'threats', 'removeIds'],
    fieldName: 'threats.removeIds',
    expectedPrefix: STATE_ID_PREFIXES.threats,
  },
  {
    path: ['stateIntents', 'constraints', 'removeIds'],
    fieldName: 'constraints.removeIds',
    expectedPrefix: STATE_ID_PREFIXES.constraints,
  },
  {
    path: ['stateIntents', 'threads', 'resolveIds'],
    fieldName: 'threads.resolveIds',
    expectedPrefix: STATE_ID_PREFIXES.threads,
  },
  {
    path: ['stateIntents', 'inventory', 'removeIds'],
    fieldName: 'inventory.removeIds',
    expectedPrefix: STATE_ID_PREFIXES.inventory,
  },
  {
    path: ['stateIntents', 'health', 'removeIds'],
    fieldName: 'health.removeIds',
    expectedPrefix: STATE_ID_PREFIXES.health,
  },
  {
    path: ['stateIntents', 'characterState', 'removeIds'],
    fieldName: 'characterState.removeIds',
    expectedPrefix: STATE_ID_PREFIXES.characterState,
  },
];

function getNestedArray(obj: unknown, path: readonly string[]): string[] | undefined {
  let current: unknown = obj;
  for (const key of path) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return Array.isArray(current) ? (current as string[]) : undefined;
}

function setNestedArray(obj: Record<string, unknown>, path: readonly string[], value: string[]): void {
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]!;
    if (current[key] === null || current[key] === undefined || typeof current[key] !== 'object') {
      return;
    }
    current = current[key] as Record<string, unknown>;
  }
  const lastKey = path[path.length - 1]!;
  current[lastKey] = value;
}

export function repairAccountantIdFieldMismatches(rawJson: unknown): AccountantIdRepairResult {
  if (rawJson === null || rawJson === undefined || typeof rawJson !== 'object') {
    return { repairedJson: rawJson, filteredIds: [] };
  }

  const cloned = JSON.parse(JSON.stringify(rawJson)) as Record<string, unknown>;
  const filteredIds: FilteredId[] = [];

  for (const mapping of ID_FIELD_PREFIX_MAP) {
    const arr = getNestedArray(cloned, mapping.path);
    if (!arr || arr.length === 0) continue;

    const kept: string[] = [];
    for (const id of arr) {
      if (typeof id !== 'string') {
        kept.push(id as unknown as string);
        continue;
      }
      const trimmed = id.trim();
      if (trimmed === '') continue;
      if (isCanonicalIdForPrefix(trimmed, mapping.expectedPrefix)) {
        kept.push(trimmed);
      } else {
        filteredIds.push({
          field: mapping.fieldName,
          value: trimmed,
          expectedPrefix: mapping.expectedPrefix,
        });
      }
    }

    if (kept.length !== arr.length) {
      setNestedArray(cloned, mapping.path, kept);
    }
  }

  return { repairedJson: cloned, filteredIds };
}
