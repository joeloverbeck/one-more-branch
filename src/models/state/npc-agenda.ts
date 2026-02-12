import { normalizeForComparison } from '../normalize.js';

export interface NpcAgenda {
  readonly npcName: string;
  readonly currentGoal: string;
  readonly leverage: string;
  readonly fear: string;
  readonly offScreenBehavior: string;
}

export type AccumulatedNpcAgendas = Readonly<Record<string, NpcAgenda>>;

export function createEmptyAccumulatedNpcAgendas(): AccumulatedNpcAgendas {
  return {};
}

/**
 * Applies agenda updates to the current accumulated agendas.
 * Updates are keyed by NPC name (case-insensitive lookup).
 * NPCs not in updates retain their existing agenda unchanged.
 */
export function applyAgendaUpdates(
  current: AccumulatedNpcAgendas,
  updates: readonly NpcAgenda[],
): AccumulatedNpcAgendas {
  if (updates.length === 0) {
    return current;
  }

  // Build a lookup from normalized name -> original key in current
  const normalizedKeyMap = new Map<string, string>();
  for (const key of Object.keys(current)) {
    normalizedKeyMap.set(normalizeForComparison(key), key);
  }

  const result: Record<string, NpcAgenda> = { ...current };

  for (const update of updates) {
    const normalized = normalizeForComparison(update.npcName);
    const existingKey = normalizedKeyMap.get(normalized);

    if (existingKey) {
      // Replace existing entry using the original key
      result[existingKey] = update;
    } else {
      // New NPC agenda — use the name as provided
      result[update.npcName] = update;
      normalizedKeyMap.set(normalized, update.npcName);
    }
  }

  return result;
}
