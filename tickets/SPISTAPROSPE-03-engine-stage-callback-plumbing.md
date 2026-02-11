# SPISTAPROSPE-03: Thread stage callbacks through engine prompt boundaries

## Status
**Status**: Proposed

## Summary
Add optional progress callback plumbing through engine generation paths and emit stage start/complete events immediately around prompt call boundaries, including retry attempt metadata.

## Depends on
- `tickets/SPISTAPROSPE-01-progress-domain-and-stage-contract.md`

## Blocks
- `tickets/SPISTAPROSPE-04-route-progress-lifecycle-wiring.md`

## File list it expects to touch
- `src/engine/page-service.ts`
- `src/engine/story-engine.ts`
- `src/engine/story-service.ts`
- `src/engine/types.ts`
- `src/llm/planner-generation.ts` (if callback wiring requires type threading)
- `src/llm/writer-generation.ts` (if callback wiring requires type threading)
- `src/llm/analyst-generation.ts` (if callback wiring requires type threading)
- `test/unit/engine/page-service.test.ts`
- `test/unit/engine/index.test.ts` (if signatures change)

## Implementation checklist
1. Add optional callback signature in generation orchestration contracts (no required-callsite breakage).
2. Emit stage start immediately before each prompt call.
3. Emit stage complete immediately after successful parse/transform of each prompt response.
4. Emit repeated start/complete events for retries with incremented `attempt` values.
5. Map new-story structure generation period to existing MVP stage `RESTRUCTURING_STORY`.
6. Do not emit non-prompt internal stages (for example, reconciler-only processing).

## Out of scope
- HTTP route parsing for `progressId`.
- Polling endpoint and frontend spinner rendering.
- Prompt content/schema changes.
- Any persistence/model migration.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/engine/story-engine.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Generation output behavior is unchanged when no callback is provided.
- Retry semantics remain identical to current behavior; only observability signals are added.
- Reconciler/non-prompt internal steps are not exposed as prompt stages.
- Branching invariants remain intact (ending pages zero choices, non-ending pages at least two choices).
