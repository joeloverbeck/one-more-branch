# NARARCAUD-19: Delayed Consequences — Writer & Page Integration

**Wave**: 4 (New Subsystems)
**Effort**: M
**Dependencies**: NARARCAUD-18
**Spec reference**: F1 (part 2) — Subsystem gaps

## Summary

Wire delayed consequences into the writer output and page model. The writer can create new delayed consequences, and the page builder processes the consequence lifecycle (aging, accumulation) during page assembly.

## Files to Touch

- `src/llm/schemas/writer-schema.ts` — add `delayedConsequencesCreated` output (required array, can be empty)
- `src/llm/writer-types.ts` — add field to `PageWriterResult`
- `src/models/page.ts` — add `readonly accumulatedDelayedConsequences: readonly DelayedConsequence[]`
- `src/engine/page-builder.ts` — process consequence lifecycle in `buildPage`
- `src/persistence/page-serializer.ts` — serialize/deserialize delayed consequences
- `prompts/opening-prompt.md` — update doc (writer can create consequences)
- `prompts/continuation-prompt.md` — update doc

## Out of Scope

- Analyst evaluation of consequences (NARARCAUD-20)
- Planner context injection

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Unit test: writer schema includes `delayedConsequencesCreated`
- [ ] Unit test: `buildPage` accumulates and ages consequences
- [ ] Unit test: serializer round-trips `accumulatedDelayedConsequences`
- [ ] Invariant: All existing page builder tests pass (mocks updated)
