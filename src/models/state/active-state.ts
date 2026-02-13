/**
 * Active-state types and guards for tracking truths that are true right now.
 */

import {
  ConstraintEntry,
  ConstraintType,
  KeyedEntry,
  ThreatEntry,
  ThreatType,
  ThreadEntry,
  ThreadType,
  Urgency,
  isConstraintType,
  isThreatType,
  isThreadType,
  isUrgency,
} from './keyed-entry.js';

export interface ActiveState {
  readonly currentLocation: string;
  readonly activeThreats: readonly ThreatEntry[];
  readonly activeConstraints: readonly ConstraintEntry[];
  readonly openThreads: readonly ThreadEntry[];
}

export interface ActiveStateChanges {
  readonly newLocation: string | null;
  readonly threatsAdded: readonly ThreatAddition[];
  readonly threatsRemoved: readonly string[];
  readonly constraintsAdded: readonly ConstraintAddition[];
  readonly constraintsRemoved: readonly string[];
  readonly threadsAdded: readonly (string | ThreadAddition)[];
  readonly threadsResolved: readonly string[];
}

export interface ThreatAddition {
  readonly text: string;
  readonly threatType: ThreatType;
}

export interface ConstraintAddition {
  readonly text: string;
  readonly constraintType: ConstraintType;
}

export interface ThreadAddition {
  readonly text: string;
  readonly threadType: ThreadType;
  readonly urgency: Urgency;
}

export function createEmptyActiveState(): ActiveState {
  return {
    currentLocation: '',
    activeThreats: [],
    activeConstraints: [],
    openThreads: [],
  };
}

export function createEmptyActiveStateChanges(): ActiveStateChanges {
  return {
    newLocation: null,
    threatsAdded: [],
    threatsRemoved: [],
    constraintsAdded: [],
    constraintsRemoved: [],
    threadsAdded: [],
    threadsResolved: [],
  };
}

function isKeyedEntry(value: unknown): value is KeyedEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as unknown as Record<string, unknown>;
  return typeof obj['id'] === 'string' && typeof obj['text'] === 'string';
}

function isThreatEntry(value: unknown): value is ThreatEntry {
  if (!isKeyedEntry(value)) {
    return false;
  }

  const obj = value as unknown as Record<string, unknown>;
  return isThreatType(obj['threatType']);
}

function isConstraintEntry(value: unknown): value is ConstraintEntry {
  if (!isKeyedEntry(value)) {
    return false;
  }

  const obj = value as unknown as Record<string, unknown>;
  return isConstraintType(obj['constraintType']);
}

function isThreadEntry(value: unknown): value is ThreadEntry {
  if (!isKeyedEntry(value)) {
    return false;
  }

  const obj = value as unknown as Record<string, unknown>;
  return isThreadType(obj['threadType']) && isUrgency(obj['urgency']);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isThreadAddition(value: unknown): value is ThreadAddition {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return (
    typeof obj['text'] === 'string' && isThreadType(obj['threadType']) && isUrgency(obj['urgency'])
  );
}

function isThreatAddition(value: unknown): value is ThreatAddition {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return typeof obj['text'] === 'string' && isThreatType(obj['threatType']);
}

function isConstraintAddition(value: unknown): value is ConstraintAddition {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return typeof obj['text'] === 'string' && isConstraintType(obj['constraintType']);
}

function isThreadAddedArray(value: unknown): value is readonly (string | ThreadAddition)[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string' || isThreadAddition(item))
  );
}

function isThreatAddedArray(value: unknown): value is readonly ThreatAddition[] {
  return Array.isArray(value) && value.every(isThreatAddition);
}

function isConstraintAddedArray(value: unknown): value is readonly ConstraintAddition[] {
  return Array.isArray(value) && value.every(isConstraintAddition);
}

export function isActiveState(value: unknown): value is ActiveState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return (
    typeof obj['currentLocation'] === 'string' &&
    Array.isArray(obj['activeThreats']) &&
    obj['activeThreats'].every(isThreatEntry) &&
    Array.isArray(obj['activeConstraints']) &&
    obj['activeConstraints'].every(isConstraintEntry) &&
    Array.isArray(obj['openThreads']) &&
    obj['openThreads'].every(isThreadEntry)
  );
}

export function isActiveStateChanges(value: unknown): value is ActiveStateChanges {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return (
    (obj['newLocation'] === null || typeof obj['newLocation'] === 'string') &&
    isThreatAddedArray(obj['threatsAdded']) &&
    isStringArray(obj['threatsRemoved']) &&
    isConstraintAddedArray(obj['constraintsAdded']) &&
    isStringArray(obj['constraintsRemoved']) &&
    isThreadAddedArray(obj['threadsAdded']) &&
    isStringArray(obj['threadsResolved'])
  );
}
