# NARARCAUD-13: Premise Promises — Runtime Tracking

**Wave**: 3 (Genre, Theme Tracking, Concept Delivery)
**Effort**: M
**Dependencies**: NARARCAUD-12
**Spec reference**: D1 (part 2) — Concept-to-Delivery Pipeline gaps

## Summary

Wire premise promises into the runtime pipeline: the analyst evaluates fulfillment per scene, the story accumulates fulfilled promises, and the planner warns about unfulfilled promises in late acts.

## Files to Touch

- `src/llm/analyst-types.ts` — add `premisePromiseFulfilled: string | null` to `AnalystResult`
- `src/llm/schemas/analyst-schema.ts` — add field (required, nullable string)
- `src/llm/prompts/analyst-prompt.ts` — add premise promise fulfillment evaluation
- `src/llm/prompts/structure-prompt.ts` — thread premise promises from `conceptVerification` as constraints
- `src/models/story.ts` — add `readonly fulfilledPremisePromises: readonly string[]` to `Story`
- `src/engine/post-generation-processor.ts` — accumulate fulfilled promises; warn planner in late acts
- `src/llm/prompts/sections/planner/continuation-context.ts` — add unfulfilled premise warnings in late acts
- `src/persistence/story-serializer.ts` or equivalent — serialize new Story field
- `prompts/analyst-prompt.md` — update doc
- `prompts/structure-prompt.md` — update doc
- `prompts/page-planner-prompt.md` — update doc

## Out of Scope

- Concept generation changes (done in NARARCAUD-12)

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Unit test: analyst schema includes `premisePromiseFulfilled`
- [ ] Unit test: `buildStructurePrompt` includes premise promises when available
- [ ] Unit test: planner context warns about unfulfilled promises in final act
- [ ] Invariant: All existing tests pass
