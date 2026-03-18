# SCEIDEDIVOVE-006: Extract shared scene ideation context signals from prompt and slate layers

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — scene ideation heuristic ownership and prompt/slate integration seams
**Deps**: `archive/tickets/SCEIDEDIVOVE-001-scene-ideation-contract-and-slate-builder.completed.md`, `tickets/SCEIDEDIVOVE-003-scene-ideator-prompt-slate-instructions.md`

## Problem

Scene ideation now has a clean contract and slate builder, but the story-pressure heuristics are still split across layers. `scene-ideation-slate.ts` computes continuation signals such as overdue-thread pressure, aged-promise pressure, speech pressure, and identity-turn pressure, while `scene-ideator-prompt.ts` still owns related filtering and formatting logic for overdue threads, pending promises, structure position, and protagonist guidance. That duplication risk is still small, but if prompt rendering evolves further it will become easy for slate selection and prompt instructions to drift apart.

## Assumption Reassessment (2026-03-18)

1. `src/llm/scene-ideation-slate.ts` currently derives continuation heuristics internally rather than consuming a shared signal object.
2. `src/llm/prompts/scene-ideator-prompt.ts` still contains scene-ideator-specific helpers such as `formatOverdueThreadsSection()`, `formatPendingPromisesSection()`, and `buildIdeatorGuidanceSection()`, each of which touches related story-pressure data.
3. No existing active ticket explicitly owns extraction of shared scene-ideation context signals into a neutral module. Tickets 002-005 assume the contract/slate work exists, but none of them currently prevent heuristic duplication from growing.

## Architecture Check

1. A neutral scene-ideation signal layer is cleaner than letting both slate planning and prompt assembly rediscover the same context pressures independently. The prompt should render from already-derived signals, and the slate should rank lanes from the same source.
2. This should not introduce aliases or backwards-compatibility shims. The goal is to move heuristic ownership into one module, not wrap old helpers in parallel paths.

## What to Change

### 1. Introduce a shared scene-ideation context signal module

Create a new module under `src/llm/` that derives reusable scene-ideation signals from `SceneIdeatorContext`.

The shared signal object should cover at least:

- overdue-thread pressure
- aged-promise pressure
- protagonist speech pressure
- identity guidance pressure
- structure-driven identity-turn pressure
- active threat pressure

Keep the module pure and deterministic. It should describe context pressure, not render prompt text.

### 2. Make the slate builder consume shared signals

Update `src/llm/scene-ideation-slate.ts` to consume the shared signal module rather than recomputing continuation heuristics locally.

Preserve current behavior unless a documented bug is found. This ticket is architectural cleanup, not a slate-policy rewrite.

### 3. Make prompt assembly consume shared signals where it materially overlaps

Update `src/llm/prompts/scene-ideator-prompt.ts` so slot rendering and any scene-ideator-specific pressure wording use the shared signal source instead of duplicating the decision logic inline.

Do not over-abstract all prompt formatting. Formatting helpers can stay in the prompt file if they become thin renderers over shared signal data.

## Files to Touch

- `src/llm/scene-ideation-context-signals.ts` (new)
- `src/llm/scene-ideation-slate.ts` (modify)
- `src/llm/prompts/scene-ideator-prompt.ts` (modify)
- `test/unit/llm/scene-ideation-slate.test.ts` (modify)
- `test/unit/llm/prompts/scene-ideator-prompt.test.ts` (modify)

## Out of Scope

- Changing the lane taxonomy or default count
- Changing schema/parser validation rules beyond consuming already-existing shared signals
- Client UI or CSS
- Planner prompt refactors

## Acceptance Criteria

### Tests That Must Pass

1. `test/unit/llm/scene-ideation-slate.test.ts` verifies the slate builder still prefers the same lanes for overdue threads, aged promises, speech pressure, and identity-heavy continuation context after signal extraction.
2. `test/unit/llm/prompts/scene-ideator-prompt.test.ts` verifies prompt rendering reflects the same derived pressures without reintroducing inline heuristic drift.
3. Existing suites:
   - `npm run test:unit -- --runTestsByPath test/unit/llm/scene-ideation-slate.test.ts`
   - `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/scene-ideator-prompt.test.ts`

### Invariants

1. Scene-ideation pressure heuristics must have one code owner only; prompt assembly and slate planning may consume shared signals, but they must not each define separate decision rules for the same pressure.
2. Shared signals remain descriptive and deterministic. They must not become a second prompt renderer or hide formatting concerns inside the signal layer.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/scene-ideation-slate.test.ts` — prove the extracted signal path preserves current lane-selection behavior.
2. `test/unit/llm/prompts/scene-ideator-prompt.test.ts` — prove prompt sections and slate instructions still respond to the same pressures after ownership is centralized.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/llm/scene-ideation-slate.test.ts test/unit/llm/prompts/scene-ideator-prompt.test.ts`
2. `npm run typecheck`
3. `npm run lint`
