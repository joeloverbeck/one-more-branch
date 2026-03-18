# SCEIDEDIVOVE-003: Verify and harden scene ideator prompt slate instructions

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — prompt assembly verification and prompt-test hardening
**Deps**: `specs/scene-ideator-diversity-overhaul.md`, `src/llm/scene-ideation-contract.ts`, `src/llm/scene-ideation-slate.ts`, `src/llm/scene-ideation-context-signals.ts`, `src/llm/schemas/scene-ideator-schema.ts`, `src/llm/scene-ideator.ts`

## Problem

The original ticket assumed the prompt was still on the legacy 3-option architecture. That is no longer true. The codebase already ships a lane-based slate builder, a shared ideation count, prompt-level `IDEATION SLATE` rendering, schema support for `diversityLane`, and parser/validator enforcement for lane uniqueness.

The remaining problem is narrower: the ticket needs to verify that prompt instructions are fully aligned with the new architecture and harden tests around the prompt-level invariants that matter most. Any stale assumptions about missing slate or validation infrastructure must be removed before implementation work proceeds.

## Assumption Reassessment (2026-03-18)

1. `src/llm/prompts/scene-ideator-prompt.ts` currently embeds the role, diversity rules, count instructions, and output shape as hard-coded strings.
2. `buildSceneIdeatorPrompt()` already consumes a `SceneIdeationSlate` and already emits an `IDEATION SLATE` section. This ticket must not reimplement slate planning logic inside the prompt.
3. `test/unit/llm/prompts/scene-ideator-prompt.test.ts` is the correct seam for prompt verification and should be strengthened rather than duplicated.
4. Shared continuation heuristics already live in `src/llm/scene-ideation-context-signals.ts`, and count/lane invariants already live outside the prompt. This ticket must keep that separation intact.
5. The dependency tickets listed in the original draft do not exist in `tickets/`. Their intended work has already materialized in code, so this ticket must reference the real implementation files and the spec instead.

## Architecture Check

1. The existing architecture is directionally correct: prompt assembly consumes a prebuilt slate instead of owning lane heuristics inline. That is cleaner, easier to test, and more extensible than the legacy prompt-only diversity model.
2. Slot-specific instructions remain the right architectural fix. The durable win is not "5 instead of 3"; it is explicit per-slot dramatic engines backed by shared count and validation seams.
3. This ticket must preserve the current separation of concerns: prompt assembly renders deterministic slate/context inputs, while context-signal filtering and response validation stay outside the prompt builder.
4. No compatibility phrasing or alias path should survive for the legacy 3-option contract. The prompt should speak one architecture only.

## What to Change

### 1. Verify and, if necessary, strengthen the system message diversity contract

The system message should explicitly state that diversity is evaluated across the slate and should explicitly forbid:

- mirrored opposites of the same core event
- tonal variants of the same scenario
- different emotional coloring without a different dramatic engine

If the current wording is already sufficient, prefer test hardening over prompt churn.

### 2. Verify the rendered `IDEATION SLATE` block

The user message should continue to render:

- the shared target option count
- one lane per slot
- slot rationale
- required or discouraged signals when the slate builder supplies them
- the instruction to branch from a common starting point into different dramatic engines

If that rendering is already correct, do not rewrite prompt structure just to satisfy the original draft wording.

### 3. Keep opening and continuation context sections intact

Preserve the existing context assembly behavior unless a prompt-level gap is directly tied to the corrected acceptance criteria. Do not fold schema, parser, or doc work back into this ticket.

## Files to Touch

- `src/llm/prompts/scene-ideator-prompt.ts` (modify)
- `test/unit/llm/prompts/scene-ideator-prompt.test.ts` (modify)

## Out of Scope

- Parser or schema validation changes beyond consuming already-added contract fields
- Prompt markdown docs (already tracked separately and already updated in the codebase)
- Client UI or CSS
- Planner prompt changes
- Reimplementing slate selection or continuation-signal filtering in the prompt layer

## Acceptance Criteria

### Tests That Must Pass

1. `test/unit/llm/prompts/scene-ideator-prompt.test.ts` verifies the prompt now requests the default scene-idea count from the shared contract rather than a literal `3`.
2. `test/unit/llm/prompts/scene-ideator-prompt.test.ts` verifies continuation prompts include an `IDEATION SLATE` block with one line per lane slot.
3. `test/unit/llm/prompts/scene-ideator-prompt.test.ts` verifies the system message forbids mirrored and cosmetic variants explicitly and frames diversity as a slate-level property.
4. `test/unit/llm/prompts/scene-ideator-prompt.test.ts` verifies the output shape requires `diversityLane`.
5. Existing prompt architecture remains declarative: the prompt consumes a provided slate rather than recomputing lane selection rules inline.
6. Existing suite: `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/scene-ideator-prompt.test.ts`

### Invariants

1. Opening and continuation prompts must still include the existing story-state sections unless intentionally omitted by current conditional logic.
2. Prompt count, slot count, and schema/parser count must resolve from the same shared contract and never drift.
3. Prompt tests should lock down the cross-layer contract strongly enough that future prompt edits cannot quietly reintroduce legacy 3-option or vague-diversity phrasing.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/prompts/scene-ideator-prompt.test.ts` — assert slate rendering, stronger diversity instructions, declarative slate consumption, and updated output shape.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/scene-ideator-prompt.test.ts`
2. `npm run typecheck`
3. `npm run lint`

## Outcome

- **Completion date**: 2026-03-18
- **What actually changed**: Reassessed the ticket against the live codebase, removed stale assumptions about missing contract/slate/schema/parser work, narrowed the ticket to prompt verification, and strengthened `test/unit/llm/prompts/scene-ideator-prompt.test.ts` to lock down slate-level diversity wording plus declarative consumption of a provided slate.
- **Deviation from the original plan**: No prompt-production code changes were necessary because the lane-based prompt architecture had already landed. The original ticket was outdated and overstated the remaining implementation work.
- **Verification results**:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/scene-ideator-prompt.test.ts test/unit/llm/scene-ideator.test.ts test/unit/llm/scene-ideation-slate.test.ts test/unit/llm/prompt-doc-alignment.test.ts`
  - `npm run typecheck`
  - `npm run lint`
