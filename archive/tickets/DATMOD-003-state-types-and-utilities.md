# DATMOD-003: State Types and Utilities

## Status

Completed (2026-02-05)

## Summary

Implement state management types and utilities for tracking narrative state changes and global canon facts.

## Reassessed Assumptions (2026-02-05)

- `src/models/state.ts` did not exist and needed to be created in this ticket.
- `test/unit/models/state.test.ts` did not exist and needed to be created in this ticket.
- Existing model files (`id.ts`, `choice.ts`) use extensionless relative imports and strict immutable-style return values; this ticket follows that style.
- `specs/02-data-models.md` defines `addCanonFact` to return the original `canon` array when a case-insensitive duplicate is detected.
- The original ticket text had an internal contradiction: it required returning the same `canon` on duplicates while also claiming all functions always return new arrays.

## Updated Scope

- Implement only `src/models/state.ts` with `StateChange`, `StateChanges`, `CanonFact`, `GlobalCanon`, `AccumulatedState`, and the four utility functions listed below.
- Add focused unit tests in `test/unit/models/state.test.ts` for acceptance criteria plus edge coverage for trimming and duplicate detection.
- Preserve API signatures listed in this ticket; do not create or modify other model modules.

## Files to Touch

### Create
- `src/models/state.ts`
- `test/unit/models/state.test.ts`

### Modify
- `archive/tickets/DATMOD-003-state-types-and-utilities.md` (assumptions/scope/status/outcome updates)

## Out of Scope

- **DO NOT** create page.ts, story.ts, validation.ts, or index.ts
- **DO NOT** implement Page or Story interfaces
- **DO NOT** modify id.ts or choice.ts
- **DO NOT** add any new dependencies

## Implementation Details

### Types to Create

```typescript
// Human-readable string describing an event/change
type StateChange = string;

// Collection of state changes (readonly array)
type StateChanges = readonly StateChange[];

// A global fact about the world
type CanonFact = string;

// Collection of global canon facts (readonly array)
type GlobalCanon = readonly CanonFact[];

// Accumulated state at a point in the story
interface AccumulatedState {
  readonly changes: StateChanges;
}
```

### Functions to Create

1. `createEmptyAccumulatedState()` → Returns `{ changes: [] }`

2. `accumulateState(parentState: AccumulatedState, newChanges: StateChanges)` → AccumulatedState
   - Returns new object with `changes: [...parentState.changes, ...newChanges]`
   - Must NOT mutate parentState

3. `addCanonFact(canon: GlobalCanon, fact: CanonFact)` → GlobalCanon
   - Adds fact to canon if not already present (case-insensitive comparison)
   - Trims fact before adding
   - Returns same array if duplicate found
   - Must NOT mutate original canon

4. `mergeCanonFacts(canon: GlobalCanon, facts: CanonFact[])` → GlobalCanon
   - Adds multiple facts using reduce + addCanonFact
   - Skips duplicates

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/models/state.test.ts` with:

- [x] `createEmptyAccumulatedState()` returns `{ changes: [] }`
- [x] `accumulateState({ changes: ['Event A'] }, ['Event B', 'Event C'])` returns `{ changes: ['Event A', 'Event B', 'Event C'] }`
- [x] `accumulateState` does NOT mutate parent state (verify parent unchanged after call)
- [x] `addCanonFact(['Fact A'], 'Fact B')` returns `['Fact A', 'Fact B']`
- [x] `addCanonFact(['The kingdom exists'], 'THE KINGDOM EXISTS')` returns `['The kingdom exists']` (no duplicate)
- [x] `addCanonFact` does NOT mutate original canon (verify original unchanged)
- [x] `mergeCanonFacts(['Fact A'], ['Fact B', 'Fact C'])` returns `['Fact A', 'Fact B', 'Fact C']`
- [x] `mergeCanonFacts(['Fact A'], ['Fact A', 'Fact B'])` returns `['Fact A', 'Fact B']` (skips duplicate)

### Invariants That Must Remain True

1. **State Immutability**: State accumulation utilities never mutate input state arrays/objects
2. **Canon Uniqueness**: No duplicate facts in GlobalCanon (case-insensitive)
3. **Canon Structural Sharing on Duplicate**: `addCanonFact` returns original `canon` reference when fact already exists
4. **State Accumulation**: Accumulated state = parent changes + new changes in order
5. **Empty State**: Empty accumulated state has empty changes array

## Dependencies

- None (no imports from other model files)

## Estimated Diff Size

- ~60 lines in `src/models/state.ts`
- ~70 lines in `test/unit/models/state.test.ts`

## Outcome

Originally planned:
- Add `src/models/state.ts` and `test/unit/models/state.test.ts` with state/canon types and four utility functions.
- Validate accumulation ordering, immutability, and canon duplicate handling.

Actually changed:
- Added `src/models/state.ts` with `StateChange`, `StateChanges`, `CanonFact`, `GlobalCanon`, `AccumulatedState`, `createEmptyAccumulatedState`, `accumulateState`, `addCanonFact`, and `mergeCanonFacts`.
- Added `test/unit/models/state.test.ts` covering all listed acceptance tests.
- Added extra edge-case tests for trimming behavior and duplicate canonical fact reference reuse (`toBe` identity check).
- Corrected ticket invariants to remove the contradiction around duplicate handling and immutable behavior.
