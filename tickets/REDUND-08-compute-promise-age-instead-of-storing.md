# REDUND-08: Compute Promise Age Instead of Storing

**Priority**: Low
**Effort**: S
**Dependencies**: None (but pairs well with REDUND-07)
**Category**: Storage redundancy

## Summary

Each promise in `accumulatedPromises` stores an `age` field that increments by 1 per page. This forces re-serialization of all unchanged promise fields every page. Instead, store a `detectedOnPageNumber` and compute `age` as `currentPageNumber - detectedOnPageNumber`.

## Problem

Promise objects are ~400 bytes each. Only `age` changes between pages — the other 5 fields (description, promiseType, scope, resolutionHint, suggestedUrgency) are static. Re-serializing 5 unchanged fields per promise per page wastes ~350 bytes per promise per page.

## Proposed Fix

1. Add `detectedOnPageNumber: number` to `TrackedPromise` type
2. Remove `age` from stored promise data
3. Compute `age` on-the-fly when building continuation context: `currentPageNumber - detectedOnPageNumber`
4. Update the Promise Tracker prompt context to include computed ages
5. Backward compat: if `age` exists in old data and `detectedOnPageNumber` doesn't, infer detection page

## Files to Touch

- `src/models/state/tracked-promise.ts` (or equivalent) — add `detectedOnPageNumber`, make `age` computed
- `src/engine/continuation-context-builder.ts` — compute age on-the-fly
- `src/engine/page-builder.ts` — set `detectedOnPageNumber` when adding new promises
- `src/persistence/page-serializer.ts` — backward compat for old format
- `test/` — update fixtures and assertions

## Out of Scope

- Changing promise detection logic
- Modifying Promise Tracker prompt

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Promise `age` computed from `detectedOnPageNumber`, not stored
- [ ] Old page files with `age` field still deserialize correctly
- [ ] Promise ages passed to LLM prompts are identical to current behavior
- [ ] All existing tests pass
