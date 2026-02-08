# ACTSTAARC-003: Implement applyActiveStateChanges Function

**Status**: PENDING
**Priority**: HIGH (blocking page model changes)
**Depends On**: ACTSTAARC-001, ACTSTAARC-002
**Estimated Scope**: Medium

---

## Summary

Implement the core function that applies `ActiveStateChanges` to an `ActiveState`, producing a new accumulated state. This is the heart of the state accumulation system, handling prefix-based parsing, matching, and removal.

---

## Files to Touch

### Create
- `src/models/state/active-state-apply.ts` - New file with apply function

### Modify
- `src/models/state/index.ts` - Export new function

---

## Out of Scope (DO NOT CHANGE)

- `src/models/state/tagged-entry.ts` - Types only (ACTSTAARC-001)
- `src/models/state/active-state.ts` - Types only (ACTSTAARC-002)
- `src/models/state/general-state.ts` - Old system (deprecated separately)
- `src/models/page.ts` - Changed in ACTSTAARC-004
- Any prompt files
- Any persistence files

---

## Implementation Details

### applyActiveStateChanges Function

```typescript
import { modelWarn } from '../model-logger.js';
import { parseTaggedEntry, isValidRemovalPrefix, extractPrefixFromRemoval } from './tagged-entry.js';
import { ActiveState, ActiveStateChanges } from './active-state.js';

export function applyActiveStateChanges(
  current: ActiveState,
  changes: ActiveStateChanges
): ActiveState {
  // 1. Handle location
  const newLocation = changes.newLocation !== null
    ? changes.newLocation
    : current.currentLocation;

  // 2. Apply threat changes (removals first, then additions)
  const activeThreats = applyTaggedChanges(
    current.activeThreats,
    changes.threatsAdded,
    changes.threatsRemoved,
    'THREAT'
  );

  // 3. Apply constraint changes
  const activeConstraints = applyTaggedChanges(
    current.activeConstraints,
    changes.constraintsAdded,
    changes.constraintsRemoved,
    'CONSTRAINT'
  );

  // 4. Apply thread changes
  const openThreads = applyTaggedChanges(
    current.openThreads,
    changes.threadsAdded,
    changes.threadsResolved,
    'THREAD'
  );

  return {
    currentLocation: newLocation,
    activeThreats,
    activeConstraints,
    openThreads,
  };
}
```

### applyTaggedChanges Helper

```typescript
function applyTaggedChanges(
  current: readonly TaggedStateEntry[],
  added: readonly string[],
  removed: readonly string[],
  expectedCategory: StateCategory
): TaggedStateEntry[] {
  // 1. Process removals first
  let result = [...current];

  for (const removal of removed) {
    const prefix = extractPrefixFromRemoval(removal);
    if (!prefix) {
      modelWarn(`Invalid removal format, skipping: "${removal}"`);
      continue;
    }

    const index = result.findIndex(entry => entry.prefix === prefix);
    if (index === -1) {
      modelWarn(`Removal prefix not found, skipping: "${prefix}"`);
      continue;
    }

    result.splice(index, 1);
  }

  // 2. Process additions
  for (const addition of added) {
    const entry = parseTaggedEntry(addition);
    if (!entry) {
      modelWarn(`Invalid addition format, skipping: "${addition}"`);
      continue;
    }

    // Validate category matches expected
    if (!entry.prefix.startsWith(expectedCategory + '_')) {
      modelWarn(`Entry category mismatch: expected ${expectedCategory}, got "${entry.prefix}"`);
      continue;
    }

    result.push(entry);
  }

  return result;
}
```

### Processing Order

**Critical**: Removals MUST be processed before additions. This allows:
1. Replacing an entry: Remove old `THREAT_X`, add new `THREAT_X: updated description`
2. Clean state transitions: Old state cleared before new state applied

---

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/models/state/active-state-apply.test.ts`:

```typescript
describe('applyActiveStateChanges', () => {
  const emptyState: ActiveState = {
    currentLocation: '',
    activeThreats: [],
    activeConstraints: [],
    openThreads: [],
  };

  it('applies threat addition', () => {
    const changes: ActiveStateChanges = {
      newLocation: null,
      threatsAdded: ['THREAT_FIRE: Fire spreading from east'],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
    };

    const result = applyActiveStateChanges(emptyState, changes);
    expect(result.activeThreats).toHaveLength(1);
    expect(result.activeThreats[0].prefix).toBe('THREAT_FIRE');
    expect(result.activeThreats[0].description).toBe('Fire spreading from east');
  });

  it('removes threat by prefix match', () => {
    const currentState: ActiveState = {
      currentLocation: 'Corridor',
      activeThreats: [
        { prefix: 'THREAT_FIRE', description: 'Fire spreading', raw: 'THREAT_FIRE: Fire spreading' },
      ],
      activeConstraints: [],
      openThreads: [],
    };

    const changes: ActiveStateChanges = {
      newLocation: null,
      threatsAdded: [],
      threatsRemoved: ['THREAT_FIRE'],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
    };

    const result = applyActiveStateChanges(currentState, changes);
    expect(result.activeThreats).toHaveLength(0);
  });

  it('ignores removal of non-existent prefix (logs warning)', () => {
    const changes: ActiveStateChanges = {
      newLocation: null,
      threatsAdded: [],
      threatsRemoved: ['THREAT_NONEXISTENT'],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
    };

    const result = applyActiveStateChanges(emptyState, changes);
    expect(result.activeThreats).toHaveLength(0);
    // Warning should be logged (verify with spy if needed)
  });

  it('updates location when newLocation provided', () => {
    const changes: ActiveStateChanges = {
      newLocation: 'New Room',
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
    };

    const result = applyActiveStateChanges(emptyState, changes);
    expect(result.currentLocation).toBe('New Room');
  });

  it('preserves location when newLocation is null', () => {
    const currentState: ActiveState = {
      ...emptyState,
      currentLocation: 'Original Room',
    };

    const changes: ActiveStateChanges = {
      newLocation: null,
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
    };

    const result = applyActiveStateChanges(currentState, changes);
    expect(result.currentLocation).toBe('Original Room');
  });

  it('handles empty changes (returns equivalent state)', () => {
    const currentState: ActiveState = {
      currentLocation: 'Room',
      activeThreats: [{ prefix: 'THREAT_A', description: 'A', raw: 'THREAT_A: A' }],
      activeConstraints: [],
      openThreads: [],
    };

    const emptyChanges: ActiveStateChanges = {
      newLocation: null,
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
    };

    const result = applyActiveStateChanges(currentState, emptyChanges);
    expect(result.currentLocation).toBe('Room');
    expect(result.activeThreats).toHaveLength(1);
  });

  it('processes removals before additions (allows replacement)', () => {
    const currentState: ActiveState = {
      currentLocation: '',
      activeThreats: [{ prefix: 'THREAT_OLD', description: 'Old threat', raw: 'THREAT_OLD: Old threat' }],
      activeConstraints: [],
      openThreads: [],
    };

    const changes: ActiveStateChanges = {
      newLocation: null,
      threatsAdded: ['THREAT_OLD: New version of threat'],
      threatsRemoved: ['THREAT_OLD'],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
    };

    const result = applyActiveStateChanges(currentState, changes);
    expect(result.activeThreats).toHaveLength(1);
    expect(result.activeThreats[0].description).toBe('New version of threat');
  });

  it('applies constraint changes', () => {
    const changes: ActiveStateChanges = {
      newLocation: null,
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: ['CONSTRAINT_TIME: Only 10 minutes remaining'],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
    };

    const result = applyActiveStateChanges(emptyState, changes);
    expect(result.activeConstraints).toHaveLength(1);
    expect(result.activeConstraints[0].prefix).toBe('CONSTRAINT_TIME');
  });

  it('resolves threads', () => {
    const currentState: ActiveState = {
      currentLocation: '',
      activeThreats: [],
      activeConstraints: [],
      openThreads: [{ prefix: 'THREAD_MYSTERY', description: 'Unknown', raw: 'THREAD_MYSTERY: Unknown' }],
    };

    const changes: ActiveStateChanges = {
      newLocation: null,
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: ['THREAD_MYSTERY'],
    };

    const result = applyActiveStateChanges(currentState, changes);
    expect(result.openThreads).toHaveLength(0);
  });

  it('skips additions with wrong category for target array', () => {
    const changes: ActiveStateChanges = {
      newLocation: null,
      threatsAdded: ['CONSTRAINT_X: Wrong category'],  // CONSTRAINT in threats array
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
    };

    const result = applyActiveStateChanges(emptyState, changes);
    expect(result.activeThreats).toHaveLength(0);  // Should be skipped with warning
  });

  it('returns new object (immutability)', () => {
    const currentState: ActiveState = {
      currentLocation: 'Room',
      activeThreats: [],
      activeConstraints: [],
      openThreads: [],
    };

    const changes: ActiveStateChanges = {
      newLocation: 'New Room',
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
    };

    const result = applyActiveStateChanges(currentState, changes);
    expect(result).not.toBe(currentState);
    expect(currentState.currentLocation).toBe('Room');  // Original unchanged
  });
});
```

### Invariants That Must Remain True

1. **Immutability**: Input state MUST NOT be mutated; return new object
2. **Removal-First Order**: Removals processed before additions
3. **Graceful Degradation**: Invalid entries logged as warnings, not errors
4. **Prefix Matching**: Removal matches by exact prefix, not substring
5. **Category Validation**: Entries in wrong array are rejected

---

## Definition of Done

- [ ] `src/models/state/active-state-apply.ts` created
- [ ] All 12+ unit tests pass
- [ ] No mutations of input state
- [ ] Warning logs for invalid operations
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
