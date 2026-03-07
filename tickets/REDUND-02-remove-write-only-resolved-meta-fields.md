# REDUND-02: Remove Write-Only resolvedThreadMeta and resolvedPromiseMeta

**Priority**: Quick Win
**Effort**: S
**Dependencies**: None
**Category**: Storage redundancy

## Summary

`Page.resolvedThreadMeta` and `Page.resolvedPromiseMeta` are populated during page building but never read by any production code path. They are diagnostic metadata that can be removed from persistence entirely.

## Problem

Both fields are `Record<string, { ... }>` that track metadata about resolved threads and promises. They are written in `page-builder.ts` but never consumed:
- No route handler reads them
- No view renders them
- No continuation context builder uses them
- No prompt builder references them

The resolution information they carry is already available through:
- `analystResult.promisePayoffAssessments` (promise resolution quality)
- `analystResult.threadPayoffAssessments` (thread resolution quality)
- State diffs between consecutive pages (which threads/promises disappeared)

## Proposed Fix

1. Remove `resolvedThreadMeta` and `resolvedPromiseMeta` from the `Page` interface
2. Remove population logic from `page-builder.ts`
3. Remove from `page-serializer.ts` serialization/deserialization
4. Add backward-compatible deserialization (ignore these fields if present in old page files)
5. Update tests

## Files to Touch

- `src/models/page.ts` — remove both fields from `Page` interface
- `src/engine/page-builder.ts` — remove population logic
- `src/persistence/page-serializer.ts` — remove serialization; add backward-compat ignore on read
- `test/` — update test assertions and mock objects

## Out of Scope

- Changing analyst result structure
- Modifying how threads/promises are resolved in the engine

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Both fields removed from `Page` interface
- [ ] Old page files with these fields still deserialize without error (backward compat)
- [ ] All existing tests pass
- [ ] `npm run test:coverage` thresholds met
