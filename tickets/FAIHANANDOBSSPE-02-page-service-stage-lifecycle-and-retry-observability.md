# FAIHANANDOBSSPE-02: Instrument Page-Service Stage Lifecycle, Timing, and Retry-Once Semantics

## Summary
Implement stage-level lifecycle logging and metrics aggregation in `page-service` for planner/writer/reconciler, including explicit one-time reconciler retry behavior and hard-error finalization on second failure.

## Depends on
- `tickets/FAIHANANDOBSSPE-01-generation-pipeline-metrics-contract.md`

## Blocks
- `tickets/FAIHANANDOBSSPE-04-user-facing-reconciliation-hard-error-contract.md`
- `tickets/FAIHANANDOBSSPE-05-integration-observability-and-hard-failure-coverage.md`

## File list it expects to touch
- `src/engine/page-service.ts`
- `src/engine/state-reconciler-errors.ts`
- `test/unit/engine/page-service.test.ts`

## Implementation checklist
1. In `generateWithReconciliationRetry()` add stage lifecycle logs:
   - planner started/completed/failed
   - writer started/completed/failed
   - reconciler started/completed/failed
2. Include `storyId`, `pageId`, `requestId` in every lifecycle log context.
3. Capture stage durations (`Date.now()` or equivalent monotonic timing) and populate `GenerationPipelineMetrics`.
4. Count validation/reconciliation issues for metrics:
   - planner validation issues (if available from thrown context)
   - writer validation issues (if available from thrown context)
   - reconciler issues (`reconciliationDiagnostics.length`)
5. Log retry reason payload when first reconciliation attempt fails and failure reasons are fed into retry planner/writer prompt contexts.
6. Enforce retry-once only for reconciler failures; second failure must always hard fail with deterministic code path.
7. Ensure final success and hard-failure code paths both emit final-status metrics (`success` / `hard_error`).

## Out of scope
- Server HTTP route serialization changes.
- LLM client/writer counter schema alignment (handled separately).
- Prompt content edits outside reconciliation failure reason threading already required by existing flow.
- Any changes to storage/page builder/deviation handler behavior.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/engine/index.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Reconciler retry path runs exactly once (max two total attempts).
- Planner and writer still use existing retry wrapper behavior; no additional hidden retry loops are introduced in `page-service`.
- Structured state remains authoritative over conflicting planner guidance (Spec 08 locked decision).
- No regression to branch isolation, page immutability, or continuation/orchestration ordering.

