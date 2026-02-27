# NARARCAUD-21: Depth vs Breadth Monitor

**Wave**: 4 (New Subsystems)
**Effort**: M
**Dependencies**: None
**Spec reference**: F2 — Subsystem gaps

## Summary

Add `narrativeFocus` classification to the analyst (`DEEPENING` | `BROADENING` | `BALANCED`) and build a focus trajectory from ancestors. The planner warns when 3+ consecutive scenes are BROADENING, which indicates the narrative is spreading too thin.

## Files to Touch

- `src/llm/analyst-types.ts` — add `narrativeFocus: 'DEEPENING' | 'BROADENING' | 'BALANCED'` to `AnalystResult`
- `src/llm/schemas/analyst-schema.ts` — add field (required enum)
- `src/llm/prompts/analyst-prompt.ts` — add depth/breadth classification instruction
- `src/engine/ancestor-collector.ts` — build focus trajectory from ancestors
- `src/llm/generation-pipeline-types.ts` — add focus trajectory type
- `src/engine/continuation-context-builder.ts` — thread focus trajectory
- `src/llm/context-types.ts` — add field to `ContinuationContext`
- `src/llm/prompts/sections/planner/continuation-context.ts` — warn on 3+ consecutive BROADENING
- `prompts/analyst-prompt.md` — update doc
- `prompts/page-planner-prompt.md` — update doc

## Out of Scope

- Writer prompt changes
- Page model storage of focus

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Unit test: analyst schema includes `narrativeFocus` enum
- [ ] Unit test: planner context warns on consecutive broadening
- [ ] Invariant: All existing tests pass
