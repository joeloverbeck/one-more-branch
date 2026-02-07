import {
  AccumulatedCharacterState,
  CharacterStateChanges,
  SingleCharacterStateChanges,
  applyCharacterStateChanges as applyChanges,
  createEmptyAccumulatedCharacterState,
  normalizeCharacterName,
  normalizeForComparison,
} from '../models';

/**
 * Re-export normalizeCharacterName as normalizeCharacterNameForState for backward compatibility.
 */
export const normalizeCharacterNameForState = normalizeCharacterName;

/**
 * Creates CharacterStateChanges from the LLM response format.
 * The LLM returns separate arrays for added and removed state per character.
 * Uses case-insensitive matching to merge entries for the same character,
 * but preserves the first-seen display name (original casing).
 */
export function createCharacterStateChanges(
  added: Array<{ characterName: string; states: readonly string[] }>,
  removed: Array<{ characterName: string; states: readonly string[] }>,
): CharacterStateChanges {
  // Build a map using lowercased keys for case-insensitive lookup,
  // but track the first-seen display name for each character
  const changesMap = new Map<string, { displayName: string; added: string[]; removed: string[] }>();

  // Process added entries
  for (const entry of added) {
    const cleanedName = normalizeCharacterNameForState(entry.characterName);
    if (!cleanedName) continue;

    const lookupKey = normalizeForComparison(cleanedName);
    const existing = changesMap.get(lookupKey);
    const trimmedStates = entry.states
      .map(s => s.trim())
      .filter(s => s);

    if (existing) {
      // Merge with existing - keep FIRST-SEEN display name
      existing.added.push(...trimmedStates);
    } else {
      // New character - use this casing as the display name
      changesMap.set(lookupKey, { displayName: cleanedName, added: trimmedStates, removed: [] });
    }
  }

  // Process removed entries
  for (const entry of removed) {
    const cleanedName = normalizeCharacterNameForState(entry.characterName);
    if (!cleanedName) continue;

    const lookupKey = normalizeForComparison(cleanedName);
    const existing = changesMap.get(lookupKey);
    const trimmedStates = entry.states
      .map(s => s.trim())
      .filter(s => s);

    if (existing) {
      // Merge with existing - keep FIRST-SEEN display name
      existing.removed.push(...trimmedStates);
    } else {
      // New character - use this casing as the display name
      changesMap.set(lookupKey, { displayName: cleanedName, added: [], removed: trimmedStates });
    }
  }

  // Convert map to array format, using the preserved display names
  const result: SingleCharacterStateChanges[] = [];
  for (const [, { displayName, added: addedChanges, removed: removedChanges }] of changesMap) {
    if (addedChanges.length > 0 || removedChanges.length > 0) {
      result.push({
        characterName: displayName,
        added: addedChanges,
        removed: removedChanges,
      });
    }
  }

  return result;
}

/**
 * Applies character state changes to the accumulated character state.
 * Re-exports from models for convenience.
 */
export function applyCharacterStateChanges(
  current: AccumulatedCharacterState,
  changes: CharacterStateChanges,
): AccumulatedCharacterState {
  return applyChanges(current, changes);
}

/**
 * Formats accumulated character state for inclusion in LLM prompts.
 * Returns empty string if no character state exists.
 *
 * Example output:
 * NPC CURRENT STATE:
 * [greaves]
 * - Gave protagonist a map
 * - Proposed 70-30 split
 *
 * [vespera]
 * - Knows about the hidden cave
 */
export function formatCharacterStateForPrompt(state: AccumulatedCharacterState): string {
  const entries = Object.entries(state).filter(([, states]) => states.length > 0);

  if (entries.length === 0) {
    return '';
  }

  const formattedEntries = entries
    .map(([name, states]) => {
      const stateLines = states.map(s => `- ${s}`).join('\n');
      return `[${name}]\n${stateLines}`;
    })
    .join('\n\n');

  return formattedEntries;
}

/**
 * Gets the character state for a specific character.
 * Uses case-insensitive name matching.
 * Returns empty array if character has no state.
 */
export function getCharacterState(
  state: AccumulatedCharacterState,
  characterName: string,
): readonly string[] {
  const cleanedName = normalizeCharacterNameForState(characterName);
  const lookupKey = normalizeForComparison(cleanedName);

  // Find the matching key (case-insensitive)
  for (const [key, value] of Object.entries(state)) {
    if (normalizeForComparison(key) === lookupKey) {
      return value;
    }
  }

  return [];
}

/**
 * Checks if a character has a specific state entry (case-insensitive).
 */
export function hasCharacterState(
  state: AccumulatedCharacterState,
  characterName: string,
  stateEntry: string,
): boolean {
  const characterState = getCharacterState(state, characterName);
  const normalizedEntry = stateEntry.trim().toLowerCase();
  return characterState.some(s => s.trim().toLowerCase() === normalizedEntry);
}

/**
 * Gets parent accumulated character state from a page.
 */
export function getParentAccumulatedCharacterState(
  parentPage: { accumulatedCharacterState: AccumulatedCharacterState },
): AccumulatedCharacterState {
  return parentPage.accumulatedCharacterState;
}

// Re-export for convenience
export { createEmptyAccumulatedCharacterState };
