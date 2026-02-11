# DETSTARECSPE-01: Reconciler Contracts and Error Types

**Status**: ✅ COMPLETED

## Summary
Create the deterministic reconciler type and error contracts so downstream engine code can integrate against stable interfaces before algorithm wiring.

## Depends on
- `specs/08-writing-prompts-split-architecture.md`
- `specs/11-deterministic-state-reconciler-spec.md`

## Blocks
- DETSTARECSPE-02
- DETSTARECSPE-06
- DETSTARECSPE-07

## File list it expects to touch
- `src/engine/state-reconciler-types.ts`
- `src/engine/state-reconciler-errors.ts`
- `src/llm/types.ts`
- `src/engine/index.ts`
- `src/llm/index.ts`
- `test/unit/llm/types.test.ts`
- `test/unit/engine/index.test.ts`
- `test/unit/llm/index.test.ts`

## Implementation checklist
1. Add `StateReconciliationResult` with all fields from Spec 11.
2. Add typed diagnostics and typed reconciliation error shape for machine-readable failure handling.
3. Add `FinalPageGenerationResult` type that combines writer creative output and reconciled state deltas.
4. Export the new reconciler contracts from barrel files used by engine/LLM integration.
5. Add/adjust type tests to lock contract fields and requiredness.

## Assumption corrections (reassessed against current code)
- `src/engine/state-reconciler.ts` does not exist yet and remains out of scope for this ticket; this ticket is contracts-only.
- `WriterResult` still intentionally carries compatibility state/canon fields while migration is in progress; this ticket must not remove or alter them.
- LLM barrel coverage currently lives in `test/unit/llm/index.test.ts`; new LLM-exported contract types should be validated there in addition to `test/unit/llm/types.test.ts`.
- No runtime behavior changes are required; acceptance is type-shape and export-surface verification.

## Out of scope
- Implementing reconciliation algorithm behavior.
- Calling reconciler from `page-service`.
- Retry policy and hard-error orchestration.
- Dedup/similarity rules from Spec 12.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/types.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/engine/index.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/index.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- `PageWriterResult` remains creative-only.
- Existing `ContinuationGenerationResult` analyst/deviation fields remain present.
- Reconciler failures are representable as structured diagnostics (not string-only errors).

## Outcome
- Completion date: February 11, 2026
- Actually changed:
  - Added reconciler contracts in `src/engine/state-reconciler-types.ts` (`StateReconciliationResult`, typed diagnostics, typed delta shapes).
  - Added reconciler error contracts in `src/engine/state-reconciler-errors.ts` (`StateReconciliationError`, typed error code, serializable failure shape).
  - Added `FinalPageGenerationResult` in `src/llm/types.ts` as the combined creative writer output plus reconciled state deltas.
  - Exported new contracts through `src/engine/index.ts` and `src/llm/index.ts`.
  - Strengthened barrel/type tests in:
    - `test/unit/llm/types.test.ts`
    - `test/unit/engine/index.test.ts`
    - `test/unit/llm/index.test.ts`
- Deviations from original plan:
  - Added `test/unit/llm/index.test.ts` updates in scope to validate LLM barrel export usage for the new type contract; this file was not listed originally but is where barrel-type coverage already exists.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/types.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/engine/index.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/llm/index.test.ts`
  - `npm run typecheck`
