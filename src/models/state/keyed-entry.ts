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

export enum ThreatType {
  HOSTILE_AGENT = 'HOSTILE_AGENT',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  CREATURE = 'CREATURE',
}

export enum ConstraintType {
  PHYSICAL = 'PHYSICAL',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  TEMPORAL = 'TEMPORAL',
}

export interface ThreatEntry extends KeyedEntry {
  readonly threatType: ThreatType;
}

export interface ConstraintEntry extends KeyedEntry {
  readonly constraintType: ConstraintType;
}

export function isThreadType(value: unknown): value is ThreadType {
  return typeof value === 'string' && Object.values(ThreadType).includes(value as ThreadType);
}

export function isUrgency(value: unknown): value is Urgency {
  return typeof value === 'string' && Object.values(Urgency).includes(value as Urgency);
}

export function isThreatType(value: unknown): value is ThreatType {
  return typeof value === 'string' && Object.values(ThreatType).includes(value as ThreatType);
}

export function isConstraintType(value: unknown): value is ConstraintType {
  return typeof value === 'string' && Object.values(ConstraintType).includes(value as ConstraintType);
}

export type StateIdPrefix = 'inv' | 'hp' | 'cs' | 'th' | 'cn' | 'td' | 'pr';

const ID_PATTERN = /^[a-z]+-(\d+)$/;

export function extractIdNumber(id: string): number {
  const match = ID_PATTERN.exec(id);
  if (!match?.[1]) {
    throw new Error(`Malformed keyed entry ID: "${id}"`);
  }
  return parseInt(match[1], 10);
}

export function getMaxIdNumber(entries: readonly KeyedEntry[], prefix: StateIdPrefix): number {
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
  prefix: StateIdPrefix
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

// ── Narrative Promise types ────────────────────────────────────────

export enum PromiseType {
  CHEKHOV_GUN = 'CHEKHOV_GUN',
  FORESHADOWING = 'FORESHADOWING',
  DRAMATIC_IRONY = 'DRAMATIC_IRONY',
  UNRESOLVED_EMOTION = 'UNRESOLVED_EMOTION',
  SETUP_PAYOFF = 'SETUP_PAYOFF',
}

export const PROMISE_TYPE_VALUES: readonly PromiseType[] = Object.values(PromiseType);

export function isPromiseType(value: unknown): value is PromiseType {
  return typeof value === 'string' && PROMISE_TYPE_VALUES.includes(value as PromiseType);
}

export interface TrackedPromise {
  readonly id: string;
  readonly description: string;
  readonly promiseType: PromiseType;
  readonly suggestedUrgency: Urgency;
  readonly age: number;
}

// ── Thread Payoff Assessment types ────────────────────────────────

export type SatisfactionLevel = 'RUSHED' | 'ADEQUATE' | 'WELL_EARNED';

export interface ThreadPayoffAssessment {
  readonly threadId: string;
  readonly threadText: string;
  readonly satisfactionLevel: SatisfactionLevel;
  readonly reasoning: string;
}

export interface PromisePayoffAssessment {
  readonly promiseId: string;
  readonly description: string;
  readonly satisfactionLevel: SatisfactionLevel;
  readonly reasoning: string;
}

export function removeByIds<T extends KeyedEntry>(
  entries: readonly T[],
  idsToRemove: readonly string[]
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
