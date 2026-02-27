# NARARCAUD-09: Multi-Axis Escalation

**Wave**: 2 (Beat Architecture Enrichment)
**Effort**: M
**Dependencies**: None (Wave 1 independent)
**Spec reference**: A4 — Beat Architecture gaps

## Summary

Add `secondaryEscalationType` to `StoryBeat` to support multi-axis escalation. Some beats escalate along two dimensions simultaneously (e.g., stakes escalation + emotional escalation). The planner should surface both escalation types.

## Files to Touch

- `src/models/story-arc.ts` — add `readonly secondaryEscalationType: EscalationType | null` to `StoryBeat`
- `src/llm/schemas/structure-schema.ts` — add `secondaryEscalationType` (nullable, same enum as `escalationType`)
- `src/llm/prompts/structure-prompt.ts` — add optional secondary escalation instruction
- `src/llm/prompts/structure-rewrite-prompt.ts` — same
- `src/llm/prompts/sections/planner/continuation-context.ts` — surface both escalation types in `buildEscalationDirective`
- `src/engine/structure-types.ts` — add field
- `src/engine/structure-factory.ts` — thread field
- `prompts/structure-prompt.md` — update doc
- `prompts/page-planner-prompt.md` — update doc

## Out of Scope

- Analyst evaluation of secondary escalation
- Writer prompt

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Unit test: `buildEscalationDirective` includes secondary escalation when present
- [ ] Unit test: `createStoryStructure` maps `secondaryEscalationType`
- [ ] Invariant: All existing tests pass
