# REDUND-08: Compute Promise Age Instead of Storing

**Status**: COMPLETED
**Priority**: Low
**Effort**: S
**Dependencies**: None (but pairs well with REDUND-07)
**Category**: Storage redundancy

## Summary

Each promise in `accumulatedPromises` stores a mutable `age` that increments per continuation. Replace mutable per-promise `age` with immutable detection epoch metadata and compute age on demand.

## Problem

Current architecture mutates every unresolved promise on every continuation (`age = age + 1`). This makes age an eagerly persisted derived value and duplicates update logic across lifecycle and prompt paths.

Important reassessment:
- The original ticket assumption about `currentPageNumber - detectedOnPageNumber` is incorrect in this codebase because page IDs are global across branches, not lineage-local. That would over-age promises when other branches create pages.
- The original storage-savings claim was overstated: page snapshots still serialize full promise objects each page. The real benefit is architectural correctness (single source of truth for age derivation) and reduced per-promise mutation churn.

## Proposed Fix

1. Add immutable `detectedAtPromiseEpoch: number` to `TrackedPromise` and remove mutable `age`.
2. Add `promiseAgeEpoch: number` to `Page` (lineage-local counter; increments by 1 per continuation from the parent page).
3. Compute promise age on demand as `currentPromiseAgeEpoch - detectedAtPromiseEpoch`.
4. Update promise lifecycle logic:
- Existing promises are not mapped/mutated for aging.
- Expiry checks use computed age.
- New detections set `detectedAtPromiseEpoch = currentPromiseAgeEpoch`.
5. Update prompt/context formatting paths to consume computed age values (while keeping rendered prompt behavior unchanged).
6. Do not add backward compatibility shims for legacy `age` fields; migrate tests and current runtime schema only.

## Files to Touch

- `src/models/state/keyed-entry.ts` — update `TrackedPromise` schema/validator
- `src/models/page.ts` — add `promiseAgeEpoch` field and defaults
- `src/persistence/page-serializer-types.ts` + `src/persistence/page-serializer.ts` — serialize/deserialize new fields, remove `age`
- `src/engine/state-lifecycle.ts` + `src/engine/promise-lifecycle.ts` + `src/engine/page-builder.ts` — thread epoch through lifecycle and compute ages from epoch delta
- `src/engine/continuation-context-builder.ts` (+ call sites) — provide age-computed prompt-facing promise data
- Prompt formatting modules that currently read `promise.age`
- `test/` suites covering lifecycle, page builder pipeline, serializer, and prompt formatting

## Out of Scope

- Changing promise detection logic
- Reworking snapshot persistence model beyond promise age representation

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] Promise age is derived from epoch metadata, not stored as mutable per-promise state
- [x] Age progression remains `+1` per continuation on the active lineage (branch-safe)
- [x] Promise ages passed to LLM prompts are identical to current behavior
- [x] All existing tests pass

## Outcome

- Completion date: 2026-03-07
- Implemented:
  - Replaced `TrackedPromise.age` with immutable `detectedAtPromiseEpoch`.
  - Added `Page.promiseAgeEpoch` and threaded it through page creation, lifecycle, persistence, and prompt/context assembly.
  - Added centralized age helpers (`computePromiseAge`, `withPromiseAge`) and switched prompt/UI consumers to computed ages.
  - Updated serializer schema (`page-serializer-types.ts`) and all affected tests.
- Deviations from original proposal:
  - Did **not** use `currentPageNumber - detectedOnPageNumber` because global page IDs are branch-unsafe in this architecture.
  - Implemented lineage-safe epoch model (`promiseAgeEpoch`) instead.
  - No backward-compat deserialization shim was added for legacy `age` data, per ticket reassessment.
- Verification:
  - `npm run typecheck` passed.
  - `npm test` passed (261 suites, 3062 tests).
  - `npm run lint` passed.
