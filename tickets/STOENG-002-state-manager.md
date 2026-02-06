# STOENG-002: State Manager

## Summary

Implement the state accumulation logic for computing and managing accumulated state across story branches. This module handles traversing the page tree to compute cumulative state changes.

## Files to Create/Modify

### Create
- `src/engine/state-manager.ts`

### Modify
- None

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify any files in `src/llm/`
- **DO NOT** create `src/engine/index.ts` (separate ticket)
- **DO NOT** implement persistence operations - pure computation only
- **DO NOT** implement canon management (separate ticket)

## Implementation Details

Create `src/engine/state-manager.ts` with the following exports:

### computeAccumulatedState

```typescript
export function computeAccumulatedState(
  targetPageId: PageId,
  getPage: (id: PageId) => Page | undefined
): AccumulatedState
```

- Build path from target page back to page 1 (root)
- Traverse path forward, accumulating `stateChanges` arrays
- Return `{ changes: [...all accumulated changes] }`

### getParentAccumulatedState

```typescript
export function getParentAccumulatedState(
  parentPage: Page
): AccumulatedState
```

- Simply returns `parentPage.accumulatedState`
- Used when creating child pages

### mergeStateChanges

```typescript
export function mergeStateChanges(
  parentState: AccumulatedState,
  newChanges: readonly string[]
): AccumulatedState
```

- Returns new AccumulatedState with combined changes
- Must be immutable (new object, not mutation)

### formatStateForDisplay

```typescript
export function formatStateForDisplay(state: AccumulatedState): string
```

- Empty state returns `'No significant events yet.'`
- Non-empty returns bulleted list: `'• Event A\n• Event B'`

### getRecentChanges

```typescript
export function getRecentChanges(
  state: AccumulatedState,
  count: number = 5
): string[]
```

- Returns last N changes from state
- Useful for prompt context windows

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/engine/state-manager.test.ts`:

1. **computeAccumulatedState**
   - Accumulates state through 3-page chain correctly
   - Returns empty changes for page 1 with no state changes
   - Handles page with no parent (root) correctly

2. **mergeStateChanges**
   - Combines parent state with new changes
   - Returns new object (immutability check)
   - Handles empty new changes array
   - Handles empty parent state

3. **formatStateForDisplay**
   - Formats state as bulleted list
   - Returns placeholder for empty state
   - Handles single change correctly

4. **getRecentChanges**
   - Returns last N changes
   - Returns all changes if fewer than N exist
   - Defaults to 5 when count not specified

### Invariants That Must Remain True

1. **Pure functions**: All functions must be pure (no side effects)
2. **Immutability**: Never mutate input parameters
3. **Order preservation**: State changes must maintain their temporal order
4. **Branch isolation**: computeAccumulatedState only traverses ancestor chain

## Estimated Size

~100 lines of code + ~120 lines of tests

## Dependencies

- STOENG-001: Engine Types
- Spec 02: Data Models (Page, PageId, AccumulatedState, createEmptyAccumulatedState)
