# DETSTARECSPE-04: Reconciler Narrative Evidence Gate

**Status**: ✅ COMPLETED

## Summary
Implement deterministic lexical-anchor evidence checks so planner intents are only applied when represented in writer narrative output.

## Depends on
- DETSTARECSPE-02
- `specs/11-deterministic-state-reconciler-spec.md`

## Blocks
- DETSTARECSPE-08

## File list it expects to touch
- `src/engine/state-reconciler.ts`
- `src/engine/state-reconciler-types.ts`
- `test/unit/engine/state-reconciler.test.ts`

## Assumptions Reassessment (2026-02-11)

### Confirmed
- `reconcileState(plan, writerOutput, previousState)` already exists and is the correct insertion point for deterministic evidence checks.
- `PageWriterResult` provides `narrative` and `sceneSummary`, which are the only writer fields the evidence gate should read.
- `test/unit/engine/state-reconciler.test.ts` is the primary unit suite validating reconciler behavior.

### Corrected from prior draft assumptions
- The reconciler currently does **not** perform narrative evidence checks; `writerOutput` is effectively unused in `src/engine/state-reconciler.ts`.
- `src/engine/state-reconciler-errors.ts` does not need changes for this ticket because this stage returns structured diagnostics on `StateReconciliationResult` rather than throwing.
- `test/unit/llm/schemas/writer-response-transformer.test.ts` is not in scope for this reconciler-only gate.

## Implementation checklist
1. Derive lexical anchor tokens from each add/remove/resolve intent deterministically.
2. Check each required intent anchor against `writerOutput.narrative` and `writerOutput.sceneSummary`.
3. On missing evidence, keep reconciliation deterministic and emit diagnostics that mark evidence failure (blocking downstream apply in subsequent ticket wiring).
4. Emit machine-readable diagnostics including failing field and normalized anchor.
5. Add unit tests for pass/fail and punctuation/case normalization behavior.

## Out of scope
- Semantic similarity, embeddings, or LLM-based evidence checks.
- Planner prompt changes.
- Retry execution in `page-service`.
- Thread dedup threshold logic.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/state-reconciler.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Evidence gate is fully deterministic for identical inputs.
- Evidence checks only read `narrative` and `sceneSummary` from writer output.
- Reconciliation returns structured diagnostics on evidence failure.

## Outcome
- Completion date: 2026-02-11
- What changed:
  - Implemented deterministic lexical-anchor evidence checks in `src/engine/state-reconciler.ts` for add/remove/resolve outputs.
  - Added machine-readable evidence diagnostics with `code`, `field`, and normalized `anchor`.
  - Added optional `anchor` to `StateReconciliationDiagnostic` in `src/engine/state-reconciler-types.ts` (non-breaking).
  - Added unit tests for evidence failure and punctuation/case normalization in `test/unit/engine/state-reconciler.test.ts`.
- Deviations from original plan:
  - Kept `src/engine/state-reconciler-errors.ts` unchanged because this stage returns diagnostics rather than throwing.
  - Removed `writer-response-transformer` test from required checks as it is outside reconciler scope.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/engine/state-reconciler.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/engine/index.test.ts`
  - `npm run typecheck`
