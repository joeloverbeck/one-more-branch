# NARARCAUD-20: Delayed Consequences — Analyst & Planner Wiring

**Wave**: 4 (New Subsystems)
**Effort**: M
**Dependencies**: NARARCAUD-18, NARARCAUD-19
**Spec reference**: F1 (part 3) — Subsystem gaps

## Summary

Complete the delayed consequences pipeline by wiring analyst evaluation (which consequences should trigger?) and planner context (pending consequences as narrative opportunities).

## Files to Touch

- `src/llm/analyst-types.ts` — add `delayedConsequencesTriggered: readonly string[]` to `AnalystResult`
- `src/llm/schemas/analyst-schema.ts` — add field (required array, can be empty)
- `src/llm/prompts/analyst-prompt.ts` — instruction for consequence trigger evaluation
- `src/llm/prompts/sections/planner/continuation-context.ts` — add "PENDING CONSEQUENCES" section
- `src/llm/context-types.ts` — add consequences to `ContinuationContext`
- `src/engine/continuation-context-builder.ts` — thread accumulated consequences
- `prompts/analyst-prompt.md` — update doc
- `prompts/page-planner-prompt.md` — update doc

## Out of Scope

- Writer schema changes (NARARCAUD-19)
- Consequence model (NARARCAUD-18)

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Unit test: analyst schema includes `delayedConsequencesTriggered`
- [ ] Unit test: planner context renders pending consequences section
- [ ] Unit test: `buildContinuationContext` threads accumulated consequences
- [ ] Invariant: All existing tests pass
