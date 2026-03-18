# PLAYSTRUCT-03: Clarify structure prompt contracts for milestone completion versus act-end trajectory

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — prompt section builders and prompt documentation
**Deps**: `tickets/README.md`, `archive/tickets/WRIANASPL-07-analyst-structure-evaluation-and-prompt.md`, `prompts/page-planner-prompt.md`, `prompts/structure-evaluator-prompt.md`

## Problem

The evaluator already treats milestone `exitCondition` as the authoritative completion gate and `exitReversal` as act-level trajectory context. Planner and lorekeeper prompts, however, currently receive both fields without an equally explicit weighting rule. That leaves room for over-reliance on act-end reversal language when planning the immediate next scene, especially in stories where the act-end reversal is vivid and specific.

The contract should be explicit across all downstream prompt stages:

- `exitCondition` is the immediate milestone-completion target
- `objective` is fallback when exit condition is absent
- `actQuestion` is the act trajectory compass
- `exitReversal` is the act-end horizon, used when nearing act transition, not as the default scene gate

## Assumption Reassessment (2026-03-18)

1. `src/llm/prompts/structure-evaluator-prompt.ts` already tells the evaluator to prefer `activeMilestone.exitCondition` over `activeMilestone.objective` when deciding milestone completion, but the shared `=== STORY STRUCTURE ===` block in `src/llm/prompts/continuation/story-structure-section.ts` does **not** yet encode the same semantic weighting for planner/lorekeeper/opening-planner consumers.
2. `buildSharedStructureContext()` is consumed by planner continuation context, planner opening context, and the lorekeeper prompt. The ticket’s implementation scope therefore needs to cover the canonical shared builder plus every downstream doc/test surface that mirrors it.
3. `buildAnalystStructureEvaluation()` already contains an `=== ACT TRAJECTORY CHECK ===` section with partial evaluator-only guidance. The architectural gap is duplication: completion-vs-trajectory semantics are split between evaluator-only prose and a weaker shared structure block.
4. Prompt docs currently document the rendered fields, but `prompts/page-planner-prompt.md`, `prompts/lorekeeper-prompt.md`, and `prompts/structure-evaluator-prompt.md` do not consistently describe the authority order between `exitCondition`, `objective`, `actQuestion`, and `exitReversal`.
5. The corrected scope of this ticket is to make the weighting contract canonical in shared prompt-building code and keep docs/tests aligned. It does **not** change story-arc data semantics or schema fields.

## Architecture Check

1. The clean approach is to encode semantic weighting once in a shared continuation-story-structure helper that both the shared structure block and evaluator-specific guidance can reuse. This is more robust than scattering one-off reminders across individual prompts or duplicating near-identical wording in multiple builders.
2. No backwards-compatibility aliasing/shims introduced. This ticket should update the canonical prompt builders and their mirrored docs/tests in one pass.

## What to Change

### 1. Strengthen the shared continuation structure guidance

Update shared continuation structure/prompt-section builders so all `buildSharedStructureContext()` consumers receive an explicit rule block along the lines of:

- Active milestone `exitCondition` is the immediate completion contract for the current milestone.
- Use milestone `objective` only as fallback when `exitCondition` is absent.
- `actQuestion` is the act-level compass for drift/progress.
- `exitReversal` is the act-end reversal target; do not treat it as the scene’s default completion requirement unless the scene is approaching act transition or the active milestone is the final milestone of the act.

This guidance should live in shared prompt-building code, not just documentation prose.

### 2. Keep evaluator/planner/lorekeeper semantics aligned

Review all prompt consumers of `buildSharedStructureContext()` and related evaluator-only structure sections so they share the same interpretation contract.

At minimum verify:

- planner continuation context
- planner opening context
- lorekeeper prompt
- evaluator prompt / evaluator prompt documentation

If a dedicated helper is cleaner than embedding the rule text in the shared block itself, use the helper. The important point is one canonical source of semantic weighting, with evaluator-only prose adding only evaluator-specific behavior on top.

### 3. Update prompt docs and doc-alignment tests

Update the relevant prompt markdown files so the documented production templates match the new semantics.

For prompt pipeline changes involving ownership/scope/schema between stages, also verify no stale ownership statements remain, per repository instructions.

## Files to Touch

- `src/llm/prompts/continuation/story-structure-section.ts` (modify)
- `src/llm/prompts/sections/planner/continuation-context.ts` (verify only; modify if needed)
- `src/llm/prompts/sections/planner/opening-context.ts` (verify only; modify if needed)
- `src/llm/prompts/lorekeeper-prompt.ts` (modify, if needed)
- `prompts/page-planner-prompt.md` (modify)
- `prompts/lorekeeper-prompt.md` (modify)
- `prompts/structure-evaluator-prompt.md` (modify)
- `prompts/continuation-prompt.md` (modify only if references become stale)
- `test/unit/llm/prompts/continuation/writer-structure-context.test.ts` (modify)
- `test/unit/llm/prompts/sections/planner/continuation-context.test.ts` (modify as downstream assertion coverage)
- `test/unit/llm/prompts/lorekeeper-prompt.test.ts` (modify)
- `test/unit/llm/prompts/continuation/analyst-structure-evaluation.test.ts` (modify)
- `test/unit/llm/prompt-doc-alignment.test.ts` (verify only; modify only if contract coverage is expanded)

## Out of Scope

- UI restructuring
- Story-structure schema changes
- Regenerating existing story data solely to change wording

## Acceptance Criteria

### Tests That Must Pass

1. Shared continuation prompt sections explicitly distinguish milestone completion rules from act-end trajectory rules.
2. Planner/lorekeeper downstream prompts no longer leave `exitReversal` weighting implicit.
3. The shared contract is sourced from one canonical helper or rule block rather than duplicated, drifting prose.
4. Existing suite: `npm run test:unit -- --coverage=false`

### Invariants

1. `exitCondition` remains the authoritative completion contract when present.
2. `exitReversal` remains act-level trajectory context, never the default milestone completion gate.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/prompts/continuation/writer-structure-context.test.ts` — assert the shared structure block itself now includes explicit completion-vs-trajectory weighting.
2. `test/unit/llm/prompts/sections/planner/continuation-context.test.ts` — assert planner continuation output inherits the canonical weighting text.
3. `test/unit/llm/prompts/lorekeeper-prompt.test.ts` — assert lorekeeper prompt inherits the same canonical weighting text.
4. `test/unit/llm/prompts/continuation/analyst-structure-evaluation.test.ts` — confirm evaluator wording remains aligned with the canonical contract without regressing evaluator-only guidance.
5. `test/unit/llm/prompt-doc-alignment.test.ts` — verify doc/source mapping remains intact after markdown updates.

### Commands

1. `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/prompts/continuation/writer-structure-context.test.ts test/unit/llm/prompts/sections/planner/continuation-context.test.ts test/unit/llm/prompts/lorekeeper-prompt.test.ts test/unit/llm/prompts/continuation/analyst-structure-evaluation.test.ts test/unit/llm/prompt-doc-alignment.test.ts`
2. `npm run test:unit -- --coverage=false`
3. `npm run typecheck`

## Outcome

- Completion date: 2026-03-18
- Actual changes:
  - Added one canonical `STRUCTURE PRIORITIES` / `ACT TRAJECTORY CHECK` guidance block in `src/llm/prompts/continuation/story-structure-section.ts` so shared structure consumers and the evaluator reuse the same completion-vs-trajectory semantics.
  - Updated planner, lorekeeper, and evaluator prompt docs to describe the same authority order between `exitCondition`, `objective`, `actQuestion`, and `exitReversal`.
  - Strengthened tests around the shared structure block, planner continuation context, lorekeeper prompt, evaluator prompt, evaluator structure section, and prompt-doc alignment.
- Deviations from original plan:
  - The ticket originally treated evaluator semantics as already shared. In reality the evaluator had stricter wording than the shared builder, so the implementation centralized that guidance instead of only tweaking downstream prompt prose.
  - The test surface expanded to include `writer-structure-context`, `lorekeeper-prompt`, and `structure-evaluator-prompt` because they were actual contract consumers not fully captured in the initial draft.
- Verification results:
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/prompts/continuation/writer-structure-context.test.ts test/unit/llm/prompts/sections/planner/continuation-context.test.ts test/unit/llm/prompts/lorekeeper-prompt.test.ts test/unit/llm/prompts/continuation/analyst-structure-evaluation.test.ts test/unit/llm/prompt-doc-alignment.test.ts`
  - `npm run test:unit -- --coverage=false`
  - `npm run typecheck`
  - `npm run lint`
