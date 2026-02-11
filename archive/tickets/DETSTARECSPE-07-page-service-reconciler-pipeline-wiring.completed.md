# DETSTARECSPE-07: Page-Service Reconciler Pipeline Wiring

**Status**: ✅ COMPLETED

## Summary
Wire `page-service` generation flow to call reconciler after writer and before page build (and before analyst merge in continuation), removing legacy writer-state mutation path.

## Assumptions reassessment (2026-02-11)
- `DETSTARECSPE-06` already completed the merge/page-builder contract cutover (`PageWriterResult + StateReconciliationResult` boundary) and compatibility merge shim work.
- `src/engine/page-builder.ts`, `src/engine/index.ts`, and `src/llm/types.ts` are already reconciler-aware and do not require further API changes for this ticket.
- `src/engine/page-service.ts` still consumes writer legacy state/canon fields directly in both opening and continuation orchestration paths; this is the remaining gap.
- Reconciler `currentLocation` currently derives from previous authoritative state. Until planner location intents are introduced, this ticket keeps a transitional `currentLocation` pass-through from writer output after reconciliation to avoid a behavior regression.

## Depends on
- DETSTARECSPE-04
- DETSTARECSPE-05
- DETSTARECSPE-06

## Blocks
- DETSTARECSPE-08

## File list it expects to touch
- `src/engine/page-service.ts`
- `test/unit/engine/page-service.test.ts`
- `test/integration/engine/page-service.test.ts`
- `test/integration/engine/replay.test.ts`

## Implementation checklist
1. In opening flow: planner -> writer -> reconciler -> page builder.
2. In continuation flow: planner -> writer -> reconciler -> analyst -> merge -> page builder.
3. Build reconciler previous-state snapshot from authoritative parent accumulated state.
4. Remove direct writer-state/canon mutation usage from orchestration path for reconciled delta fields.
5. Keep transitional writer `currentLocation` pass-through post-reconciliation until planner location intents exist.
6. Update unit/integration tests to verify ordering and data handoff boundaries.

## Out of scope
- Retry-once and hard-error recovery behavior.
- New prompt composition or schema validation changes.
- Storage schema redesign.
- Structure rewrite policy changes.
- Reconciler algorithm changes beyond orchestration wiring (including introducing planner location intents).

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/engine/replay.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Planner executes before writer in both opening and continuation.
- Persisted state/canon deltas consumed by page builder and story canon updates come from reconciler outputs in `page-service`.
- Transitional exception: `currentLocation` remains writer passthrough after reconciliation in this ticket.
- Replay and branch-isolation behavior remain unchanged.

## Outcome
- Completion date: 2026-02-11
- What was actually changed:
  - Wired reconciler execution into both `generateFirstPage` and `generateNextPage` in `src/engine/page-service.ts`.
  - Added authoritative previous-state snapshot builders for opening and continuation reconciler inputs.
  - Updated page-service orchestration to merge writer creative output with reconciler deltas via `mergePageWriterAndReconciledStateWithAnalystResults(...)`.
  - Removed direct writer state/canon consumption in page-service orchestration for reconciled fields.
  - Added explicit transitional `currentLocation` passthrough post-reconciliation to preserve existing location behavior.
  - Strengthened unit/integration/replay tests to mock and verify reconciler call boundaries and ordering.
- Deviations from original plan:
  - Did not modify `src/engine/page-builder.ts`, `src/engine/index.ts`, or `src/llm/types.ts` because those were already completed in DETSTARECSPE-06.
  - Kept `currentLocation` as a transitional passthrough (documented) instead of pure reconciler authority due missing planner location intents.
- Verification results:
  - `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts`
  - `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts`
  - `npm run test:integration -- --runTestsByPath test/integration/engine/replay.test.ts`
  - `npm run typecheck`
