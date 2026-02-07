/**
 * Character state types and functions for branch-isolated character state management.
 * Unlike GlobalCharacterCanon (permanent), CharacterState is branch-isolated.
 */

import { modelWarn } from '../model-logger.js';
import { normalizeCharacterName, normalizeForComparison } from '../normalize.js';

export type CharacterStateEntry = string;
export type CharacterState = readonly CharacterStateEntry[];

export interface SingleCharacterStateChanges {
  readonly characterName: string;
  readonly added: readonly CharacterStateEntry[];
  readonly removed: readonly CharacterStateEntry[];
}

export type CharacterStateChanges = readonly SingleCharacterStateChanges[];
export type AccumulatedCharacterState = Readonly<Record<string, CharacterState>>;

/**
 * Creates an empty CharacterStateChanges array.
 */
export function createEmptyCharacterStateChanges(): CharacterStateChanges {
  return [];
}

/**
 * Creates an empty AccumulatedCharacterState object.
 */
export function createEmptyAccumulatedCharacterState(): AccumulatedCharacterState {
  return {};
}

/**
 * Applies character state changes to the accumulated character state.
 * Follows the same add/remove pattern as other state management functions.
 * Removals are processed first using case-insensitive matching.
 * Uses case-insensitive lookup to find existing character entries,
 * but preserves original key casing (first-seen casing).
 */
export function applyCharacterStateChanges(
  current: AccumulatedCharacterState,
  changes: CharacterStateChanges
): AccumulatedCharacterState {
  const result: Record<string, string[]> = {};

  // Copy existing state
  for (const [name, state] of Object.entries(current)) {
    result[name] = [...state];
  }

  // Build a lowercase-to-original-key map for case-insensitive lookup
  const keyLookup = new Map<string, string>();
  for (const name of Object.keys(result)) {
    keyLookup.set(normalizeForComparison(name), name);
  }

  // Apply each character's changes
  for (const charChange of changes) {
    const cleanedName = normalizeCharacterName(charChange.characterName);
    const lookupKey = normalizeForComparison(cleanedName);

    // Find existing key (case-insensitive) or use new casing
    const existingKey = keyLookup.get(lookupKey);
    const storageKey = existingKey ?? cleanedName;
    const existing = result[storageKey] ?? [];

    // Process removals first (case-insensitive match)
    for (const toRemove of charChange.removed) {
      const normalizedRemove = normalizeForComparison(toRemove);
      if (!normalizedRemove) continue; // Skip empty strings silently
      const index = existing.findIndex(
        entry => normalizeForComparison(entry) === normalizedRemove
      );
      if (index !== -1) {
        existing.splice(index, 1);
      } else {
        modelWarn(
          `Character state removal did not match any existing entry for "${charChange.characterName}": "${toRemove}"`
        );
      }
    }

    // Then add new entries
    for (const toAdd of charChange.added) {
      const trimmed = toAdd.trim();
      if (trimmed) {
        existing.push(trimmed);
      }
    }

    // Only keep the character in result if they have state entries
    if (existing.length > 0) {
      result[storageKey] = existing;
      // Update the lookup map in case we added a new character
      if (!existingKey) {
        keyLookup.set(lookupKey, storageKey);
      }
    } else {
      delete result[storageKey];
      keyLookup.delete(lookupKey);
    }
  }

  return result;
}
