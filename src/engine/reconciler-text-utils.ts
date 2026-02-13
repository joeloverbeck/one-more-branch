import type { StateReconciliationDiagnostic } from './state-reconciler-types.js';

export const UNKNOWN_STATE_ID = 'UNKNOWN_STATE_ID';

export function normalizeIntentText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function intentComparisonKey(value: string): string {
  return normalizeIntentText(value).toLocaleLowerCase();
}

export function normalizeId(value: string): string {
  return value.trim();
}

export function normalizeEvidenceText(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function dedupeByKey<T>(values: readonly T[], keyFn: (value: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const value of values) {
    const key = keyFn(value);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
  }

  return result;
}

export function normalizeTextIntents(values: readonly string[]): string[] {
  return dedupeByKey(values.map(normalizeIntentText).filter(Boolean), intentComparisonKey);
}

export function normalizeAndValidateRemoveIds(
  ids: readonly string[],
  knownIds: ReadonlySet<string>,
  field: string,
  diagnostics: StateReconciliationDiagnostic[]
): string[] {
  const result: string[] = [];

  for (const id of dedupeByKey(ids.map(normalizeId).filter(Boolean), (value) => value)) {
    if (!knownIds.has(id)) {
      diagnostics.push({
        code: UNKNOWN_STATE_ID,
        field,
        message: `Unknown state ID "${id}" in ${field}.`,
      });
      continue;
    }

    result.push(id);
  }

  return result;
}

