import type { DecomposedCharacter } from '../decomposed-character.js';
import { normalizeForComparison } from '../normalize.js';

export interface NpcRelationship {
  readonly npcName: string;
  readonly valence: number; // -5 to +5
  readonly dynamic: string; // label: mentor, rival, ally, target, dependency, protector, etc.
  readonly history: string; // 1-2 sentences prose
  readonly currentTension: string; // 1-2 sentences prose
  readonly leverage: string; // 1 sentence prose
}

export type AccumulatedNpcRelationships = Readonly<Record<string, NpcRelationship>>;

export function createEmptyAccumulatedNpcRelationships(): AccumulatedNpcRelationships {
  return {};
}

/**
 * Applies relationship updates to the current accumulated relationships.
 * Updates are keyed by NPC name (case-insensitive lookup).
 * NPCs not in updates retain their existing relationship unchanged.
 */
export function applyRelationshipUpdates(
  current: AccumulatedNpcRelationships,
  updates: readonly NpcRelationship[]
): AccumulatedNpcRelationships {
  if (updates.length === 0) {
    return current;
  }

  // Build a lookup from normalized name -> original key in current
  const normalizedKeyMap = new Map<string, string>();
  for (const key of Object.keys(current)) {
    normalizedKeyMap.set(normalizeForComparison(key), key);
  }

  const result: Record<string, NpcRelationship> = { ...current };

  for (const update of updates) {
    const normalized = normalizeForComparison(update.npcName);
    const existingKey = normalizedKeyMap.get(normalized);

    if (existingKey) {
      // Replace existing entry using the original key
      result[existingKey] = update;
    } else {
      // New NPC relationship — use the name as provided
      result[update.npcName] = update;
      normalizedKeyMap.set(normalized, update.npcName);
    }
  }

  return result;
}

/**
 * Builds initial NPC relationships from decomposed characters.
 * Filters out the protagonist (index 0, who has null protagonistRelationship)
 * and maps each NPC to an NpcRelationship using their protagonistRelationship data.
 */
export function buildInitialNpcRelationships(
  decomposedCharacters: readonly DecomposedCharacter[]
): readonly NpcRelationship[] {
  const relationships: NpcRelationship[] = [];

  for (const char of decomposedCharacters) {
    if (char.protagonistRelationship === null) {
      continue;
    }

    relationships.push({
      npcName: char.name,
      valence: char.protagonistRelationship.valence,
      dynamic: char.protagonistRelationship.dynamic,
      history: char.protagonistRelationship.history,
      currentTension: char.protagonistRelationship.currentTension,
      leverage: char.protagonistRelationship.leverage,
    });
  }

  return relationships;
}
