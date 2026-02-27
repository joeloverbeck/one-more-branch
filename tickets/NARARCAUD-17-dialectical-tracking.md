# NARARCAUD-17: Dialectical Tracking

**Wave**: 3 (Genre, Theme Tracking, Concept Delivery)
**Effort**: M
**Dependencies**: NARARCAUD-01 (antithesis), NARARCAUD-02 (thematicCharge on AnalystResult)
**Spec reference**: B2 — Thematic Architecture gaps

## Summary

Store the analyst's thematic charge classification on each page as `thematicValence`, build a valence trajectory from ancestor pages, and warn the planner when 3+ consecutive scenes share the same valence (preventing monotonic thematic drift).

## Files to Touch

- `src/models/page.ts` — add `readonly thematicValence: 'THESIS_SUPPORTING' | 'ANTITHESIS_SUPPORTING' | 'AMBIGUOUS'` to `Page`
- `src/engine/page-builder.ts` — set `thematicValence` from `analystResult.thematicCharge`
- `src/persistence/page-serializer.ts` — serialize/deserialize `thematicValence`
- `src/engine/ancestor-collector.ts` — collect valence trajectory from ancestor pages (like `momentumTrajectory`)
- `src/llm/generation-pipeline-types.ts` — add valence trajectory type to `AncestorContext`
- `src/engine/continuation-context-builder.ts` — thread valence trajectory into `ContinuationContext`
- `src/llm/context-types.ts` — add valence trajectory field to `ContinuationContext`
- `src/llm/prompts/sections/planner/continuation-context.ts` — add "THEMATIC TRAJECTORY" section warning when 3+ consecutive same-valence scenes
- `prompts/page-planner-prompt.md` — update doc

## Out of Scope

- Writer prompt changes
- Analyst prompt changes (thematic charge already in NARARCAUD-02)

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Unit test: `buildPage` sets `thematicValence` from analyst result
- [ ] Unit test: `serializePage`/`deserializePage` round-trips `thematicValence`
- [ ] Unit test: ancestor collector builds valence trajectory
- [ ] Unit test: planner context warns on 3+ consecutive same-valence
- [ ] Invariant: All existing page serialization tests pass
