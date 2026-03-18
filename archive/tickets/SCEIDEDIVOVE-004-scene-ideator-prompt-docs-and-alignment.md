# SCEIDEDIVOVE-004: Bring scene ideator prompt docs into the prompt-doc alignment contract

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: `tickets/SCEIDEDIVOVE-003-scene-ideator-prompt-slate-instructions.md`

## Problem

The original ticket assumed the scene ideator docs and prompt-doc alignment tests were still on the old 3-option contract. Reassessment against the live branch shows the main architecture work already landed: the scene ideator now uses the shared ideation contract, a lane-based slate, a default 5-option count, and prompt-doc alignment coverage.

The remaining issue is narrower:

- `prompts/scene-ideator-prompt.md` still contains a few factual mismatches against the live implementation details.
- The production prompt text still says the options are classified by "three" narrative dimensions while enumerating four.
- `test/unit/llm/prompt-doc-alignment.test.ts` includes `sceneIdeator`, but it does not explicitly assert the scene-ideator-specific lane/count/slate contract that this ticket is meant to protect.

## Assumption Reassessment (2026-03-18)

1. `prompts/scene-ideator-prompt.md` already documents the shared count source, lane taxonomy, `IDEATION SLATE`, and the 5-option contract. The old 3-option assumption is no longer true.
2. `test/unit/llm/prompt-doc-alignment.test.ts` already includes `sceneIdeator` in `PROMPT_DOC_CONTRACTS`.
3. The remaining doc drift is in smaller factual details, including continuation-mode wording and field/type descriptions.
4. Repo guidance still requires prompt docs and prompt-doc alignment tests to move together when prompt contract details change.

## Architecture Check

1. The current scene-ideator architecture is materially better than the old one and should remain the source of truth: one shared ideation contract, one lane taxonomy, one slate planner, and parser/schema validation keyed off the same target count.
2. The beneficial change now is not a broader redesign. It is to tighten the doc/test contract around the architecture that already exists, so future prompt drift is caught quickly.
3. No backward-compatibility layer or aliasing is warranted here. The lane-based 5-option architecture is the cleaner long-term contract.

## What to Change

### 1. Correct remaining scene-ideator prompt/doc drift

Revise the production prompt/doc wording so it matches the live implementation details:

- fix the "three narrative dimensions" wording bug in the production prompt text
- keep the markdown aligned with the shared count source and lane-based slate
- correct continuation-mode structure wording (`Milestone`, not `Beat`)
- correct overdue-thread and pending-promise rendering descriptions
- correct the continuation context type description for aged promises

### 2. Strengthen prompt-doc alignment coverage for the scene ideator

Keep the existing mapping coverage, and add explicit scene-ideator assertions for the lane/count/slate contract so drift in this doc is detected beyond the `- Source:` anchor.

### 3. Sweep related prompt docs for stale scene-ideator ownership statements

If any prompt markdown still references stale scene-ideator ownership or count semantics, update those references in the same pass. Current reassessment found no additional `prompts/*.md` matches beyond `prompts/scene-ideator-prompt.md`.

## Files to Touch

- `src/llm/prompts/scene-ideator-prompt.ts` (modify; wording-only bugfix if needed)
- `prompts/scene-ideator-prompt.md` (modify)
- `test/unit/llm/prompt-doc-alignment.test.ts` (modify)
- `prompts/*.md` (modify only if a targeted grep finds stale scene-ideator count/ownership references)

## Out of Scope

- Scene-ideator architecture redesign
- Parser/schema implementation work
- Client UI changes
- Non-scene-ideator prompt docs with no relevant stale references

## Acceptance Criteria

### Tests That Must Pass

1. `test/unit/llm/prompt-doc-alignment.test.ts` verifies the scene ideator remains included in `PROMPT_DOC_CONTRACTS`.
2. `test/unit/llm/prompt-doc-alignment.test.ts` verifies `prompts/scene-ideator-prompt.md` contains the correct `- Source:` anchor and explicit lane/count/slate contract details.
3. `test/unit/llm/prompts/scene-ideator-prompt.test.ts` verifies the production prompt wording is internally consistent after the wording bugfix.
4. Existing suites: `npm run test:unit -- --runTestsByPath test/unit/llm/prompt-doc-alignment.test.ts test/unit/llm/prompts/scene-ideator-prompt.test.ts`

### Invariants

1. Prompt markdown must describe the same ownership, field set, count contract, and continuation detail formatting as production source.
2. The production scene-ideator prompt must not contain internally contradictory contract wording.
3. No prompt doc may retain stale scene-ideator count or ownership statements once this ticket is complete.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/prompt-doc-alignment.test.ts` — add scene-ideator-specific assertions for the lane/count/slate contract and shared contract references.
2. `test/unit/llm/prompts/scene-ideator-prompt.test.ts` — cover the corrected prompt wording/instructions that this ticket changes.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/llm/prompt-doc-alignment.test.ts test/unit/llm/prompts/scene-ideator-prompt.test.ts`
2. `rg -n \"scene ideator|scene-ideator|exactly 3\" prompts -S`

## Outcome

- Completed: 2026-03-18
- What changed:
  - Reassessed the ticket against the live branch and corrected its assumptions/scope before implementation.
  - Fixed the production scene-ideator prompt wording bug that said "three narrative dimensions" while enumerating four.
  - Corrected the prompt markdown to match live continuation-mode details (`Milestone`, overdue-thread formatting, pending-promise formatting, `AgedTrackedPromise[]`).
  - Strengthened prompt-doc alignment coverage with scene-ideator-specific assertions for the lane/count/slate contract.
- Deviations from the original plan:
  - The originally proposed work to add scene-ideator prompt-doc mapping and replace stale 3-option docs was already finished on this branch, so the ticket narrowed to verification, factual doc cleanup, and stronger regression coverage instead of a broader doc migration.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/prompt-doc-alignment.test.ts test/unit/llm/prompts/scene-ideator-prompt.test.ts`
  - `npm run lint`
