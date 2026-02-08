import { modelWarn } from '../model-logger.js';
import { ActiveState, ActiveStateChanges } from './active-state.js';
import { parseTaggedEntry, extractPrefixFromRemoval, StateCategory, TaggedStateEntry } from './tagged-entry.js';

function hasExpectedCategoryPrefix(prefix: string, expectedCategory: StateCategory): boolean {
  return prefix.startsWith(`${expectedCategory}_`);
}

function applyTaggedChanges(
  current: readonly TaggedStateEntry[],
  added: readonly string[],
  removed: readonly string[],
  expectedCategory: StateCategory
): TaggedStateEntry[] {
  const result = [...current];

  for (const removal of removed) {
    const prefix = extractPrefixFromRemoval(removal);
    if (!prefix) {
      continue;
    }

    const index = result.findIndex(entry => entry.prefix === prefix);
    if (index === -1) {
      modelWarn(`Removal prefix not found, skipping: "${prefix}"`);
      continue;
    }

    result.splice(index, 1);
  }

  for (const addition of added) {
    const entry = parseTaggedEntry(addition);
    if (!entry) {
      continue;
    }

    if (!hasExpectedCategoryPrefix(entry.prefix, expectedCategory)) {
      modelWarn(`Entry category mismatch: expected ${expectedCategory}, got "${entry.prefix}"`);
      continue;
    }

    result.push(entry);
  }

  return result;
}

export function applyActiveStateChanges(current: ActiveState, changes: ActiveStateChanges): ActiveState {
  return {
    currentLocation: changes.newLocation ?? current.currentLocation,
    activeThreats: applyTaggedChanges(
      current.activeThreats,
      changes.threatsAdded,
      changes.threatsRemoved,
      'THREAT'
    ),
    activeConstraints: applyTaggedChanges(
      current.activeConstraints,
      changes.constraintsAdded,
      changes.constraintsRemoved,
      'CONSTRAINT'
    ),
    openThreads: applyTaggedChanges(
      current.openThreads,
      changes.threadsAdded,
      changes.threadsResolved,
      'THREAD'
    ),
  };
}
