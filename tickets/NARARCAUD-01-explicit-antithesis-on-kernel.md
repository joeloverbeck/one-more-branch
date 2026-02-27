# NARARCAUD-01: Explicit Antithesis on Kernel

**Wave**: 1 (Quick Wins)
**Effort**: S
**Dependencies**: None
**Spec reference**: B1 — Thematic Architecture gaps

## Summary

Add an explicit `antithesis` field to `StoryKernel` so that the thematic counter-argument is available to spine, structure, and analyst prompts. Currently the kernel captures thesis/theme but lacks the opposing force needed for dialectical storytelling.

## Files to Touch

- `src/models/story-kernel.ts` — add `readonly antithesis: string` to `StoryKernel`
- `src/llm/schemas/kernel-ideator-schema.ts` — add `antithesis` to KERNEL_SCHEMA
- `src/llm/prompts/kernel-ideator-prompt.ts` — add antithesis instruction
- `src/llm/prompts/spine-prompt.ts` — render antithesis in `buildKernelGroundingSection`
- `src/llm/prompts/structure-prompt.ts` — render antithesis from `storyKernel` in user message
- `src/llm/analyst-types.ts` — add `antithesis: string` to `AnalystContext`
- `src/engine/analyst-evaluation.ts` — add `antithesis` to `AnalystEvaluationContext`, thread to `AnalystContext`
- `src/engine/post-generation-processor.ts` — pass `story.storyKernel.antithesis` to analyst context
- `prompts/kernel-ideator-prompt.md` — update doc
- `prompts/spine-prompt.md` — update doc
- `prompts/structure-prompt.md` — update doc
- `prompts/analyst-prompt.md` — update doc

## Out of Scope

- Dialectical tracking (NARARCAUD-17)
- Thematic charge classification (NARARCAUD-02)
- Kernel evaluator/evolver changes

## Acceptance Criteria

- [ ] `npm run typecheck` passes with new `antithesis` field required on `StoryKernel`
- [ ] Unit test: `StoryKernel` creation requires `antithesis`
- [ ] Unit test: `buildKernelGroundingSection` output includes antithesis text
- [ ] Unit test: `buildStructurePrompt` output includes antithesis when storyKernel provided
- [ ] Unit test: `buildAnalystPrompt` output includes antithesis when provided in context
- [ ] Invariant: All existing tests pass unchanged
- [ ] Invariant: Kernel evaluator/evolver schemas still compile (they consume `StoryKernel`)
