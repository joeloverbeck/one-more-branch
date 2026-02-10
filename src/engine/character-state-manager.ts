import {
  AccumulatedCharacterState,
  CharacterStateChanges,
  applyCharacterStateChanges as applyChanges,
  createEmptyAccumulatedCharacterState,
  normalizeCharacterName,
  normalizeForComparison,
} from '../models';

/**
 * Alias for normalizeCharacterName providing semantic clarity in state context.
 */
export const normalizeCharacterNameForState = normalizeCharacterName;

/**
 * Creates CharacterStateChanges from the LLM response format.
 */
export function createCharacterStateChanges(
  added: Array<{ characterName: string; states: readonly string[] }>,
  removed: readonly string[],
): CharacterStateChanges {
  const normalizedAdded = added
    .map(entry => ({
      characterName: normalizeCharacterNameForState(entry.characterName),
      states: entry.states.map(s => s.trim()).filter(s => s),
    }))
    .filter(entry => entry.characterName && entry.states.length > 0);

  const normalizedRemoved = removed.map(id => id.trim()).filter(id => id);

  return {
    added: normalizedAdded,
    removed: normalizedRemoved,
  };
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
 */
export function formatCharacterStateForPrompt(state: AccumulatedCharacterState): string {
  const entries = Object.entries(state).filter(([, states]) => states.length > 0);

  if (entries.length === 0) {
    return '';
  }

  const formattedEntries = entries
    .map(([name, states]) => {
      const stateLines = states.map(s => `- [${s.id}] ${s.text}`).join('\n');
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
): AccumulatedCharacterState[string] {
  const cleanedName = normalizeCharacterNameForState(characterName);
  const lookupKey = normalizeForComparison(cleanedName);

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
  return characterState.some(s => s.text.trim().toLowerCase() === normalizedEntry);
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
