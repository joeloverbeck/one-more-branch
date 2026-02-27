# NARARCAUD-07: Crisis Type Per Beat

**Wave**: 2 (Beat Architecture Enrichment)
**Effort**: M
**Dependencies**: None (Wave 1 independent)
**Spec reference**: A1 — Beat Architecture gaps

## Summary

Add a `CrisisType` enum (`BEST_BAD_CHOICE` | `IRRECONCILABLE_GOODS`) to `StoryBeat`. Escalation and turning-point beats must specify their crisis type so the planner and analyst can evaluate choice quality against the intended dilemma structure.

## Files to Touch

- `src/models/story-arc.ts` — add `CrisisType = 'BEST_BAD_CHOICE' | 'IRRECONCILABLE_GOODS'`, add `readonly crisisType: CrisisType | null` to `StoryBeat`
- `src/llm/schemas/structure-schema.ts` — add `crisisType` enum (nullable)
- `src/llm/prompts/structure-prompt.ts` — add crisis type requirement for escalation/turning_point beats
- `src/llm/prompts/structure-rewrite-prompt.ts` — same
- `src/llm/prompts/sections/planner/continuation-context.ts` — surface crisis type to planner
- `src/llm/prompts/analyst-prompt.ts` — evaluate choice/crisis type alignment
- `src/engine/structure-types.ts` — add `crisisType` to duplicate result
- `src/engine/structure-factory.ts` — thread `crisisType`
- `prompts/structure-prompt.md` — update doc
- `prompts/structure-rewrite-prompt.md` — update doc
- `prompts/analyst-prompt.md` — update doc
- `prompts/page-planner-prompt.md` — update doc

## Out of Scope

- Writer prompt changes
- Choice generation logic

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Unit test: `CrisisType` type exports correctly
- [ ] Unit test: `createStoryStructure` maps `crisisType`
- [ ] Unit test: `buildEscalationDirective` includes crisis type when present
- [ ] Unit test: `buildAnalystPrompt` includes crisis type evaluation instruction
- [ ] Invariant: All existing tests pass
