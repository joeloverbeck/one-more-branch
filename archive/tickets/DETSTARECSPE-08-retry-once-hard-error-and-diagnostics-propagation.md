# DETSTARECSPE-08: Retry-Once, Hard-Error, and Diagnostics Propagation

**Status**: ✅ COMPLETED

## Summary
Implement Spec 11 failure-handling in `page-service`: if reconciliation emits diagnostics, retry planner+writer exactly once with strict reconciliation failure reasons injected into prompt context; if reconciliation still emits diagnostics on the retry, throw a typed hard error carrying machine-readable diagnostics.

## Depends on
- DETSTARECSPE-07
- `specs/11-deterministic-state-reconciler-spec.md`

## Blocks
- None

## Assumption Reassessment
- `reconcileState()` currently returns diagnostics and does not throw hard failures; ticket scope must treat non-empty `reconciliationDiagnostics` as reconciliation failure for retry/hard-error flow.
- There is no legacy reconciliation bypass path in `page-service` to remove.
- `test/integration/llm/client.test.ts` validates LLM client transport/validation behavior, not engine reconciliation retry semantics; it is out of scope for this ticket.
- "Output to browser console" is interpreted as process console/server logging in this backend service.

## File list it expects to touch
- `src/engine/page-service.ts`
- `src/llm/types.ts`
- `src/llm/prompts/page-planner-prompt.ts`
- `src/llm/prompts/opening-prompt.ts`
- `src/llm/prompts/continuation-prompt.ts`
- `test/unit/engine/page-service.test.ts`
- `test/integration/engine/page-service.test.ts`

## Implementation checklist
1. Treat non-empty reconciliation diagnostics as a failed reconciliation attempt.
2. On first reconciliation failure, run exactly one retry pass (planner + writer + reconciliation) with strict failure reasons injected into planner and writer contexts.
3. Preserve a single `requestId` across both attempts for observability correlation.
4. If second reconciliation still has diagnostics, throw `StateReconciliationError` with deterministic diagnostics payload.
5. Emit reconciliation failure reasons to console/logging on each failed attempt.
6. Add/strengthen tests for: success on retry, fail twice -> hard error, retry context diagnostics propagation, and one-retry cap.

## Out of scope
- Additional backoff/multi-retry strategies beyond one retry.
- LLM transport retry policy changes.
- Thread taxonomy contract changes.
- UI error rendering changes.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Reconciliation executes on every generation attempt.
- At most one reconciliation retry is performed per generation request.
- Final reconciliation failure surfaces structured diagnostics suitable for deterministic triage.

## Outcome
- Completion date: 2026-02-11
- Implemented:
  - Added single retry reconciliation flow in `page-service` for both opening and continuation generation.
  - Injected strict structured reconciliation failure reasons into planner/writer retry prompt contexts.
  - Preserved request correlation (`requestId`) across both attempts.
  - Added hard failure on second reconciliation failure via `StateReconciliationError` with machine-readable diagnostics.
  - Added unit/integration coverage for retry success and fail-twice hard error paths.
- Deviations from original plan:
  - Did not modify `src/engine/state-reconciler-errors.ts` or LLM transport tests; existing error type was reused and `test/integration/llm/client.test.ts` was out of scope for engine reconciliation behavior.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts`
  - `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts`
  - `npm run typecheck`
