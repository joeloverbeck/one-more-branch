# REDUND-07: Prune Resolved Promises from accumulatedPromises

**Status**: COMPLETED
**Priority**: Medium
**Effort**: M
**Dependencies**: REDUND-02 (remove resolvedPromiseMeta)
**Category**: Storage redundancy (architectural)

## Summary

The original assumption is outdated. Resolved promises are already pruned from `accumulatedPromises` in the narrative lifecycle path (`computeNarrativeStateLifecycle` -> `computeAccumulatedPromises`). The implementation already keeps `accumulatedPromises` bounded to active promises (plus aging/expiry behavior).

## Reassessed Assumptions

Validated against current code:
- `src/engine/state-lifecycle.ts` passes `analystPromisesResolved` into `computeAccumulatedPromises(...)` for continuation pages.
- `src/engine/promise-lifecycle.ts` removes resolved IDs (`filter((promise) => !resolvedSet.has(promise.id))`) before carrying promises forward.
- `src/engine/page-builder.ts` consumes lifecycle output; it does not independently own pruning logic.
- Existing tests already assert detect -> age -> resolve behavior, including resolved promise removal in integration/unit coverage.

Corrected behavioral statement:
- Promise detected on page N -> added to `accumulatedPromises`
- Promise resolved on page M -> removed from `accumulatedPromises` on page M output (via lifecycle)
- Pages after M serialize only active tracked promises

## Updated Scope

1. Verify current pruning architecture remains correct and centralized in lifecycle (no duplicate filtering in `page-builder`).
2. Run targeted tests for unit + integration paths where promises are detected/resolved.
3. Confirm downstream consumers rely on active promises only, while resolved-promise UI metadata is derived from the parent page + analyst `promisesResolved` IDs.
4. If gaps are found, strengthen tests (not architecture duplication).

## Architecture Decision

Compared to the original proposal, the current architecture is stronger:
- Lifecycle rules are centralized (`state-lifecycle` / `promise-lifecycle`) rather than split across orchestration and assembly layers.
- `page-builder` stays a composition layer instead of becoming another lifecycle rule owner.
- No backward-compat aliasing is needed; active promises are canonical, resolved IDs stay in analyst output.

This ticket should not introduce page-builder-level pruning because that would duplicate lifecycle behavior and increase long-term drift risk.

## Files to Touch

- `tickets/REDUND-07-prune-resolved-promises-from-accumulated-array.md` — reassess assumptions/scope
- `test/` — only if additional guardrail coverage is needed after verification

## Risks

- Regression risk: future refactors may bypass lifecycle and accidentally reintroduce resolved promises.
- Prompt behavior risk: ensure Promise Tracker consumes active promises while using resolved IDs from analyst output for closures.
- Mitigation: keep lifecycle-centralized tests as guardrails.

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] Relevant unit/integration tests for promise lifecycle and page pipeline pass
- [x] Verified: resolved promises are pruned by lifecycle (not page-builder)
- [x] Ticket updated + archived with outcome notes

## Outcome

- Completion date: 2026-03-07
- Actual changes:
  - Reassessed and corrected ticket assumptions/scope to reflect current architecture.
  - Confirmed resolved promise pruning is already implemented in lifecycle (`state-lifecycle` + `promise-lifecycle`) and not `page-builder`.
  - Verified downstream usage (`continuation-context`, prompts, and UI metadata derivation) is compatible with active-only `accumulatedPromises`.
- Deviations from original plan:
  - No engine code changes were made because the proposed implementation already exists and is architecturally cleaner than duplicating pruning in `page-builder`.
  - Scope shifted from implementation to verification and ticket correction.
- Verification results:
  - `npm run typecheck` passed.
  - `npm run lint` passed.
  - `npm run test:unit -- test/unit/engine/state-lifecycle.test.ts test/unit/server/utils/page-panel-data.test.ts` passed (suite command executed unit test set).
  - `npm run test:integration -- test/integration/engine/page-builder-pipeline.test.ts test/integration/engine/page-service.test.ts` passed (suite command executed integration test set).
