# DETSTARECSPE-08: Retry-Once, Hard-Error, and Diagnostics Propagation

**Status**: Draft

## Summary
Implement the Spec 11 failure-handling contract: one reconciliation retry with strict injected failure reasons, then hard error on second failure with structured diagnostics.

## Depends on
- DETSTARECSPE-07
- `specs/13-failure-handling-and-observability-spec.md`

## Blocks
- None

## File list it expects to touch
- `src/engine/page-service.ts`
- `src/engine/state-reconciler-errors.ts`
- `src/llm/types.ts`
- `src/llm/planner-generation.ts`
- `src/llm/writer-generation.ts`
- `test/unit/engine/page-service.test.ts`
- `test/integration/engine/page-service.test.ts`
- `test/integration/llm/client.test.ts`

## Implementation checklist
1. On reconciliation failure, execute exactly one retry pass for planner + writer with strict failure reasons included in context.
2. Preserve request observability correlation across both attempts.
3. If second reconciliation fails, throw typed hard error with machine-readable diagnostics.
4. Remove legacy fallback path that bypasses reconciliation on failure.
5. Add unit/integration tests for: success on retry, fail twice -> hard error, diagnostics visibility.

## Out of scope
- Additional backoff/multi-retry strategies beyond one retry.
- Metrics dashboard/reporting expansions beyond surfaced diagnostics.
- Thread taxonomy contract changes.
- UI error rendering changes.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/llm/client.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Reconciliation executes on every generation attempt; no bypass path exists.
- At most one retry is performed per generation request.
- Final failure surfaces structured diagnostics suitable for deterministic triage.
