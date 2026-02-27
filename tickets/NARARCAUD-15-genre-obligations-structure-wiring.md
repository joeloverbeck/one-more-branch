# NARARCAUD-15: Genre Obligations — Structure Wiring

**Wave**: 3 (Genre, Theme Tracking, Concept Delivery)
**Effort**: M
**Dependencies**: NARARCAUD-14
**Spec reference**: C1-C3 (part 2) — Genre Contract gaps

## Summary

Wire the genre obligations registry into the structure generation pipeline. Add `obligatorySceneTag` to `StoryBeat`, inject the genre obligation list into the structure prompt, and post-validate that all obligatory scenes are tagged.

## Files to Touch

- `src/models/story-arc.ts` — add `readonly obligatorySceneTag: string | null` to `StoryBeat`
- `src/llm/schemas/structure-schema.ts` — add `obligatorySceneTag` (nullable string)
- `src/llm/prompts/structure-prompt.ts` — inject genre obligation list, require beat tagging
- `src/llm/structure-generator.ts` — post-validation: warn when obligatory scenes untagged
- `src/engine/structure-types.ts` — add field
- `src/engine/structure-factory.ts` — thread field
- `prompts/structure-prompt.md` — update doc

## Out of Scope

- Analyst evaluation of obligatory scenes (NARARCAUD-16)
- Structure rewrite prompt

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Unit test: structure schema accepts `obligatorySceneTag`
- [ ] Unit test: `buildStructurePrompt` includes genre obligation list when `conceptSpec.genreFrame` is available
- [ ] Unit test: post-validation warns on missing tags
- [ ] Invariant: All existing tests pass
