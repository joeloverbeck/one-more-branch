# DETSTARECSPE-06: Result-Merge and Page-Builder Reconciler Cutover

**Status**: ✅ COMPLETED

## Summary
Cut over page assembly to consume reconciled state deltas rather than legacy writer state fields, while preserving continuation analyst/deviation behavior.

## Assumptions reassessment (2026-02-11)
- `StateReconciliationResult` and `FinalPageGenerationResult` contracts already exist from DETSTARECSPE-01.
- `src/engine/page-builder.ts` is still typed against `WriterResult`, so reconciler-cutover intent is not reflected in the builder contract yet.
- `src/llm/result-merger.ts` currently merges only `WriterResult + AnalystResult`; it does not yet expose a reconciler-aware merge path from `PageWriterResult + StateReconciliationResult + AnalystResult`.
- `src/engine/page-service.ts` does not call `reconcileState()` yet. Full orchestration wiring remains in DETSTARECSPE-07 and is out of scope here.
- Existing tests pass, but they primarily validate legacy writer-state pass-through and do not lock reconciler-first merge/builder contract behavior.

## Depends on
- DETSTARECSPE-01
- DETSTARECSPE-03

## Blocks
- DETSTARECSPE-07

## File list it expects to touch
- `src/engine/page-builder.ts`
- `src/llm/result-merger.ts`
- `test/unit/engine/page-builder.test.ts`
- `test/unit/llm/result-merger.test.ts`
- `test/unit/llm/types.test.ts`

## Implementation checklist
1. Update page-builder contract to accept reconciled-delta shaped input (compatible with `FinalPageGenerationResult`) for state/inventory/health/character changes.
2. Add reconciler-aware merge path that builds continuation results from `PageWriterResult + StateReconciliationResult + AnalystResult`.
3. Keep creative fields (`narrative`, `choices`, `sceneSummary`, `protagonistAffect`, `isEnding`) sourced from writer output only.
4. Preserve backward compatibility for current orchestration call sites until DETSTARECSPE-07 wires reconciler execution.
5. Update unit/type tests to lock reconciler-aware merge and page-builder contract behavior.

## Out of scope
- Reconciler algorithm internals.
- Retry-once behavior in `page-service`.
- Prompt/schema changes.
- Deviation rewrite workflow changes.
- `page-service` planner/writer/reconciler orchestration wiring (covered by DETSTARECSPE-07).

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/page-builder.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/result-merger.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/types.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Writer remains creative-only as the source of narrative and choices.
- Continuation deviation fields remain analyst-derived.
- Page active-state, inventory, health, and character-state deltas are represented through the reconciled-delta contract in merge/builder boundaries.
- No breaking API change for existing `mergeWriterAndAnalystResults` and builder call sites prior to DETSTARECSPE-07 cutover.

## Outcome
- Completion date: 2026-02-11
- What was actually changed:
  - Updated `page-builder` contract boundaries to consume reconciled-delta shaped input (`PageWriterResult` + reconciliation delta fields) instead of directly depending on `WriterResult`.
  - Added reconciler-aware result merge API: `mergePageWriterAndReconciledStateWithAnalystResults(writer, reconciliation, analyst)`.
  - Kept legacy `mergeWriterAndAnalystResults(writer, analyst)` as a compatibility wrapper so existing orchestration remains non-breaking prior to DETSTARECSPE-07.
  - Strengthened unit coverage for reconciler-aware merge behavior and confirmed barrel export availability.
- Deviations from original plan:
  - Did not wire reconciler into `page-service`; that remains correctly deferred to DETSTARECSPE-07.
  - `src/llm/types.ts` did not require runtime contract changes for this ticket; scope remained at merge/builder boundary and tests.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/engine/page-builder.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/llm/result-merger.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/llm/types.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/llm/index.test.ts`
  - `npm run typecheck`
