# PAGWRISPE-06: Wire Engine to Plan-Guided Writer + Reconciler Boundary
**Status**: Draft

## Summary
Update engine orchestration so writer is treated as creative-only input and page state deltas are sourced through the reconciler boundary (not directly from writer output).

## File list it expects to touch
- `src/engine/page-service.ts`
- `src/engine/page-builder.ts`
- `src/engine/types.ts`
- `src/llm/index.ts`
- `test/unit/engine/page-service.test.ts`
- `test/integration/engine/page-service.test.ts`
- `test/integration/engine/replay.test.ts`

## Implementation checklist
1. Update page-service writer invocation to use plan-aware writer API from Ticket 05.
2. Remove assumptions that writer returns state deltas directly.
3. Integrate page assembly path to consume creative writer output + reconciled state output (from Spec 11 reconciler stage).
4. Keep planner-before-writer call ordering assertions and request observability IDs intact.
5. Update integration tests to assert state is applied via reconciler path only.

## Out of scope
- Do not implement reconciler internals in this ticket (handled by Spec 11 tickets).
- Do not alter analyst/deviation rewrite logic unrelated to writer contract.
- Do not change persistence schema.
- Do not change server route behavior.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/engine/replay.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Planner executes before writer for both opening and continuation flows.
- Page immutability and deterministic replay remain intact.
- Branch isolation remains intact for accumulated state and structure versioning.
- Writer output alone cannot mutate state.
