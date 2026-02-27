# NARARCAUD-24: Information Asymmetry — Planner & Page Wiring

**Wave**: 4 (New Subsystems)
**Effort**: M
**Dependencies**: NARARCAUD-23
**Spec reference**: F3 (part 2) — Subsystem gaps

## Summary

Wire knowledge asymmetry into page storage and planner context. Pages accumulate knowledge state, the serializer persists it, and the planner receives a "DRAMATIC IRONY OPPORTUNITIES" section when asymmetries exist.

## Files to Touch

- `src/models/page.ts` — add `readonly accumulatedKnowledgeState: readonly KnowledgeAsymmetry[]`
- `src/engine/page-builder.ts` — accumulate knowledge state from analyst result
- `src/persistence/page-serializer.ts` — serialize/deserialize
- `src/llm/prompts/sections/planner/continuation-context.ts` — add "DRAMATIC IRONY OPPORTUNITIES" section
- `src/llm/context-types.ts` — add field to `ContinuationContext`
- `src/engine/continuation-context-builder.ts` — thread accumulated knowledge state
- `prompts/page-planner-prompt.md` — update doc

## Out of Scope

- Analyst detection (NARARCAUD-23)
- Writer prompt

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Unit test: serializer round-trips `accumulatedKnowledgeState`
- [ ] Unit test: planner context renders dramatic irony section when asymmetries exist
- [ ] Invariant: All existing tests pass
