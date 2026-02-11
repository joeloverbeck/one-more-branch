# DETSTARECSPE-04: Reconciler Narrative Evidence Gate

**Status**: Draft

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
- `src/engine/state-reconciler-errors.ts`
- `test/unit/engine/state-reconciler.test.ts`

## Implementation checklist
1. Derive lexical anchor tokens from each add/remove/resolve intent deterministically.
2. Check each required intent anchor against `writerOutput.narrative` and `writerOutput.sceneSummary`.
3. Fail reconciliation when any required intent has no evidence match.
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
- `npm run test:unit -- --runTestsByPath test/unit/llm/schemas/writer-response-transformer.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Evidence gate is fully deterministic for identical inputs.
- Evidence checks only read `narrative` and `sceneSummary` from writer output.
- Reconciliation returns structured diagnostics on evidence failure.
