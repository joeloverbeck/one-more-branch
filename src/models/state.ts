export type StateChange = string;
export type StateChanges = readonly StateChange[];

export type CanonFact = string;
export type GlobalCanon = readonly CanonFact[];

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
