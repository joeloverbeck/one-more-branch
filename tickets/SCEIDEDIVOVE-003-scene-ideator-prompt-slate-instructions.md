# SCEIDEDIVOVE-003: Rewrite scene ideator prompt generation around explicit ideation slates

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — scene ideator prompt assembly
**Deps**: `tickets/SCEIDEDIVOVE-001-scene-ideation-contract-and-slate-builder.md`, `tickets/SCEIDEDIVOVE-002-scene-ideator-output-contract-and-validation.md`

## Problem

The current prompt asks for “exactly 3 distinct” options in one generic block. It does not expose per-slot lane assignments, does not define invalid mirrored/cosmetic variants strongly enough, and does not tell the model to branch from a common starting point into different dramatic engines.

## Assumption Reassessment (2026-03-18)

1. `src/llm/prompts/scene-ideator-prompt.ts` currently embeds the role, diversity rules, count instructions, and output shape as hard-coded strings.
2. `buildSceneIdeatorPrompt()` currently does not consume a slate builder and does not emit an `IDEATION SLATE` section.
3. `test/unit/llm/prompts/scene-ideator-prompt.test.ts` already covers the current prompt structure, so this ticket can update that suite rather than inventing a second prompt-test seam.
4. Ticket `SCEIDEDIVOVE-006` extracted shared continuation heuristics into `src/llm/scene-ideation-context-signals.ts`, so overdue-thread and pending-promise filtering should not be reimplemented during the prompt rewrite.

## Architecture Check

1. The prompt should consume a prebuilt slate rather than recomputing lane heuristics inline. That keeps prompt generation declarative and makes tests assert on rendered instructions rather than hidden business logic.
2. Slot-specific instructions are the architectural fix here. Merely changing `3` to `5` would increase output volume without solving slate collapse.
3. The prompt rewrite should build on the shared continuation-signal seam from ticket `006`: prompt assembly should render existing filtered context plus the deterministic slate, not recreate pressure thresholds or duplicate lane-selection logic.
4. Once this ticket lands, the old prompt-only 3-option contract should disappear completely. Do not leave a parallel legacy phrasing path behind for “compatibility”.

## What to Change

### 1. Update the system message diversity contract

Replace the current diversity block with lane-based slate rules that explicitly forbid:

- mirrored opposites of the same core event
- tonal variants of the same scenario
- different emotional coloring without a different dramatic engine

The system message must explain that diversity is evaluated across the slate.

### 2. Render an `IDEATION SLATE` block in the user message

Use the builder from ticket 001 to render:

- target option count
- one lane per slot
- slot rationale or lane-specific signals where needed
- the instruction to branch from the player choice / current state into different dramatic engines

Update output-shape instructions so they mention `diversityLane`.

### 3. Keep opening and continuation context sections intact

Preserve the existing context assembly behavior unless it is directly required for the slate block. Do not mix unrelated prompt refactors into this ticket.

## Files to Touch

- `src/llm/prompts/scene-ideator-prompt.ts` (modify)
- `test/unit/llm/prompts/scene-ideator-prompt.test.ts` (modify)

## Out of Scope

- Parser or schema validation changes beyond consuming already-added contract fields
- Prompt markdown docs
- Client UI or CSS
- Planner prompt changes

## Acceptance Criteria

### Tests That Must Pass

1. `test/unit/llm/prompts/scene-ideator-prompt.test.ts` verifies the prompt now requests the default scene-idea count from the shared contract rather than a literal `3`.
2. `test/unit/llm/prompts/scene-ideator-prompt.test.ts` verifies continuation prompts include an `IDEATION SLATE` block with one line per lane slot.
3. `test/unit/llm/prompts/scene-ideator-prompt.test.ts` verifies the system message forbids mirrored and cosmetic variants explicitly.
4. `test/unit/llm/prompts/scene-ideator-prompt.test.ts` verifies the output shape requires `diversityLane`.
5. Existing suite: `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/scene-ideator-prompt.test.ts`

### Invariants

1. Opening and continuation prompts must still include the existing story-state sections unless intentionally omitted by current conditional logic.
2. Prompt count, slot count, and schema/parser count must resolve from the same shared contract and never drift.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/prompts/scene-ideator-prompt.test.ts` — assert slate rendering, stronger diversity instructions, and updated output shape.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/scene-ideator-prompt.test.ts`
2. `npm run typecheck`
