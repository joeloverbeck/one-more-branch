/**
 * Character state types and functions for branch-isolated character state management.
 * Unlike GlobalCharacterCanon (permanent), CharacterState is branch-isolated.
 */

import { modelWarn } from '../model-logger.js';
import { normalizeCharacterName, normalizeForComparison } from '../normalize.js';
import { KeyedEntry } from './keyed-entry.js';

export type CharacterState = readonly KeyedEntry[];

export interface CharacterStateAddition {
  readonly characterName: string;
  readonly states: readonly string[];
}

export interface CharacterStateChanges {
  readonly added: readonly CharacterStateAddition[];
  readonly removed: readonly string[];
}

export type AccumulatedCharacterState = Readonly<Record<string, CharacterState>>;

/**
 * Creates an empty CharacterStateChanges object.
 */
export function createEmptyCharacterStateChanges(): CharacterStateChanges {
  return {
    added: [],
    removed: [],
  };
}

/**
 * Creates an empty AccumulatedCharacterState object.
 */
export function createEmptyAccumulatedCharacterState(): AccumulatedCharacterState {
  return {};
}

function getGlobalCharacterStateMaxId(current: AccumulatedCharacterState): number {
  let maxId = 0;
  for (const states of Object.values(current)) {
    for (const state of states) {
      if (state.id.startsWith('cs-')) {
        const num = Number.parseInt(state.id.slice(3), 10);
        if (Number.isFinite(num) && num > maxId) {
          maxId = num;
        }
      }
    }
  }
  return maxId;
}

/**
 * Applies character state changes to the accumulated character state.
 * Uses case-insensitive lookup to find existing character entries,
 * while preserving original key casing (first-seen casing).
 */
export function applyCharacterStateChanges(
  current: AccumulatedCharacterState,
  changes: CharacterStateChanges,
): AccumulatedCharacterState {
  const result: Record<string, KeyedEntry[]> = {};

  for (const [name, state] of Object.entries(current)) {
    result[name] = [...state];
  }

  const keyLookup = new Map<string, string>();
  for (const name of Object.keys(result)) {
    keyLookup.set(normalizeForComparison(name), name);
  }

  let currentMaxId = getGlobalCharacterStateMaxId(current);

  const removals = new Set(changes.removed);
  if (removals.size > 0) {
    const matched = new Set<string>();
    for (const [name, states] of Object.entries(result)) {
      const kept = states.filter(state => {
        if (removals.has(state.id)) {
          matched.add(state.id);
          return false;
        }
        return true;
      });

      if (kept.length > 0) {
        result[name] = kept;
      } else {
        delete result[name];
        keyLookup.delete(normalizeForComparison(name));
      }
    }

    for (const id of changes.removed) {
      if (!matched.has(id)) {
        modelWarn(`Character state removal ID did not match any existing entry: "${id}"`);
      }
    }
  }

  for (const addition of changes.added) {
    const cleanedName = normalizeCharacterName(addition.characterName);
    if (!cleanedName) {
      continue;
    }

    const lookupKey = normalizeForComparison(cleanedName);
    const existingKey = keyLookup.get(lookupKey);
    const storageKey = existingKey ?? cleanedName;

    if (!result[storageKey]) {
      result[storageKey] = [];
      keyLookup.set(lookupKey, storageKey);
    }

    for (const stateText of addition.states) {
      const trimmed = stateText.trim();
      if (!trimmed) {
        continue;
      }
      currentMaxId += 1;
      result[storageKey].push({ id: `cs-${currentMaxId}`, text: trimmed });
    }
  }

  for (const [name, states] of Object.entries(result)) {
    if (states.length === 0) {
      delete result[name];
    }
  }

  return result;
}
