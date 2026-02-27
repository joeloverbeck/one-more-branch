# NARARCAUD-04: Setpiece Enforcement in Structure

**Wave**: 1 (Quick Wins)
**Effort**: S
**Dependencies**: None
**Spec reference**: D3 — Concept-to-Delivery Pipeline gaps

## Summary

Strengthen setpiece delivery by adding a `setpieceSourceIndex` to `StoryBeat` that traces each beat back to its originating setpiece. Post-validation warns when fewer than 4 setpieces are traced into the structure.

## Files to Touch

- `src/models/story-arc.ts` — add `readonly setpieceSourceIndex: number | null` to `StoryBeat`
- `src/llm/schemas/structure-schema.ts` — add `setpieceSourceIndex` (nullable integer 0-5)
- `src/llm/prompts/structure-prompt.ts` — strengthen from "at least 3" to "at least 4 MUST appear"; add `setpieceSourceIndex` instruction
- `src/llm/structure-generator.ts` — add post-validation warning in `parseStructureResponse` for <4 setpieces traced
- `src/engine/structure-types.ts` — add `setpieceSourceIndex` to the duplicate `StructureGenerationResult`
- `src/engine/structure-factory.ts` — thread `setpieceSourceIndex` in beat mapping
- `prompts/structure-prompt.md` — update doc

## Out of Scope

- Structure rewrite prompt (setpieces are first-gen only)
- Analyst evaluation

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Unit test: `parseStructureResponse` logs warning when <4 setpieces mapped
- [ ] Unit test: `createStoryStructure` maps `setpieceSourceIndex` from result to `StoryBeat`
- [ ] Invariant: Structure schema validates correctly with new field
- [ ] Invariant: All existing structure tests pass (new field added to mocks)
