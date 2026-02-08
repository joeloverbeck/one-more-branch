/**
 * Active State Test Fixtures
 *
 * Provides mock factories and fixture data for active state testing.
 */

import {
  ActiveState,
  ActiveStateChanges,
  TaggedStateEntry,
  createEmptyActiveState,
  createEmptyActiveStateChanges,
} from '../../src/models/state/index.js';

/**
 * Creates a mock tagged state entry for testing.
 *
 * @param category - The category: THREAT, CONSTRAINT, or THREAD
 * @param id - Unique identifier for this entry (e.g., 'FIRE', 'TIME_LIMIT')
 * @param description - Human-readable description of the entry
 */
export function createMockTaggedEntry(
  category: 'THREAT' | 'CONSTRAINT' | 'THREAD',
  id: string,
  description: string
): TaggedStateEntry {
  const prefix = `${category}_${id}`;
  return {
    prefix,
    description,
    raw: `${prefix}: ${description}`,
  };
}

/**
 * Creates a mock ActiveState with optional overrides.
 */
export function createMockActiveState(overrides: Partial<ActiveState> = {}): ActiveState {
  return {
    currentLocation: '',
    activeThreats: [],
    activeConstraints: [],
    openThreads: [],
    ...overrides,
  };
}

/**
 * Creates a mock ActiveStateChanges with optional overrides.
 */
export function createMockActiveStateChanges(
  overrides: Partial<ActiveStateChanges> = {}
): ActiveStateChanges {
  return {
    newLocation: null,
    threatsAdded: [],
    threatsRemoved: [],
    constraintsAdded: [],
    constraintsRemoved: [],
    threadsAdded: [],
    threadsResolved: [],
    ...overrides,
  };
}

/**
 * Common fixture scenarios for active state testing.
 */
export const FIXTURES = {
  /** Empty active state - all arrays empty, no location */
  emptyActiveState: createEmptyActiveState(),

  /** Empty active state changes - no modifications */
  emptyActiveStateChanges: createEmptyActiveStateChanges(),

  /** State with a single active threat */
  stateWithThreat: {
    currentLocation: 'Dark corridor',
    activeThreats: [createMockTaggedEntry('THREAT', 'FIRE', 'Fire spreading from the east wing')],
    activeConstraints: [],
    openThreads: [],
  } as ActiveState,

  /** State with a single constraint */
  stateWithConstraint: {
    currentLocation: 'Library',
    activeThreats: [],
    activeConstraints: [createMockTaggedEntry('CONSTRAINT', 'QUIET', 'Must stay quiet to avoid detection')],
    openThreads: [],
  } as ActiveState,

  /** State with a single open thread */
  stateWithThread: {
    currentLocation: 'Town square',
    activeThreats: [],
    activeConstraints: [],
    openThreads: [createMockTaggedEntry('THREAD', 'LETTER', "The mysterious letter's contents remain unknown")],
  } as ActiveState,

  /** Full state with multiple entries in all categories */
  fullState: {
    currentLocation: 'Cave entrance',
    activeThreats: [
      createMockTaggedEntry('THREAT', 'WOLVES', 'A wolf pack is hunting nearby'),
      createMockTaggedEntry('THREAT', 'STORM', 'A violent storm is approaching'),
    ],
    activeConstraints: [
      createMockTaggedEntry('CONSTRAINT', 'INJURED', 'Injured leg limits mobility'),
    ],
    openThreads: [
      createMockTaggedEntry('THREAD', 'MAP', "The map's destination remains unclear"),
    ],
  } as ActiveState,

  /** Changes that add a threat */
  changesAddingThreat: {
    newLocation: null,
    threatsAdded: ['THREAT_FIRE: Fire spreading from the east wing'],
    threatsRemoved: [],
    constraintsAdded: [],
    constraintsRemoved: [],
    threadsAdded: [],
    threadsResolved: [],
  } as ActiveStateChanges,

  /** Changes that remove a threat */
  changesRemovingThreat: {
    newLocation: null,
    threatsAdded: [],
    threatsRemoved: ['THREAT_FIRE'],
    constraintsAdded: [],
    constraintsRemoved: [],
    threadsAdded: [],
    threadsResolved: [],
  } as ActiveStateChanges,

  /** Changes that update location */
  changesUpdatingLocation: {
    newLocation: 'New hidden chamber',
    threatsAdded: [],
    threatsRemoved: [],
    constraintsAdded: [],
    constraintsRemoved: [],
    threadsAdded: [],
    threadsResolved: [],
  } as ActiveStateChanges,

  /** Complex changes with multiple operations */
  complexChanges: {
    newLocation: 'Underground passage',
    threatsAdded: ['THREAT_COLLAPSE: The tunnel is unstable'],
    threatsRemoved: ['THREAT_WOLVES'],
    constraintsAdded: ['CONSTRAINT_DARKNESS: Complete darkness requires careful movement'],
    constraintsRemoved: [],
    threadsAdded: ['THREAD_SOUNDS: Strange sounds echo from below'],
    threadsResolved: ['THREAD_MAP'],
  } as ActiveStateChanges,
} as const;
