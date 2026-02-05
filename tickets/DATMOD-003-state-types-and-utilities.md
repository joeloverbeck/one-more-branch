# DATMOD-003: State Types and Utilities

## Summary

Implement state management types and utilities for tracking narrative state changes and global canon facts.

## Files to Touch

### Create
- `src/models/state.ts`

### Modify
- None

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

- [ ] `createEmptyAccumulatedState()` returns `{ changes: [] }`
- [ ] `accumulateState({ changes: ['Event A'] }, ['Event B', 'Event C'])` returns `{ changes: ['Event A', 'Event B', 'Event C'] }`
- [ ] `accumulateState` does NOT mutate parent state (verify parent unchanged after call)
- [ ] `addCanonFact(['Fact A'], 'Fact B')` returns `['Fact A', 'Fact B']`
- [ ] `addCanonFact(['The kingdom exists'], 'THE KINGDOM EXISTS')` returns `['The kingdom exists']` (no duplicate)
- [ ] `addCanonFact` does NOT mutate original canon (verify original unchanged)
- [ ] `mergeCanonFacts(['Fact A'], ['Fact B', 'Fact C'])` returns `['Fact A', 'Fact B', 'Fact C']`
- [ ] `mergeCanonFacts(['Fact A'], ['Fact A', 'Fact B'])` returns `['Fact A', 'Fact B']` (skips duplicate)

### Invariants That Must Remain True

1. **State Immutability**: All functions return new arrays, never mutate inputs
2. **Canon Uniqueness**: No duplicate facts in GlobalCanon (case-insensitive)
3. **State Accumulation**: Accumulated state = parent changes + new changes in order
4. **Empty State**: Empty accumulated state has empty changes array

## Dependencies

- None (no imports from other model files)

## Estimated Diff Size

- ~60 lines in `src/models/state.ts`
- ~60 lines in `test/unit/models/state.test.ts`
