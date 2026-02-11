# DETSTARECSPE-07: Page-Service Reconciler Pipeline Wiring

**Status**: Draft

## Summary
Wire `page-service` generation flow to call reconciler after writer and before page build (and before analyst merge in continuation), removing legacy writer-state mutation path.

## Depends on
- DETSTARECSPE-04
- DETSTARECSPE-05
- DETSTARECSPE-06

## Blocks
- DETSTARECSPE-08

## File list it expects to touch
- `src/engine/page-service.ts`
- `src/engine/page-builder.ts`
- `src/engine/index.ts`
- `src/llm/types.ts`
- `test/unit/engine/page-service.test.ts`
- `test/integration/engine/page-service.test.ts`
- `test/integration/engine/replay.test.ts`

## Implementation checklist
1. In opening flow: planner -> writer -> reconciler -> page builder.
2. In continuation flow: planner -> writer -> reconciler -> analyst -> merge -> page builder.
3. Build reconciler previous-state snapshot from authoritative parent accumulated state.
4. Remove direct writer-state mutation usage from orchestration path.
5. Update unit/integration tests to verify ordering and data handoff boundaries.

## Out of scope
- Retry-once and hard-error recovery behavior.
- New prompt composition or schema validation changes.
- Storage schema redesign.
- Structure rewrite policy changes.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/engine/replay.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Planner executes before writer in both opening and continuation.
- Writer cannot directly mutate persisted state fields.
- Replay and branch-isolation behavior remain unchanged.
