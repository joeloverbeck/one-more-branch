import {
  AccumulatedCharacterState,
  CharacterStateChanges,
  SingleCharacterStateChanges,
  applyCharacterStateChanges as applyChanges,
  createEmptyAccumulatedCharacterState,
} from '../models';

/**
 * Normalizes a character name for consistent keying.
 * - Converts to lowercase
 * - Removes extra punctuation (periods, commas)
 * - Collapses multiple spaces to single space
 * - Trims whitespace
 */
export function normalizeCharacterNameForState(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,;:!?'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Creates CharacterStateChanges from the LLM response format.
 * The LLM returns separate arrays for added and removed state per character.
 */
export function createCharacterStateChanges(
  added: Array<{ characterName: string; states: readonly string[] }>,
  removed: Array<{ characterName: string; states: readonly string[] }>,
): CharacterStateChanges {
  // Build a map of character names to their changes
  const changesMap = new Map<string, { added: string[]; removed: string[] }>();

  // Process added entries
  for (const entry of added) {
    const normalizedName = normalizeCharacterNameForState(entry.characterName);
    if (!normalizedName) continue;

    const existing = changesMap.get(normalizedName) ?? { added: [], removed: [] };
    const trimmedStates = entry.states
      .map(s => s.trim())
      .filter(s => s);
    existing.added.push(...trimmedStates);
    changesMap.set(normalizedName, existing);
  }

  // Process removed entries
  for (const entry of removed) {
    const normalizedName = normalizeCharacterNameForState(entry.characterName);
    if (!normalizedName) continue;

    const existing = changesMap.get(normalizedName) ?? { added: [], removed: [] };
    const trimmedStates = entry.states
      .map(s => s.trim())
      .filter(s => s);
    existing.removed.push(...trimmedStates);
    changesMap.set(normalizedName, existing);
  }

  // Convert map to array format
  const result: SingleCharacterStateChanges[] = [];
  for (const [characterName, changes] of changesMap) {
    if (changes.added.length > 0 || changes.removed.length > 0) {
      result.push({
        characterName,
        added: changes.added,
        removed: changes.removed,
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
 * Uses normalized name matching.
 * Returns empty array if character has no state.
 */
export function getCharacterState(
  state: AccumulatedCharacterState,
  characterName: string,
): readonly string[] {
  const normalizedName = normalizeCharacterNameForState(characterName);
  return state[normalizedName] ?? [];
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
