# ACTSTAARC-014: Remove Old State Types

**Status**: ✅ COMPLETED
**Priority**: MEDIUM (cleanup enables cleaner architecture)
**Depends On**: All other ACTSTAARC tickets (completed)
**Estimated Scope**: Medium
**Completed**: 2026-02-08

---

## Summary

Remove all legacy event-log state types and functions that have been replaced by the active state system. The active state migration is complete (ACTSTAARC-001 through 015, except 012 and 014), and old stories have been migrated to `old-stories/`. No deprecation period needed—complete removal now.

---

## Rationale

- **No backward compatibility burden**: Old stories are archived, new stories use active state
- **Maintenance hygiene**: Unused code becomes a maintenance liability
- **Architectural clarity**: Single source of truth for state management
- **Test simplification**: Remove dual-format handling from tests

---

## Types and Functions to Remove

### From `src/models/state/general-state.ts`

Remove entirely:
- `StateChange` type alias
- `StateChanges` interface
- `AccumulatedState` interface
- `createEmptyAccumulatedState()` function
- `createEmptyStateChanges()` function
- `applyStateChanges()` function
- `accumulateState()` function

### From `src/models/page.ts`

Remove from `Page` interface:
- `stateChanges: StateChanges` field
- `accumulatedState: AccumulatedState` field

Remove from `CreatePageData` interface:
- `stateChanges?: StateChanges` parameter
- `parentAccumulatedState?: AccumulatedState` parameter

Update `createPage()` function:
- Remove state change application logic for old types
- Remove `stateChanges` and `accumulatedState` from page object construction

### From Module Exports

Remove from `src/models/index.ts`:
- All re-exports of old state types and functions

Remove from `src/models/state/index.ts`:
- All re-exports of old state types and functions

---

## Files to Modify

### Core Models
- `src/models/state/general-state.ts` - Remove types and functions
- `src/models/page.ts` - Remove fields and related logic
- `src/models/index.ts` - Update exports
- `src/models/state/index.ts` - Update exports

### Engine Layer
- `src/engine/state-manager.ts` - Remove `computeAccumulatedState`, `mergeStateChanges`, `formatStateForDisplay`
- `src/engine/parent-state-collector.ts` - Remove `accumulatedState` from `CollectedParentState`
- `src/engine/page-builder.ts` - Remove `stateChanges: createEmptyStateChanges()` assignments

### Persistence Layer
- `src/persistence/page-serializer.ts` - Remove `stateChanges` and `accumulatedState` from `PageFileData`
- `src/persistence/page-state-service.ts` - Update if it references old types

### LLM Layer
- `src/llm/types.ts` - Remove `accumulatedState` from `ContinuationContext` (if present)

---

## Test Updates Required

All tests referencing old state types must be updated. Key patterns to find and remove:

```typescript
// REMOVE patterns like:
stateChanges: { added: [...], removed: [...] }
accumulatedState: { changes: [...] }
parentAccumulatedState: page.accumulatedState
createEmptyStateChanges()
createEmptyAccumulatedState()
```

### Test directories to scan:
- `test/unit/models/`
- `test/unit/engine/`
- `test/unit/persistence/`
- `test/integration/`
- `test/e2e/`
- `test/performance/`
- `test/memory/`

---

## Implementation Order

1. **Remove type definitions** (general-state.ts)
2. **Update Page model** (page.ts)
3. **Update module exports** (index.ts files)
4. **Update engine layer** (state-manager, parent-state-collector, page-builder)
5. **Update persistence layer** (page-serializer, page-state-service)
6. **Update LLM types** (types.ts)
7. **Update all tests** (comprehensive scan and update)
8. **Verify clean build**

---

## Acceptance Criteria

### Code Verification

```bash
# No old type references in source
grep -r "StateChange\|AccumulatedState" src/ --include="*.ts" | grep -v ".test.ts"
# Expected: No output

# No old field references in models
grep -r "stateChanges\|accumulatedState" src/models/ --include="*.ts"
# Expected: No output (or only comments explaining removal)
```

### Build Verification

```bash
npm run typecheck  # Must pass
npm run lint       # Must pass
npm run build      # Must succeed
```

### Test Verification

```bash
npm run test       # All tests pass
npm run test:coverage  # Coverage maintained
```

---

## Definition of Done

- [x] All old state types removed from `general-state.ts`
- [x] `Page` interface no longer has `stateChanges` or `accumulatedState`
- [x] `CreatePageData` no longer has old state parameters
- [x] Module exports updated (no old type exports)
- [x] State manager functions for old types removed
- [x] Parent state collector uses only active state
- [x] Page builder uses only active state
- [x] Persistence serialization uses only active state
- [x] All test files updated
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] `npm run test` passes
- [x] Grep verification confirms no old type references

---

## Out of Scope

- Modifying `old-stories/` directory (archived data left as-is)
- Creating migration scripts for old stories (they're archived, not active)
- Adding any backward compatibility shims
- Adding deprecation warnings (we're removing, not deprecating)

---

## Outcome

**Completed**: 2026-02-08

### Files Removed
- `src/engine/state-manager.ts` - Deleted entirely
- `src/models/state/general-state.ts` - Deleted entirely
- `src/persistence/page-state-service.ts` - Deleted entirely
- `test/unit/engine/state-manager.test.ts` - Deleted
- `test/unit/persistence/page-state-service.test.ts` - Deleted
- `test/integration/persistence/page-state-service.test.ts` - Deleted

### Files Updated
- `src/engine/index.ts` - Removed state-manager exports
- `src/engine/page-builder.ts` - Uses only active state
- `src/engine/page-service.ts` - Uses only active state
- `src/engine/parent-state-collector.ts` - Uses only active state
- `src/models/index.ts` - Removed old state exports
- `src/models/state/index.ts` - Removed old state exports
- `src/models/page.ts` - Removed old state fields
- `src/persistence/page-serializer.ts` - Uses only active state
- `src/persistence/storage.ts` - Uses only active state
- `src/persistence/index.ts` - Removed page-state-service exports
- `src/llm/types.ts` - Uses only active state
- All test files updated to use active state format

### Verification Results
- Build passes
- Typecheck passes
- All tests pass
