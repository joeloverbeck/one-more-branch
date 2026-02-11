# DETSTARECSPE-01: Reconciler Contracts and Error Types

**Status**: Draft

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

## Implementation checklist
1. Add `StateReconciliationResult` with all fields from Spec 11.
2. Add typed diagnostics and typed reconciliation error shape for machine-readable failure handling.
3. Add `FinalPageGenerationResult` type that combines writer creative output and reconciled state deltas.
4. Export the new reconciler contracts from barrel files used by engine/LLM integration.
5. Add/adjust type tests to lock contract fields and requiredness.

## Out of scope
- Implementing reconciliation algorithm behavior.
- Calling reconciler from `page-service`.
- Retry policy and hard-error orchestration.
- Dedup/similarity rules from Spec 12.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/types.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/engine/index.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- `PageWriterResult` remains creative-only.
- Existing `ContinuationGenerationResult` analyst/deviation fields remain present.
- Reconciler failures are representable as structured diagnostics (not string-only errors).
