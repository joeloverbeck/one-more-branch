# FAIHANANDOBSSPE-05: Add End-to-End Observability and Hard-Failure Integration Coverage

**Status**: ✅ COMPLETED

## Summary
Close the remaining integration-test gap for Spec 13 by asserting lifecycle logs and pipeline metrics in success and hard-failure paths. Existing unit and route tests already cover retry-once behavior, retry reason payload forwarding, and deterministic user-facing hard-failure response contract.

## Depends on
- `tickets/FAIHANANDOBSSPE-02-page-service-stage-lifecycle-and-retry-observability.md`
- `tickets/FAIHANANDOBSSPE-03-llm-observability-counter-alignment.md`
- `tickets/FAIHANANDOBSSPE-04-user-facing-reconciliation-hard-error-contract.md`

## File list it expects to touch
- `test/integration/engine/page-service.test.ts`

## Reassessed assumptions
- `test/unit/engine/page-service.test.ts` already asserts:
  - retry reason payload propagation into second-attempt planner/writer calls,
  - stage lifecycle logging,
  - pipeline metrics (`finalStatus`, `reconcilerRetried`, durations, issue counters),
  - deterministic one-retry hard-failure behavior.
- `test/unit/server/routes/play.test.ts` already asserts the reconciliation hard-failure response contract (`GENERATION_RECONCILIATION_FAILED`, `retryAttempted`, compact unique issue codes).
- `test/integration/engine/page-service.test.ts` already asserts retry-once control flow and typed hard-failure behavior, but does not yet assert lifecycle log payloads or pipeline metrics.

## Implementation checklist
1. Add integration assertions: successful generation emits planner/writer/reconciler lifecycle logs and structured metrics with `finalStatus: 'success'`.
2. Add integration assertions: forced reconciliation failures trigger exactly one retry and emit deterministic hard-failure lifecycle/metrics logs with `finalStatus: 'hard_error'`.
3. Preserve existing unit and route assertions as regression guards (no scope expansion).
4. Keep fixtures/mocks deterministic and avoid introducing timing flakiness (use existing deterministic mocks/timer behavior).

## Out of scope
- Introducing new planner/writer/reconciler business rules.
- Refactoring unrelated test helpers/fixtures.
- Broader e2e browser flow changes.
- Changing coverage thresholds.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/server/routes/play.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Retry semantics remain deterministic: no more than one reconciler retry.
- Integration suite continues to run with mocked LLM/fetch flows and no real API key dependency.
- Spec 00 gates remain satisfied: contract/test/integration integrity without branch-isolation or replay regressions.

## Outcome
- Completion date: 2026-02-11
- Actually changed:
  - Reassessed and corrected ticket assumptions/scope to reflect existing unit and route coverage.
  - Added integration assertions in `test/integration/engine/page-service.test.ts` for:
    - success-path lifecycle logs and pipeline metrics (`finalStatus: 'success'`),
    - hard-failure pipeline metrics log (`finalStatus: 'hard_error'`) after one retry.
- Deviations from original plan:
  - No changes were needed in `test/unit/engine/page-service.test.ts` or `test/unit/server/routes/play.test.ts`; those expectations were already satisfied.
- Verification:
  - `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/server/routes/play.test.ts`
  - `npm run typecheck`
