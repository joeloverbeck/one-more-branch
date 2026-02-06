export type StateChange = string;

export interface StateChanges {
  readonly added: readonly StateChange[];
  readonly removed: readonly StateChange[];
}

export type CanonFact = string;
export type GlobalCanon = readonly CanonFact[];

export type CharacterCanonFact = string;
export type CharacterCanon = readonly CharacterCanonFact[];
export type GlobalCharacterCanon = Readonly<Record<string, CharacterCanon>>;

// Inventory types
export type InventoryItem = string;
export type Inventory = readonly InventoryItem[];

export interface InventoryChanges {
  readonly added: Inventory;
  readonly removed: Inventory;
}

// Health types
export type HealthEntry = string;
export type Health = readonly HealthEntry[];

export interface HealthChanges {
  readonly added: Health;
  readonly removed: Health;
}

export interface AccumulatedState {
  readonly changes: readonly StateChange[];
}

export function createEmptyAccumulatedState(): AccumulatedState {
  return {
    changes: [],
  };
}

export function createEmptyStateChanges(): StateChanges {
  return {
    added: [],
    removed: [],
  };
}

/**
 * Normalizes a state change string for comparison (lowercase, trimmed).
 */
function normalizeStateChange(state: string): string {
  return state.trim().toLowerCase();
}

/**
 * Applies state changes (additions and removals) to the current accumulated state.
 * Removals are processed first using case-insensitive matching.
 * Unmatched removals are logged as warnings but don't cause errors.
 */
export function applyStateChanges(
  current: AccumulatedState,
  changes: StateChanges
): AccumulatedState {
  const result = [...current.changes];

  // Process removals first (case-insensitive match)
  for (const toRemove of changes.removed) {
    const normalizedRemove = normalizeStateChange(toRemove);
    const index = result.findIndex(
      state => normalizeStateChange(state) === normalizedRemove
    );
    if (index !== -1) {
      result.splice(index, 1);
    } else if (toRemove.trim()) {
      // Log warning for unmatched non-empty removals
      console.warn(
        `State removal did not match any existing state: "${toRemove}"`
      );
    }
  }

  // Add new state changes (filter empty strings)
  for (const toAdd of changes.added) {
    const trimmed = toAdd.trim();
    if (trimmed) {
      result.push(trimmed);
    }
  }

  return { changes: result };
}

/**
 * @deprecated Use applyStateChanges() instead for add/remove pattern
 */
export function accumulateState(
  parentState: AccumulatedState,
  newChanges: StateChanges
): AccumulatedState {
  return applyStateChanges(parentState, newChanges);
}

export function addCanonFact(canon: GlobalCanon, fact: CanonFact): GlobalCanon {
  const normalizedFact = fact.trim().toLowerCase();
  const exists = canon.some(existingFact => existingFact.trim().toLowerCase() === normalizedFact);

  if (exists) {
    return canon;
  }

  return [...canon, fact.trim()];
}

export function mergeCanonFacts(canon: GlobalCanon, facts: CanonFact[]): GlobalCanon {
  return facts.reduce((acc, fact) => addCanonFact(acc, fact), canon);
}

// Inventory functions
export function createEmptyInventoryChanges(): InventoryChanges {
  return {
    added: [],
    removed: [],
  };
}

export function applyInventoryChanges(current: Inventory, changes: InventoryChanges): Inventory {
  // First, process removals
  const result = [...current];
  for (const itemToRemove of changes.removed) {
    const normalizedRemove = itemToRemove.trim().toLowerCase();
    const index = result.findIndex(item => item.trim().toLowerCase() === normalizedRemove);
    if (index !== -1) {
      result.splice(index, 1);
    }
  }

  // Then, add new items
  for (const itemToAdd of changes.added) {
    const trimmed = itemToAdd.trim();
    if (trimmed) {
      result.push(trimmed);
    }
  }

  return result;
}

// Health functions
export function createEmptyHealthChanges(): HealthChanges {
  return {
    added: [],
    removed: [],
  };
}

export function applyHealthChanges(current: Health, changes: HealthChanges): Health {
  // First, process removals (case-insensitive match)
  const result = [...current];
  for (const entryToRemove of changes.removed) {
    const normalizedRemove = entryToRemove.trim().toLowerCase();
    if (!normalizedRemove) continue; // Skip empty strings silently
    const index = result.findIndex(entry => entry.trim().toLowerCase() === normalizedRemove);
    if (index !== -1) {
      result.splice(index, 1);
    } else {
      // Log warning for unmatched non-empty removals
      console.warn(`Health removal did not match any existing entry: "${entryToRemove}"`);
    }
  }

  // Then, add new entries
  for (const entryToAdd of changes.added) {
    const trimmed = entryToAdd.trim();
    if (trimmed) {
      result.push(trimmed);
    }
  }

  return result;
}
