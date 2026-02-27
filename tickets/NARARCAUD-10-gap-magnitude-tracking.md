# NARARCAUD-10: Gap Magnitude Tracking

**Wave**: 2 (Beat Architecture Enrichment)
**Effort**: M
**Dependencies**: None (Wave 1 independent)
**Spec reference**: A5 — Beat Architecture gaps

## Summary

Add `expectedGapMagnitude` to `StoryBeat` to track how wide the gap between expectation and result should be at each beat. Gap magnitude should generally increase through the story. The analyst evaluates whether the delivered gap matches the expected magnitude.

## Files to Touch

- `src/models/story-arc.ts` — add `readonly expectedGapMagnitude: 'NARROW' | 'MODERATE' | 'WIDE' | 'CHASM' | null` to `StoryBeat`
- `src/llm/schemas/structure-schema.ts` — add `expectedGapMagnitude` (nullable enum)
- `src/llm/prompts/structure-prompt.ts` — add gap magnitude instruction (should increase through story)
- `src/llm/prompts/analyst-prompt.ts` — evaluate delivered gap vs expected
- `src/engine/structure-types.ts` — add field
- `src/engine/structure-factory.ts` — thread field
- `prompts/structure-prompt.md` — update doc
- `prompts/analyst-prompt.md` — update doc

## Out of Scope

- Structure rewrite prompt
- Planner context

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Unit test: structure schema accepts gap magnitude values
- [ ] Unit test: `createStoryStructure` maps `expectedGapMagnitude`
- [ ] Invariant: All existing tests pass
