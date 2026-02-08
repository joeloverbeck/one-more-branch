/**
 * Active-state types and guards for tracking truths that are true right now.
 */

import { TaggedStateEntry } from './tagged-entry.js';

export interface ActiveState {
  readonly currentLocation: string;
  readonly activeThreats: readonly TaggedStateEntry[];
  readonly activeConstraints: readonly TaggedStateEntry[];
  readonly openThreads: readonly TaggedStateEntry[];
}

export interface ActiveStateChanges {
  readonly newLocation: string | null;
  readonly threatsAdded: readonly string[];
  readonly threatsRemoved: readonly string[];
  readonly constraintsAdded: readonly string[];
  readonly constraintsRemoved: readonly string[];
  readonly threadsAdded: readonly string[];
  readonly threadsResolved: readonly string[];
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

function isTaggedStateEntry(value: unknown): value is TaggedStateEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return (
    typeof obj['prefix'] === 'string' &&
    typeof obj['description'] === 'string' &&
    typeof obj['raw'] === 'string'
  );
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

export function isActiveState(value: unknown): value is ActiveState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return (
    typeof obj['currentLocation'] === 'string' &&
    Array.isArray(obj['activeThreats']) &&
    obj['activeThreats'].every(isTaggedStateEntry) &&
    Array.isArray(obj['activeConstraints']) &&
    obj['activeConstraints'].every(isTaggedStateEntry) &&
    Array.isArray(obj['openThreads']) &&
    obj['openThreads'].every(isTaggedStateEntry)
  );
}

export function isActiveStateChanges(value: unknown): value is ActiveStateChanges {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return (
    (obj['newLocation'] === null || typeof obj['newLocation'] === 'string') &&
    isStringArray(obj['threatsAdded']) &&
    isStringArray(obj['threatsRemoved']) &&
    isStringArray(obj['constraintsAdded']) &&
    isStringArray(obj['constraintsRemoved']) &&
    isStringArray(obj['threadsAdded']) &&
    isStringArray(obj['threadsResolved'])
  );
}
