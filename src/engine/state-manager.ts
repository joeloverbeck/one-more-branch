import { AccumulatedState, Page, PageId, createEmptyAccumulatedState } from '../models';

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

  const changes: string[] = [];
  for (const page of path) {
    changes.push(...page.stateChanges);
  }

  return { changes };
}

export function getParentAccumulatedState(parentPage: Page): AccumulatedState {
  return parentPage.accumulatedState;
}

export function mergeStateChanges(
  parentState: AccumulatedState,
  newChanges: readonly string[]
): AccumulatedState {
  return {
    changes: [...parentState.changes, ...newChanges],
  };
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
