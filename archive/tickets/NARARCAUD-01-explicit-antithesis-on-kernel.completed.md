# NARARCAUD-01: Explicit Antithesis on Kernel

**Status**: COMPLETED
**Wave**: 1 (Quick Wins)
**Effort**: S
**Dependencies**: None
**Spec reference**: B1 — Thematic Architecture gaps

## Summary

Add an explicit `antithesis` field to `StoryKernel` so that the thematic counter-argument is available to spine, structure, and analyst prompts. Currently the kernel captures thesis/theme but lacks the opposing force needed for dialectical storytelling.

## Reassessed Assumptions and Scope

- `StoryKernel` currently has 5 required fields and no `antithesis`; `isStoryKernel(...)` is the runtime enforcement seam.
- `structure-prompt.ts` currently uses `storyKernel` only for `directionOfChange` guidance and does **not** render a thematic kernel block.
- `spine-prompt.ts` already renders kernel grounding, but `buildKernelGroundingSection(...)` is private. Testing should assert through `buildSpinePrompt(...)` output.
- Analyst wiring currently passes `spine` (not `storyKernel`) into `AnalystContext`; adding `antithesis` for analyst requires explicit threading through `post-generation-processor.ts` and `analyst-evaluation.ts`.
- Prompt docs currently describe 5 kernel fields; docs must be updated alongside code to avoid stale prompt ownership/schema statements.

### Architectural Decision

Adding `antithesis` to `StoryKernel` is net-beneficial versus current architecture because it makes thematic opposition a first-class invariant instead of an inferred prompt artifact. This improves robustness for downstream thematic checks and extensibility for future dialectical features without introducing aliases or fallback schema branches.

## Files to Touch

- `src/models/story-kernel.ts` — add `readonly antithesis: string` to `StoryKernel`
- `src/llm/schemas/kernel-ideator-schema.ts` — add `antithesis` to KERNEL_SCHEMA
- `src/llm/prompts/kernel-ideator-prompt.ts` — add antithesis instruction
- `src/llm/prompts/spine-prompt.ts` — render antithesis in `buildKernelGroundingSection`
- `src/llm/prompts/structure-prompt.ts` — add a thematic kernel section and render antithesis from `storyKernel` in user message
- `src/llm/analyst-types.ts` — add `antithesis: string` to `AnalystContext`
- `src/engine/analyst-evaluation.ts` — add `antithesis` to `AnalystEvaluationContext`, thread to `AnalystContext`
- `src/engine/post-generation-processor.ts` — pass `story.storyKernel.antithesis` to analyst context
- `test/unit/story-kernel-types.test.ts` — assert `isStoryKernel` rejects kernels missing antithesis
- `test/unit/llm/kernel-ideator.test.ts` — include antithesis in valid fixtures and prompt expectations
- `test/unit/llm/prompts/spine-prompt.test.ts` — assert antithesis appears in prompt when kernel provided
- `test/unit/llm/prompts/structure-prompt.test.ts` — assert structure prompt renders antithesis when kernel provided
- `test/unit/llm/prompts/analyst-prompt.test.ts` — assert analyst prompt renders antithesis when context includes it
- `prompts/kernel-ideator-prompt.md` — update doc
- `prompts/spine-prompt.md` — update doc
- `prompts/structure-prompt.md` — update doc
- `prompts/analyst-prompt.md` — update doc

## Out of Scope

- Dialectical tracking (NARARCAUD-17)
- Thematic charge classification (NARARCAUD-02)
- Kernel evaluator/evolver changes

## Acceptance Criteria

- [x] `npm run typecheck` passes with new `antithesis` field required on `StoryKernel`
- [x] Unit test: `isStoryKernel(...)` rejects payloads missing `antithesis`
- [x] Unit test: `buildSpinePrompt(...)` output includes antithesis text when `storyKernel` is provided
- [x] Unit test: `buildStructurePrompt` output includes antithesis when storyKernel provided
- [x] Unit test: `buildAnalystPrompt` output includes antithesis when provided in context
- [x] Unit test: kernel ideator parsing/prompt expectations include antithesis
- [x] Invariant: Relevant existing tests pass with updated fixtures
- [x] Invariant: Kernel evaluator/evolver schemas still compile (they consume `StoryKernel`)

## Outcome

- **Completion date**: 2026-02-27
- **What changed**:
  - Added required `antithesis` to `StoryKernel` type guard + ideator schema.
  - Updated kernel, spine, structure, and analyst prompts to surface antithesis context.
  - Threaded antithesis through analyst runtime context (`post-generation-processor` -> `analyst-evaluation` -> `buildAnalystPrompt`).
  - Updated prompt docs and kernel fixtures/tests across unit/integration/e2e coverage.
- **Deviations from original plan**:
  - Acceptance criterion for private helper `buildKernelGroundingSection` was corrected to test through public `buildSpinePrompt(...)`.
  - Concept ideator/evolver prompt kernel sections were also updated to include antithesis for consistency with the now-required kernel shape.
- **Verification**:
  - `npm run typecheck` passed.
  - `npm run lint` passed.
  - `npm test` passed (`235` suites, `2732` tests).
