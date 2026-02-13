/**
 * Active State Test Fixtures
 *
 * Provides mock factories and fixture data for active state testing.
 */

import {
  ActiveState,
  ActiveStateChanges,
  ConstraintType,
  KeyedEntry,
  ThreatType,
  ThreadEntry,
  ThreadType,
  Urgency,
  createEmptyActiveState,
  createEmptyActiveStateChanges,
} from '../../src/models/state/index.js';

/**
 * Creates a mock keyed state entry for testing.
 */
export function createMockKeyedEntry(
  prefix: 'th' | 'cn' | 'td',
  id: number,
  text: string
): KeyedEntry {
  const metadata =
    prefix === 'th'
      ? { threatType: ThreatType.ENVIRONMENTAL }
      : prefix === 'cn'
        ? { constraintType: ConstraintType.PHYSICAL }
        : { threadType: ThreadType.INFORMATION, urgency: Urgency.MEDIUM };

  return {
    id: `${prefix}-${id}`,
    text,
    ...metadata,
  };
}

/**
 * Creates a mock thread entry with required metadata.
 */
export function createMockThreadEntry(
  id: number,
  text: string,
  threadType: ThreadType = ThreadType.INFORMATION,
  urgency: Urgency = Urgency.MEDIUM
): ThreadEntry {
  return {
    id: `td-${id}`,
    text,
    threadType,
    urgency,
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
  emptyActiveState: createEmptyActiveState(),
  emptyActiveStateChanges: createEmptyActiveStateChanges(),

  stateWithThreat: {
    currentLocation: 'Dark corridor',
    activeThreats: [createMockKeyedEntry('th', 1, 'Fire spreading from the east wing')],
    activeConstraints: [],
    openThreads: [],
  } as ActiveState,

  stateWithConstraint: {
    currentLocation: 'Library',
    activeThreats: [],
    activeConstraints: [createMockKeyedEntry('cn', 1, 'Must stay quiet to avoid detection')],
    openThreads: [],
  } as ActiveState,

  stateWithThread: {
    currentLocation: 'Town square',
    activeThreats: [],
    activeConstraints: [],
    openThreads: [createMockThreadEntry(1, "The mysterious letter's contents remain unknown")],
  } as ActiveState,

  fullState: {
    currentLocation: 'Cave entrance',
    activeThreats: [
      createMockKeyedEntry('th', 1, 'A wolf pack is hunting nearby'),
      createMockKeyedEntry('th', 2, 'A violent storm is approaching'),
    ],
    activeConstraints: [createMockKeyedEntry('cn', 1, 'Injured leg limits mobility')],
    openThreads: [
      createMockThreadEntry(
        1,
        "The map's destination remains unclear",
        ThreadType.MYSTERY,
        Urgency.HIGH
      ),
    ],
  } as ActiveState,

  changesAddingThreat: {
    newLocation: null,
    threatsAdded: [{ text: 'Fire spreading from the east wing', threatType: ThreatType.ENVIRONMENTAL }],
    threatsRemoved: [],
    constraintsAdded: [],
    constraintsRemoved: [],
    threadsAdded: [],
    threadsResolved: [],
  } as ActiveStateChanges,

  changesRemovingThreat: {
    newLocation: null,
    threatsAdded: [],
    threatsRemoved: ['th-1'],
    constraintsAdded: [],
    constraintsRemoved: [],
    threadsAdded: [],
    threadsResolved: [],
  } as ActiveStateChanges,

  changesUpdatingLocation: {
    newLocation: 'New hidden chamber',
    threatsAdded: [],
    threatsRemoved: [],
    constraintsAdded: [],
    constraintsRemoved: [],
    threadsAdded: [],
    threadsResolved: [],
  } as ActiveStateChanges,

  complexChanges: {
    newLocation: 'Underground passage',
    threatsAdded: [{ text: 'The tunnel is unstable', threatType: ThreatType.ENVIRONMENTAL }],
    threatsRemoved: ['th-1'],
    constraintsAdded: [
      { text: 'Complete darkness requires careful movement', constraintType: ConstraintType.ENVIRONMENTAL },
    ],
    constraintsRemoved: [],
    threadsAdded: [
      { text: 'Strange sounds echo from below', threadType: ThreadType.MYSTERY, urgency: Urgency.HIGH },
    ],
    threadsResolved: ['td-1'],
  } as ActiveStateChanges,
} as const;
