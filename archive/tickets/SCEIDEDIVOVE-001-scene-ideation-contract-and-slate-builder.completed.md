# SCEIDEDIVOVE-001: Add scene ideation contract constants and deterministic slate builder

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — scene ideation contract/types and lane selection logic
**Deps**: `specs/scene-ideator-diversity-overhaul.md`

## Problem

Scene ideation is currently hard-coded around exactly 3 options and has no deterministic slate-planning layer. That makes the prompt responsible for both option count and diversity, which is brittle and hard to validate.

## Assumption Reassessment (2026-03-18)

1. `src/llm/scene-ideator.ts`, `src/llm/prompts/scene-ideator-prompt.ts`, and `src/llm/schemas/scene-ideator-schema.ts` each currently hard-code `3`.
2. No existing scene-ideation contract module or lane taxonomy exists in `src/llm/` or `src/models/`.
3. Current tests already cover prompt text and parser behavior in `test/unit/llm/prompts/scene-ideator-prompt.test.ts` and `test/unit/llm/scene-ideator.test.ts`, but there is no dedicated slate-selection seam or slate-focused test file yet.
4. `SceneDirectionOption` currently lives in `src/models/scene-direction.ts` and is consumed beyond the ideator stage, so this ticket should not widen that cross-stage contract yet. Lane metadata should stay inside the new ideation contract/slate layer until the downstream output-contract ticket updates the shared option shape.

## Architecture Check

1. A dedicated contract + slate builder keeps count/lane rules in one place and avoids another round of string-literal drift across prompt, schema, parser, and tests.
2. The slate builder should be deterministic and pure. No random lane assignment, no prompt-only heuristics, and no backwards-compatibility alias layer for old 3-option behavior.
3. The clean boundary for this ticket is a reusable pre-prompt planning layer. Prompt/schema/parser integration remains downstream work, but this ticket should expose a stable slate API that those layers can adopt without re-encoding the heuristics.

## What to Change

### 1. Add a scene ideation contract module

Create a new module that exports:

- `DEFAULT_SCENE_IDEA_COUNT = 5`
- `MIN_SCENE_IDEA_COUNT = 4`
- `MAX_SCENE_IDEA_COUNT = 6`
- `SceneIdeaLane` union
- ordered lane constants for default/opening/continuation selection
- helper predicates or validation utilities if needed

This module becomes the only source of truth for scene ideation counts and lane taxonomy.

### 2. Add `SceneIdeationSlate` and builder logic

Create a slate builder that returns:

- `targetOptionCount`
- ordered `slots`
- lane choice rationale per slot
- continuation heuristics for overdue threads, promises, protagonist-guidance speech pressure, and structure-state identity turns

The builder should support:

- opening mode default slate
- continuation mode default slate
- context-driven replacement of one default lane with `IDENTITY_OR_TRANSFORMATION` when the spec’s heuristics are met

### 3. Expose slate types for later tickets

Expose slate types from the ideation layer only as needed so downstream prompt/schema/parser tickets can consume the slate without duplicating contracts. Do not yet expand the shared `SceneDirectionOption` model in this ticket.

## Files to Touch

- `src/llm/scene-ideation-contract.ts` (new)
- `src/llm/scene-ideation-slate.ts` (new)
- `src/llm/scene-ideator-types.ts` (modify only if needed to re-export or reference slate types cleanly)
- `test/unit/llm/scene-ideation-slate.test.ts` (new)

## Out of Scope

- Prompt text changes
- JSON schema changes
- Response parsing changes
- `SceneDirectionOption` shared-model changes
- Prompt documentation updates
- Client rendering or CSS changes

## Acceptance Criteria

### Tests That Must Pass

1. `test/unit/llm/scene-ideation-slate.test.ts` verifies opening mode returns 5 unique lanes with the default opening slate.
2. `test/unit/llm/scene-ideation-slate.test.ts` verifies continuation mode prefers `CONSEQUENCE_OR_PAYOFF` when overdue threads or aged promises are present.
3. `test/unit/llm/scene-ideation-slate.test.ts` verifies `IDENTITY_OR_TRANSFORMATION` replaces exactly one default lane only when identity-heavy continuation context supports it.
4. Existing suites that guard the adjacent architecture remain unchanged and must still pass if touched incidentally:
   - `npm run test:unit -- --runTestsByPath test/unit/llm/scene-ideator.test.ts`
   - `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/scene-ideator-prompt.test.ts`

### Invariants

1. Scene ideation count limits come from one module only; no new duplicated `3`, `5`, `4`, or `6` literals may be introduced for the same contract.
2. Slate generation is deterministic for the same context and never emits duplicate lanes inside a single slate.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/scene-ideation-slate.test.ts` — covers default lane order, continuation heuristics, and identity-lane replacement behavior.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/llm/scene-ideation-slate.test.ts`
2. `npm run test:unit -- --runTestsByPath test/unit/llm/scene-ideator.test.ts`
3. `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/scene-ideator-prompt.test.ts`
4. `npm run typecheck`
5. `npm run lint`

## Outcome

- Completion date: 2026-03-18
- Actual changes:
  - Added `src/llm/scene-ideation-contract.ts` as the single source of truth for scene-idea counts and lane taxonomy.
  - Added `src/llm/scene-ideation-slate.ts` with a deterministic, pure slate builder for opening and continuation contexts.
  - Added `test/unit/llm/scene-ideation-slate.test.ts` to lock down opening defaults, consequence pressure, speech pressure, and identity-lane replacement.
  - Fixed an unrelated pre-existing lint error in `test/unit/client/spines-page/controller.test.ts` so the required verification commands finish green.
- Deviations from original plan:
  - `src/llm/scene-ideator-types.ts` was not modified because the new slate types are cleanly owned by the new slate module and did not require widening the existing ideator result contract yet.
  - Shared `SceneDirectionOption` was intentionally left unchanged; that remains downstream output-contract work.
- Verification results:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/scene-ideation-slate.test.ts` ✅
  - `npm run test:unit -- --runTestsByPath test/unit/llm/scene-ideator.test.ts` ✅
  - `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/scene-ideator-prompt.test.ts` ✅
  - `npm run test:unit -- --runTestsByPath test/unit/client/spines-page/controller.test.ts` ✅
  - `npm run typecheck` ✅
  - `npm run lint` ✅
