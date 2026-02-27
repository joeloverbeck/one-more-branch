# NARARCAUD-11: Opening/Closing Image Contract

**Wave**: 3 (Genre, Theme Tracking, Concept Delivery)
**Effort**: M
**Dependencies**: None
**Spec reference**: D2 — Concept-to-Delivery Pipeline gaps

## Summary

Add `openingImage` and `closingImage` fields to `StoryStructure` to establish a thematic bookend contract. The opening prompt receives the opening image as a constraint, and the planner receives the closing image when generating the final resolution beat.

## Files to Touch

- `src/models/story-arc.ts` — add `readonly openingImage: string`, `readonly closingImage: string` to `StoryStructure`
- `src/llm/schemas/structure-schema.ts` — add both fields (required strings)
- `src/llm/prompts/structure-prompt.ts` — add image bookend instruction
- `src/llm/prompts/opening-prompt.ts` — pass `openingImage` as constraint
- `src/llm/prompts/sections/planner/continuation-context.ts` — pass `closingImage` when in final resolution beat
- `src/engine/structure-types.ts` — add fields to duplicate result
- `src/engine/structure-factory.ts` — thread fields
- `prompts/structure-prompt.md` — update doc
- `prompts/opening-prompt.md` — update doc
- `prompts/page-planner-prompt.md` — update doc

## Out of Scope

- Analyst evaluation of image delivery
- Structure rewrite prompt

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Unit test: structure schema requires `openingImage` and `closingImage`
- [ ] Unit test: `buildOpeningPrompt` includes opening image constraint
- [ ] Unit test: `buildPlannerContinuationContextSection` includes closing image in final beat
- [ ] Invariant: All existing tests pass
