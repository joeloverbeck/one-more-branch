import { ActiveState, ActiveStateChanges } from './active-state.js';
import { KeyedEntry, StateIdPrefix, assignIds, removeByIds } from './keyed-entry.js';

function applyKeyedChanges(
  current: readonly KeyedEntry[],
  added: readonly string[],
  removed: readonly string[],
  prefix: StateIdPrefix,
): readonly KeyedEntry[] {
  const afterRemoval = removeByIds(current, removed);
  const additions = assignIds(current, added, prefix);
  return [...afterRemoval, ...additions];
}

export function applyActiveStateChanges(current: ActiveState, changes: ActiveStateChanges): ActiveState {
  return {
    currentLocation: changes.newLocation ?? current.currentLocation,
    activeThreats: applyKeyedChanges(current.activeThreats, changes.threatsAdded, changes.threatsRemoved, 'th'),
    activeConstraints: applyKeyedChanges(
      current.activeConstraints,
      changes.constraintsAdded,
      changes.constraintsRemoved,
      'cn',
    ),
    openThreads: applyKeyedChanges(current.openThreads, changes.threadsAdded, changes.threadsResolved, 'td'),
  };
}
