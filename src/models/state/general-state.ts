/**
 * General state types and functions for story state management.
 */

import { modelWarn } from '../model-logger.js';
import { normalizeForComparison } from '../normalize.js';

export type StateChange = string;

export interface StateChanges {
  readonly added: readonly StateChange[];
  readonly removed: readonly StateChange[];
}

export interface AccumulatedState {
  readonly changes: readonly StateChange[];
}

/**
 * Creates an empty AccumulatedState object.
 */
export function createEmptyAccumulatedState(): AccumulatedState {
  return {
    changes: [],
  };
}

/**
 * Creates an empty StateChanges object.
 */
export function createEmptyStateChanges(): StateChanges {
  return {
    added: [],
    removed: [],
  };
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
    const normalizedRemove = normalizeForComparison(toRemove);
    const index = result.findIndex(
      state => normalizeForComparison(state) === normalizedRemove
    );
    if (index !== -1) {
      result.splice(index, 1);
    } else if (toRemove.trim()) {
      modelWarn(`State removal did not match any existing state: "${toRemove}"`);
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
