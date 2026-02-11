**Status**: ✅ COMPLETED

# FAIHANANDOBSSPE-04: Expose Deterministic User-Facing Reconciliation Hard Error Contract

## Summary
Introduce and surface deterministic reconciliation hard-failure contract so API consumers receive `GENERATION_RECONCILIATION_FAILED` with retry flag and compact reconciliation issue codes.

## Assumptions Reassessment (before implementation)
- Confirmed: Reconciler does retry exactly once and throws `StateReconciliationError` on second failure (`src/engine/page-service.ts`).
- Confirmed: Play route currently only has explicit JSON contract handling for `LLMError`; non-LLM errors return a generic `{ error }` payload (`src/server/routes/play.ts`).
- Discrepancy: `EngineErrorCode` does **not** currently include `GENERATION_RECONCILIATION_FAILED` (`src/engine/types.ts`).
- Discrepancy: No existing unit test coverage for reconciliation-specific error payload in `POST /:storyId/choice` (`test/unit/server/routes/play.test.ts`).
- Scope correction: No behavior change is required in `src/engine/state-reconciler-errors.ts` for this ticket, because reconciliation diagnostics already provide stable issue codes consumable by route formatting.

## Depends on
- `tickets/FAIHANANDOBSSPE-02-page-service-stage-lifecycle-and-retry-observability.md`

## Blocks
- `tickets/FAIHANANDOBSSPE-05-integration-observability-and-hard-failure-coverage.md`

## File list it expects to touch
- `src/engine/types.ts`
- `src/server/routes/play.ts`
- `test/unit/server/routes/play.test.ts`
- `test/unit/engine/types.test.ts`

## Implementation checklist
1. Add/extend engine error code support for `GENERATION_RECONCILIATION_FAILED`.
2. Ensure second reconciler failure path resolves to the deterministic error contract rather than ambiguous generic engine failure.
3. In `play` route error handling, add explicit branch for reconciliation hard errors and return user-safe payload containing:
   - high-level message
   - `retryAttempted` boolean
   - compact `reconciliationIssueCodes` array
   - deterministic `code` value `GENERATION_RECONCILIATION_FAILED`
4. Preserve existing `LLMError` handling behavior and debug payload gating by environment.
5. Add unit tests for route JSON contract when reconciliation hard error is thrown.

## Out of scope
- Changing HTTP status policy for all error classes.
- Rewriting generic app-wide error middleware.
- Modifying story creation route error formatting.
- Adding UI rendering changes for play page templates.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/server/routes/play.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/engine/types.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Existing `LLMError` formatting behavior remains unchanged for provider/API failures.
- Non-reconciliation engine errors (`INVALID_CHOICE`, `PAGE_NOT_FOUND`, etc.) retain current behavior unless explicitly required for this new contract.
- Reconciliation diagnostic details exposed to users remain compact and safe (codes only, no raw prompt/provider payload leakage).

## Outcome
- Completed on: 2026-02-11
- What changed:
  - Added `GENERATION_RECONCILIATION_FAILED` to `EngineErrorCode` in `src/engine/types.ts`.
  - Added explicit reconciliation hard-failure handling in `POST /play/:storyId/choice` to return deterministic user-safe JSON contract (`code`, `retryAttempted`, compact deduplicated `reconciliationIssueCodes`) in `src/server/routes/play.ts`.
  - Added unit coverage for reconciliation hard-failure route contract and an LLMError regression guard in `test/unit/server/routes/play.test.ts`.
  - Added unit coverage for the new engine code in `test/unit/engine/types.test.ts`.
- Deviations from original plan:
  - `src/engine/state-reconciler-errors.ts` was not changed because existing diagnostics and error shape already satisfied contract needs.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/server/routes/play.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/engine/types.test.ts`
  - `npm run typecheck`
