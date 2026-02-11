# DETSTARECSPE-06: Result-Merge and Page-Builder Reconciler Cutover

**Status**: Draft

## Summary
Cut over page assembly to consume reconciled state deltas rather than legacy writer state fields, while preserving continuation analyst/deviation behavior.

## Depends on
- DETSTARECSPE-01
- DETSTARECSPE-03

## Blocks
- DETSTARECSPE-07

## File list it expects to touch
- `src/engine/page-builder.ts`
- `src/llm/result-merger.ts`
- `src/llm/types.ts`
- `test/unit/engine/page-builder.test.ts`
- `test/unit/llm/result-merger.test.ts`
- `test/unit/llm/types.test.ts`

## Implementation checklist
1. Update page-builder mapping to consume reconciliation deltas for state/inventory/health/character changes.
2. Update merge contract to build continuation results from `PageWriterResult + StateReconciliationResult + AnalystResult`.
3. Keep creative fields (`narrative`, `choices`, `sceneSummary`, `protagonistAffect`, `isEnding`) sourced from writer output only.
4. Remove dependency on legacy writer mutation arrays in page-builder path.
5. Update type and unit tests for the new merge and builder contract.

## Out of scope
- Reconciler algorithm internals.
- Retry-once behavior in `page-service`.
- Prompt/schema changes.
- Deviation rewrite workflow changes.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/page-builder.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/result-merger.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/types.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Writer remains creative-only as the source of narrative and choices.
- Continuation deviation fields remain analyst-derived.
- Page active-state, inventory, health, and character-state deltas now come from reconciler output only.
