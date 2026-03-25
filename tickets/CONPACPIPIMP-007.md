# CONPACPIPIMP-007: Update Packeter and One-Shot prompts for playerPosition and interactionVerbs guidance

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: CONPACPIPIMP-006 (playerPosition must exist in schema/model)

## Problem

The Packeter and One-Shot prompts reference `viewpointPressure` (now replaced by `playerPosition`) and lack guidance on rejecting generic `interactionVerbs`. Prompts must instruct the LLM to produce mandatory `playerPosition` with specificity requirements, and to reject generic verbs unless made unusually concrete.

## Assumption Reassessment (2026-03-25)

1. `src/llm/prompts/content-packeter-prompt.ts` builds the packeter system prompt — confirmed.
2. `src/llm/prompts/content-one-shot-prompt.ts` builds the one-shot system prompt — confirmed.
3. `prompts/content-packeter-prompt.md` is the packeter prompt doc — confirmed.
4. `prompts/content-one-shot-prompt.md` is the one-shot prompt doc — confirmed.

## Architecture Check

1. Prompt-only change — no model or schema modifications (those are in CONPACPIPIMP-006).
2. Both prompts need the same conceptual updates, keeping them in one ticket for consistency.

## What to Change

### 1. Packeter prompt builder

- Replace any `viewpointPressure` references with `playerPosition`
- Add `playerPosition` guidance: "playerPosition is mandatory. It must describe who the player is, what they know or don't know, and why their position is inherently pressured. Generic positions like 'you are an adventurer' should be rejected."
- Add `interactionVerbs` guidance: "interactionVerbs must be story-specific. Generic verbs like 'explore', 'fight', 'talk' should be rejected unless the packet makes them unusually concrete — e.g., 'fight' is too generic but 'fight to keep the clinic open against the zoning board' is specific."

### 2. One-shot prompt builder

- Replace any `viewpointPressure` references with `playerPosition`
- Add the same `playerPosition` and `interactionVerbs` guidance as the packeter prompt

### 3. Prompt documentation

- Update `prompts/content-packeter-prompt.md` — new JSON shape, playerPosition notes
- Update `prompts/content-one-shot-prompt.md` — same changes

## Files to Touch

- `src/llm/prompts/content-packeter-prompt.ts` (modify)
- `src/llm/prompts/content-one-shot-prompt.ts` (modify)
- `prompts/content-packeter-prompt.md` (modify)
- `prompts/content-one-shot-prompt.md` (modify)

## Out of Scope

- Model/interface changes (CONPACPIPIMP-006)
- Schema changes (CONPACPIPIMP-006)
- Persistence upcaster (CONPACPIPIMP-006)
- Evaluator changes (CONPACPIPIMP-008, CONPACPIPIMP-009)
- Taste Distiller or Sparkstormer prompts

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: Packeter prompt string contains "playerPosition" and does NOT contain "viewpointPressure"
2. Unit test: Packeter prompt string contains interactionVerbs specificity guidance (e.g., "story-specific")
3. Unit test: One-shot prompt string contains "playerPosition" and does NOT contain "viewpointPressure"
4. Unit test: One-shot prompt string contains interactionVerbs specificity guidance
5. Existing suite: `npm test` — no regressions

### Invariants

1. Prompts still include all original field descriptions for unchanged fields
2. Prompt docs in `prompts/` match the actual prompt builder output structure

## Test Plan

### New/Modified Tests

1. `test/unit/llm/content-packeter.test.ts` — add prompt string assertions for playerPosition and interactionVerbs guidance
2. `test/unit/llm/content-one-shot.test.ts` — same assertions

### Commands

1. `npm run test:unit -- --testPathPattern="content-packeter|content-one-shot"`
2. `npm run typecheck && npm run lint && npm test`
