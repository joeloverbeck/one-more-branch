# NARARCAUD-02: Scene-Level Thematic Charge in Analyst

**Wave**: 1 (Quick Wins)
**Effort**: S
**Dependencies**: NARARCAUD-01 (antithesis field on AnalystContext)
**Spec reference**: B4 — Thematic Architecture gaps

## Summary

Add thematic charge classification to the analyst stage so each scene is tagged as THESIS_SUPPORTING, ANTITHESIS_SUPPORTING, or AMBIGUOUS. This enables downstream dialectical tracking (NARARCAUD-17).

## Files to Touch

- `src/llm/analyst-types.ts` — add `thematicCharge: 'THESIS_SUPPORTING' | 'ANTITHESIS_SUPPORTING' | 'AMBIGUOUS'` and `thematicChargeDescription: string` to `AnalystResult`; add `thematicQuestion: string` to `AnalystContext`
- `src/llm/schemas/analyst-schema.ts` — add both output fields (required)
- `src/llm/prompts/analyst-prompt.ts` — add thematic charge classification instruction; render `thematicQuestion` and `antithesis` in user message
- `src/engine/analyst-evaluation.ts` — add `thematicQuestion` to `AnalystEvaluationContext`, thread to `AnalystContext`
- `src/engine/post-generation-processor.ts` — pass `story.storyKernel.thematicQuestion` to analyst context
- `prompts/analyst-prompt.md` — update doc

## Out of Scope

- Dialectical tracking across pages (NARARCAUD-17)
- Page-level storage of thematic charge

## Acceptance Criteria

- [ ] `npm run typecheck` passes with new fields
- [ ] Unit test: analyst schema includes `thematicCharge` and `thematicChargeDescription`
- [ ] Unit test: `buildAnalystPrompt` renders thematicQuestion section
- [ ] Unit test: analyst response transformer maps new fields
- [ ] Invariant: All existing analyst tests pass (new fields added to test mocks)
