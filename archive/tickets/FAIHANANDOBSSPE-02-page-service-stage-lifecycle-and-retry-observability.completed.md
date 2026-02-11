# FAIHANANDOBSSPE-02: Instrument Page-Service Stage Lifecycle, Timing, and Retry-Once Semantics

**Status**: ✅ COMPLETED

## Summary
Implement stage-level lifecycle logging and metrics aggregation in `page-service` for planner/writer/reconciler, including explicit one-time reconciler retry observability and hard-error metrics finalization on second reconciliation failure.

## Depends on
- `tickets/FAIHANANDOBSSPE-01-generation-pipeline-metrics-contract.md`

## Blocks
- `tickets/FAIHANANDOBSSPE-04-user-facing-reconciliation-hard-error-contract.md`
- `tickets/FAIHANANDOBSSPE-05-integration-observability-and-hard-failure-coverage.md`

## Reassessed assumptions (2026-02-11)
- `GenerationPipelineMetrics` already exists in `src/llm/types.ts` and is already threaded through page-service call sites.
- Reconciler retry-once control flow already exists in `generateWithReconciliationRetry()` (max two attempts).
- Existing tests already cover retry-once behavior and strict failure-reason threading.
- Gaps still open in current code:
  - stage lifecycle logs (`started` / `completed` / `failed`) are not emitted consistently for planner/writer/reconciler;
  - stage durations are not measured/populated (currently always `0`);
  - planner/writer validation issue counts are not extracted into metrics;
  - no explicit metrics emission for hard-error exit (`finalStatus: 'hard_error'`).

## File list expected to touch
- `src/engine/page-service.ts`
- `test/unit/engine/page-service.test.ts`

## Implementation checklist
1. In `generateWithReconciliationRetry()` add stage lifecycle logs:
   - planner started/completed/failed
   - writer started/completed/failed
   - reconciler started/completed/failed
2. Include `storyId`, `pageId`, `requestId` in every lifecycle log context.
3. Capture stage durations (`Date.now()` baseline) and populate `GenerationPipelineMetrics` per pipeline execution.
4. Count validation/reconciliation issues for metrics:
   - planner validation issues (from `LLMError.context.validationIssues` when present)
   - writer validation issues (from `LLMError.context.validationIssues` when present)
   - reconciler issues (sum of failed-attempt `reconciliationDiagnostics.length`)
5. Log retry reason payload when first reconciliation attempt fails and failure reasons are fed into retry planner/writer prompt contexts.
6. Preserve retry-once only for reconciler failures; second failure must hard fail with deterministic `StateReconciliationError` path.
7. Ensure both success and hard-failure code paths produce final-status metrics (`success` / `hard_error`) and emit final pipeline status log.

## Out of scope
- Server HTTP route serialization changes.
- LLM client/writer counter schema alignment.
- Prompt content edits outside existing reconciliation failure reason threading.
- Any changes to storage/page builder/deviation handler behavior.
- New public API surface changes.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/engine/index.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Reconciler retry path runs exactly once (max two total attempts).
- Planner and writer keep existing retry-wrapper behavior; no additional hidden retry loops are introduced in `page-service`.
- Structured state remains authoritative over conflicting planner guidance (Spec 08 locked decision).
- No regression to branch isolation, page immutability, or continuation/orchestration ordering.

## Outcome
- **Completion date**: 2026-02-11
- **What actually changed**:
  - Added planner/writer/reconciler stage lifecycle logs (`started`/`completed`/`failed`) with `storyId`, `pageId`, and `requestId` context.
  - Added per-stage duration aggregation and wired metrics to real timing values.
  - Added planner/writer validation-issue counting from thrown error context.
  - Added explicit final pipeline logs for `success` and `hard_error`, including metrics payload.
  - Added retry-reason logging when reconciliation fails on attempt 1.
  - Extended unit tests to validate lifecycle logging, retry-reason logging, dynamic timing metrics, and hard-error final metrics logging.
- **Deviations from original plan**:
  - Did not modify `src/engine/state-reconciler-errors.ts`; existing error contract already satisfied this ticket’s needs.
- **Verification results**:
  - `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts` ✅
  - `npm run test:unit -- --runTestsByPath test/unit/engine/index.test.ts` ✅
  - `npm run typecheck` ✅
