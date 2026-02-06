import {
  AccumulatedState,
  Page,
  PageId,
  StateChanges,
  applyStateChanges,
  createEmptyAccumulatedState,
  createEmptyStateChanges,
} from '../models';

export function computeAccumulatedState(
  targetPageId: PageId,
  getPage: (id: PageId) => Page | undefined
): AccumulatedState {
  const path: Page[] = [];

  let current = getPage(targetPageId);
  if (!current) {
    return createEmptyAccumulatedState();
  }

  while (current) {
    path.unshift(current);
    if (current.parentPageId === null) {
      break;
    }
    current = getPage(current.parentPageId);
  }

  // Apply state changes from each page in order
  let accumulated = createEmptyAccumulatedState();
  for (const page of path) {
    accumulated = applyStateChanges(accumulated, page.stateChanges);
  }

  return accumulated;
}

/**
 * Creates StateChanges object from arrays of added/removed state entries.
 */
export function createStateChanges(
  added: readonly string[],
  removed: readonly string[]
): StateChanges {
  return {
    added: added.map(change => change.trim()).filter(change => change),
    removed: removed.map(change => change.trim()).filter(change => change),
  };
}

// Re-export for convenience
export { createEmptyStateChanges };

export function getParentAccumulatedState(parentPage: Page): AccumulatedState {
  return parentPage.accumulatedState;
}

/**
 * Merges state changes into parent state using the add/remove pattern.
 * This is a convenience wrapper around applyStateChanges.
 */
export function mergeStateChanges(
  parentState: AccumulatedState,
  newChanges: StateChanges
): AccumulatedState {
  return applyStateChanges(parentState, newChanges);
}

export function formatStateForDisplay(state: AccumulatedState): string {
  if (state.changes.length === 0) {
    return 'No significant events yet.';
  }

  return state.changes.map(change => `• ${change}`).join('\n');
}

export function getRecentChanges(state: AccumulatedState, count: number = 5): string[] {
  return state.changes.slice(-count);
}
