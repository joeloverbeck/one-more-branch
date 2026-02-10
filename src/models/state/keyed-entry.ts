/**
 * Keyed state entry types and ID management utilities.
 * Server-assigned sequential IDs (e.g., "inv-1", "cs-3") replace
 * text-based or LLM-invented keys for reliable state removal.
 */

import { modelWarn } from '../model-logger.js';

export interface KeyedEntry {
  readonly id: string;
  readonly text: string;
}

export enum ThreadType {
  MYSTERY = 'MYSTERY',
  QUEST = 'QUEST',
  RELATIONSHIP = 'RELATIONSHIP',
  DANGER = 'DANGER',
  INFORMATION = 'INFORMATION',
  RESOURCE = 'RESOURCE',
  MORAL = 'MORAL',
}

export enum Urgency {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export interface ThreadEntry extends KeyedEntry {
  readonly threadType: ThreadType;
  readonly urgency: Urgency;
}

export function isThreadType(value: unknown): value is ThreadType {
  return typeof value === 'string' && Object.values(ThreadType).includes(value as ThreadType);
}

export function isUrgency(value: unknown): value is Urgency {
  return typeof value === 'string' && Object.values(Urgency).includes(value as Urgency);
}

export type StateIdPrefix = 'inv' | 'hp' | 'cs' | 'th' | 'cn' | 'td';

const ID_PATTERN = /^[a-z]+-(\d+)$/;

export function extractIdNumber(id: string): number {
  const match = ID_PATTERN.exec(id);
  if (!match?.[1]) {
    throw new Error(`Malformed keyed entry ID: "${id}"`);
  }
  return parseInt(match[1], 10);
}

export function getMaxIdNumber(
  entries: readonly KeyedEntry[],
  prefix: StateIdPrefix,
): number {
  let max = 0;
  const prefixDash = `${prefix}-`;
  for (const entry of entries) {
    if (entry.id.startsWith(prefixDash)) {
      const num = extractIdNumber(entry.id);
      if (num > max) {
        max = num;
      }
    }
  }
  return max;
}

export function nextId(prefix: StateIdPrefix, currentMax: number): string {
  return `${prefix}-${currentMax + 1}`;
}

export function assignIds(
  existing: readonly KeyedEntry[],
  newTexts: readonly string[],
  prefix: StateIdPrefix,
): readonly KeyedEntry[] {
  let currentMax = getMaxIdNumber(existing, prefix);
  const result: KeyedEntry[] = [];

  for (const text of newTexts) {
    if (!text.trim()) {
      continue;
    }
    currentMax += 1;
    result.push({ id: `${prefix}-${currentMax}`, text });
  }

  return result;
}

export function removeByIds<T extends KeyedEntry>(
  entries: readonly T[],
  idsToRemove: readonly string[],
): readonly T[] {
  const removeSet = new Set(idsToRemove);
  const matched = new Set<string>();
  const result: T[] = [];

  for (const entry of entries) {
    if (removeSet.has(entry.id)) {
      matched.add(entry.id);
    } else {
      result.push(entry);
    }
  }

  for (const id of idsToRemove) {
    if (!matched.has(id)) {
      modelWarn(`removeByIds: ID "${id}" did not match any entry`);
    }
  }

  return result;
}
