import {
  ActiveState,
  ActiveStateChanges,
  ConstraintAddition,
  ThreatAddition,
  ThreadAddition,
} from './active-state.js';
import {
  ConstraintEntry,
  ThreatEntry,
  ThreadEntry,
  ThreadType,
  Urgency,
  getMaxIdNumber,
  isThreadType,
  isUrgency,
  removeByIds,
} from './keyed-entry.js';

function applyThreatChanges(
  current: readonly ThreatEntry[],
  added: readonly ThreatAddition[],
  removed: readonly string[]
): readonly ThreatEntry[] {
  const afterRemoval = removeByIds(current, removed);
  let nextIdNumber = getMaxIdNumber(current, 'th');
  const typedAdditions: ThreatEntry[] = [];

  for (const addedThreat of added) {
    const text = addedThreat.text.trim();
    if (!text) {
      continue;
    }

    nextIdNumber += 1;
    typedAdditions.push({
      id: `th-${nextIdNumber}`,
      text,
      threatType: addedThreat.threatType,
    });
  }

  return [...afterRemoval, ...typedAdditions];
}

function applyConstraintChanges(
  current: readonly ConstraintEntry[],
  added: readonly ConstraintAddition[],
  removed: readonly string[]
): readonly ConstraintEntry[] {
  const afterRemoval = removeByIds(current, removed);
  let nextIdNumber = getMaxIdNumber(current, 'cn');
  const typedAdditions: ConstraintEntry[] = [];

  for (const addedConstraint of added) {
    const text = addedConstraint.text.trim();
    if (!text) {
      continue;
    }

    nextIdNumber += 1;
    typedAdditions.push({
      id: `cn-${nextIdNumber}`,
      text,
      constraintType: addedConstraint.constraintType,
    });
  }

  return [...afterRemoval, ...typedAdditions];
}

function applyThreadChanges(
  current: readonly ThreadEntry[],
  added: readonly (string | ThreadAddition)[],
  removed: readonly string[]
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
      urgency: isUrgency(addedThread.urgency) ? addedThread.urgency : Urgency.MEDIUM,
    });
  }

  return [...afterRemoval, ...typedAdditions];
}

export function applyActiveStateChanges(
  current: ActiveState,
  changes: ActiveStateChanges
): ActiveState {
  return {
    currentLocation: changes.newLocation ?? current.currentLocation,
    activeThreats: applyThreatChanges(
      current.activeThreats,
      changes.threatsAdded,
      changes.threatsRemoved
    ),
    activeConstraints: applyConstraintChanges(
      current.activeConstraints,
      changes.constraintsAdded,
      changes.constraintsRemoved
    ),
    openThreads: applyThreadChanges(
      current.openThreads,
      changes.threadsAdded,
      changes.threadsResolved
    ),
  };
}
