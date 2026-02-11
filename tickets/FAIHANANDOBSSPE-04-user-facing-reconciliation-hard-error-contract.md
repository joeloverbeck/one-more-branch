# FAIHANANDOBSSPE-04: Expose Deterministic User-Facing Reconciliation Hard Error Contract

## Summary
Introduce and surface deterministic reconciliation hard-failure contract so API consumers receive `GENERATION_RECONCILIATION_FAILED` with retry flag and compact reconciliation issue codes.

## Depends on
- `tickets/FAIHANANDOBSSPE-02-page-service-stage-lifecycle-and-retry-observability.md`

## Blocks
- `tickets/FAIHANANDOBSSPE-05-integration-observability-and-hard-failure-coverage.md`

## File list it expects to touch
- `src/engine/types.ts`
- `src/engine/state-reconciler-errors.ts`
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

