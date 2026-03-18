# PLAYSTRUCT-03: Clarify structure prompt contracts for milestone completion versus act-end trajectory

**Status**: PENDING
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

1. The structure evaluator prompt already encodes the correct rule set in `src/llm/prompts/structure-evaluator-prompt.ts` and `src/llm/prompts/continuation/story-structure-section.ts`.
2. The shared structure block used by planner and lorekeeper includes `Act Question`, `Expected Exit Reversal`, and active milestone `Exit condition`, but does not explicitly rank them by authority for immediate scene planning.
3. Prompt docs currently describe the fields but do not consistently state the completion-vs-trajectory distinction. The corrected scope of this ticket is to make that distinction first-class in prompt builders and docs, not to change story-arc data semantics.

## Architecture Check

1. The clean approach is to encode semantic weighting once in shared prompt-section builders so planner, evaluator, and lorekeeper stay aligned. This is more robust than scattering one-off reminders across individual prompts.
2. No backwards-compatibility aliasing/shims introduced. This ticket should update the canonical prompt builders and their mirrored docs/tests in one pass.

## What to Change

### 1. Strengthen the shared continuation structure guidance

Update shared structure/prompt-section builders so continuation consumers receive an explicit rule block along the lines of:

- Active milestone `exitCondition` is the immediate completion contract for the current milestone.
- Use milestone `objective` only as fallback when `exitCondition` is absent.
- `actQuestion` is the act-level compass for drift/progress.
- `exitReversal` is the act-end reversal target; do not treat it as the scene’s default completion requirement unless the scene is approaching act transition or the active milestone is the final milestone of the act.

This guidance should live in shared prompt-building code, not just documentation prose.

### 2. Keep evaluator/planner/lorekeeper semantics aligned

Review all prompt consumers of `buildSharedStructureContext()` and related structure sections so they share the same interpretation contract.

At minimum verify:

- planner continuation context
- lorekeeper prompt
- evaluator prompt documentation

If a dedicated helper is cleaner than embedding the rule text in the shared block itself, use the helper. The important point is one canonical source of semantic weighting.

### 3. Update prompt docs and doc-alignment tests

Update the relevant prompt markdown files so the documented production templates match the new semantics.

For prompt pipeline changes involving ownership/scope/schema between stages, also verify no stale ownership statements remain, per repository instructions.

## Files to Touch

- `src/llm/prompts/continuation/story-structure-section.ts` (modify)
- `src/llm/prompts/sections/planner/continuation-context.ts` (modify, if needed)
- `src/llm/prompts/lorekeeper-prompt.ts` (modify, if needed)
- `prompts/page-planner-prompt.md` (modify)
- `prompts/structure-evaluator-prompt.md` (modify)
- `prompts/continuation-prompt.md` (modify only if references become stale)
- `test/unit/llm/prompts/sections/planner/continuation-context.test.ts` (modify)
- `test/unit/llm/prompts/continuation/analyst-structure-evaluation.test.ts` (modify)
- `test/unit/llm/prompt-doc-alignment.test.ts` (modify if docs/source snapshots change)

## Out of Scope

- UI restructuring
- Story-structure schema changes
- Regenerating existing story data solely to change wording

## Acceptance Criteria

### Tests That Must Pass

1. Shared continuation prompt sections explicitly distinguish milestone completion rules from act-end trajectory rules.
2. Planner/lorekeeper downstream prompts no longer leave `exitReversal` weighting implicit.
3. Existing suite: `npm run test:unit -- --coverage=false`

### Invariants

1. `exitCondition` remains the authoritative completion contract when present.
2. `exitReversal` remains act-level trajectory context, never the default milestone completion gate.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/prompts/sections/planner/continuation-context.test.ts` — assert planner context includes explicit semantic weighting for exit condition, act question, and exit reversal.
2. `test/unit/llm/prompts/continuation/analyst-structure-evaluation.test.ts` — confirm evaluator wording remains aligned with the canonical contract.
3. `test/unit/llm/prompt-doc-alignment.test.ts` — keep docs synced with prompt source after wording updates.

### Commands

1. `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/prompts/sections/planner/continuation-context.test.ts test/unit/llm/prompts/continuation/analyst-structure-evaluation.test.ts test/unit/llm/prompt-doc-alignment.test.ts`
2. `npm run test:unit -- --coverage=false`
3. `npm run typecheck`
