import type { StateReconciliationDiagnostic } from './state-reconciler-types.js';
import { isConstraintType, isThreatType } from '../models/state/index.js';
import type { ConstraintAdd, ThreatAdd } from '../llm/planner-types.js';
import type { ConstraintAddition, ThreatAddition } from '../models/state/index.js';

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

export function normalizeThreatAdds(values: readonly ThreatAdd[]): ThreatAddition[] {
  return dedupeByKey(
    values
      .map((value) => {
        if (!isThreatType(value.threatType)) {
          return null;
        }
        return {
          text: normalizeIntentText(value.text),
          threatType: value.threatType,
        };
      })
      .filter((value): value is ThreatAddition => value !== null)
      .filter((value) => value.text.length > 0),
    (value) => `${intentComparisonKey(value.text)}|${value.threatType}`
  );
}

export function normalizeConstraintAdds(values: readonly ConstraintAdd[]): ConstraintAddition[] {
  return dedupeByKey(
    values
      .map((value) => {
        if (!isConstraintType(value.constraintType)) {
          return null;
        }
        return {
          text: normalizeIntentText(value.text),
          constraintType: value.constraintType,
        };
      })
      .filter((value): value is ConstraintAddition => value !== null)
      .filter((value) => value.text.length > 0),
    (value) => `${intentComparisonKey(value.text)}|${value.constraintType}`
  );
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
