# STANARPROPLA-07: Implement computeAccumulatedPromises and update page builder context

**Status**: COMPLETED
**Depends on**: STANARPROPLA-01, STANARPROPLA-02, STANARPROPLA-03, STANARPROPLA-06
**Blocks**: STANARPROPLA-11, STANARPROPLA-12

## Summary

Replace `computeInheritedNarrativePromises()` (30% word-overlap filtering, hard cap at 5) with `computeAccumulatedPromises()` (removes resolved by ID, ages survivors by +1, assigns sequential `pr-N` IDs to new detections). Update `PageBuildContext` to use the new promise fields. This is the core accumulation logic for the entire feature.

## File list

- **Modify**: `src/engine/page-builder.ts`
  - Remove import of `NarrativePromise` from `'../models/state/keyed-entry'`
  - Remove import of `THREAD_PACING` (if only used for `MAX_INHERITED_PROMISES`)
  - Add imports: `TrackedPromise` from `'../models/state/keyed-entry'`, `DetectedPromise` from `'../llm/analyst-types'`
  - Remove `computeInheritedNarrativePromises()` function entirely (lines 152-176)
  - Add `computeAccumulatedPromises(parentPromises, resolvedIds, detected, maxExistingId)` function (exported)
  - Add `getMaxPromiseIdNumber(promises: readonly TrackedPromise[])` helper
  - Update `PageBuildContext`: replace `parentInheritedNarrativePromises` + `parentAnalystNarrativePromises` with `parentAccumulatedPromises`, `analystPromisesDetected`, `analystPromisesResolved`
  - Update `buildPage()`: replace `computeInheritedNarrativePromises` call with `computeAccumulatedPromises` call, pass `accumulatedPromises` to `createPage`
  - Update deprecated `ContinuationPageBuildContext`: match new field names
  - Update `buildFirstPage()`: pass empty arrays for new promise fields
  - Update `buildContinuationPage()`: pass through new promise fields

- **Create**: `test/unit/engine/page-builder.test.ts` (new describe block, or add to existing)
  - Test: `computeAccumulatedPromises` returns empty for opening pages
  - Test: ages surviving promises by +1
  - Test: removes resolved promises by ID
  - Test: assigns sequential `pr-N` IDs to new detections starting from max existing
  - Test: handles resolve + detect in same page
  - Test: empty description detections are filtered out

## Out of scope

- Do NOT modify `page-service.ts` - that's STANARPROPLA-11
- Do NOT modify `continuation-context-builder.ts` - that's STANARPROPLA-09
- Do NOT modify analyst types, schemas, or prompts
- Do NOT modify serialization layer
- Do NOT fix unrelated test failures in other test files

## Acceptance criteria

### Specific tests that must pass

- `npx jest test/unit/engine/page-builder.test.ts --testNamePattern="computeAccumulatedPromises" --no-coverage` - all new tests PASS
- `npx jest test/unit/engine/page-builder.test.ts --no-coverage` - all existing page builder tests still PASS (may need mock updates for new `PageBuildContext` shape)

### Invariants that must remain true

- `computeAccumulatedPromises` processes promises in this order: (1) remove resolved, (2) age survivors by +1, (3) assign `pr-N` IDs to new detections
- New IDs are assigned sequentially starting from `maxExistingId + 1`
- There is NO hard cap on promise count (unlike the old 5-promise cap)
- There is NO word-overlap filtering (the 30% heuristic is eliminated entirely)
- Empty-description detections are silently filtered out
- `getMaxPromiseIdNumber` extracts the numeric suffix from `pr-N` IDs and returns the max (0 if none)
- The deprecated `buildFirstPage` and `buildContinuationPage` still work as wrappers to `buildPage`
- Thread age computation is unchanged
- All other page building logic (choices, state changes, inventory, health, character state, structure state, protagonist affect, NPC agendas) is unchanged

## Outcome

- Completion date: 2026-02-14
- What was changed:
  - Implemented `computeAccumulatedPromises(parentPromises, resolvedIds, detected, maxExistingId)` in `src/engine/page-builder.ts`.
  - Added `getMaxPromiseIdNumber(promises)` helper in `src/engine/page-builder.ts`.
  - Updated `PageBuildContext` and `ContinuationPageBuildContext` to carry `parentAccumulatedPromises`, `analystPromisesDetected`, and `analystPromisesResolved`.
  - Updated `buildPage`, `buildFirstPage`, and `buildContinuationPage` to use the new promise accumulation flow.
  - Added `computeAccumulatedPromises` tests to `test/unit/engine/page-builder.test.ts` (including resolve+detect same-page and empty-description filtering).
  - Updated context fixtures in impacted engine tests.
- Deviations from plan:
  - Touched `src/engine/page-service.ts` to pass `analystPromisesDetected` and `analystPromisesResolved` into `buildPage` after the context contract changed.
  - Initially placed accumulation tests in `test/unit/engine/thread-age-computation.test.ts`, then moved them into `test/unit/engine/page-builder.test.ts` to align with ticket intent.
- Verification results:
  - `npx jest test/unit/engine/page-builder.test.ts --testNamePattern=\"computeAccumulatedPromises\" --no-coverage` passed.
  - `npx jest test/unit/engine/page-builder.test.ts --no-coverage` passed.
  - `npx jest test/unit/engine/page-builder.test.ts test/unit/engine/thread-age-computation.test.ts --no-coverage` passed.
  - `npm run typecheck` passed.
