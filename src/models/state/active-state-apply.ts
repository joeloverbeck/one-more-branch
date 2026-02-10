import { ActiveState, ActiveStateChanges, ThreadAddition } from './active-state.js';
import {
  KeyedEntry,
  StateIdPrefix,
  ThreadEntry,
  ThreadType,
  Urgency,
  assignIds,
  getMaxIdNumber,
  isThreadType,
  isUrgency,
  removeByIds,
} from './keyed-entry.js';

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

function applyThreadChanges(
  current: readonly ThreadEntry[],
  added: readonly (string | ThreadAddition)[],
  removed: readonly string[],
): readonly ThreadEntry[] {
  const afterRemoval = removeByIds(current, removed);
  let nextIdNumber = getMaxIdNumber(current, 'td');
  const typedAdditions: ThreadEntry[] = [];

  for (const addedThread of added) {
    if (typeof addedThread === 'string') {
      const text = addedThread.trim();
      if (!text) {
        continue;
      }
      nextIdNumber += 1;
      typedAdditions.push({
        id: `td-${nextIdNumber}`,
        text,
        threadType: ThreadType.INFORMATION,
        urgency: Urgency.MEDIUM,
      });
      continue;
    }

    const text = addedThread.text.trim();
    if (!text) {
      continue;
    }

    nextIdNumber += 1;
    typedAdditions.push({
      id: `td-${nextIdNumber}`,
      text,
      threadType: isThreadType(addedThread.threadType)
        ? addedThread.threadType
        : ThreadType.INFORMATION,
      urgency: isUrgency(addedThread.urgency)
        ? addedThread.urgency
        : Urgency.MEDIUM,
    });
  }

  return [...afterRemoval, ...typedAdditions];
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
    openThreads: applyThreadChanges(current.openThreads, changes.threadsAdded, changes.threadsResolved),
  };
}
