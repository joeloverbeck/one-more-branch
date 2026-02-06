export type StateChange = string;
export type StateChanges = readonly StateChange[];

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

export interface AccumulatedState {
  readonly changes: StateChanges;
}

export function createEmptyAccumulatedState(): AccumulatedState {
  return {
    changes: [],
  };
}

export function accumulateState(
  parentState: AccumulatedState,
  newChanges: StateChanges
): AccumulatedState {
  return {
    changes: [...parentState.changes, ...newChanges],
  };
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
