# FAIHANANDOBSSPE-05: Add End-to-End Observability and Hard-Failure Integration Coverage

## Summary
Add integration coverage for Spec 13 success and hard-failure paths, validating lifecycle logs, metrics emission, retry-once behavior, and deterministic reconciliation failure contract.

## Depends on
- `tickets/FAIHANANDOBSSPE-02-page-service-stage-lifecycle-and-retry-observability.md`
- `tickets/FAIHANANDOBSSPE-03-llm-observability-counter-alignment.md`
- `tickets/FAIHANANDOBSSPE-04-user-facing-reconciliation-hard-error-contract.md`

## File list it expects to touch
- `test/integration/engine/page-service.test.ts`
- `test/unit/engine/page-service.test.ts`
- `test/unit/server/routes/play.test.ts`

## Implementation checklist
1. Add integration test: successful generation emits planner/writer/reconciler lifecycle logs and structured metrics with `finalStatus: 'success'`.
2. Add integration test: forced reconciliation failures trigger exactly one retry and then fail with deterministic error code and diagnostics payload.
3. Add unit assertions for retry reason payload logging (failure reasons fed back into second attempt).
4. Add route-level assertion that hard-failure response includes expected compact issue codes and `retryAttempted` flag.
5. Keep fixtures/mocks deterministic and avoid introducing timing flakiness (use fixed mock durations or deterministic timer control where needed).

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

