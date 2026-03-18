# SCEIDEDIVOVE-006: Extract shared scene ideation context signals from prompt and slate layers

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — scene ideation heuristic ownership and prompt/slate integration seams
**Deps**: `archive/tickets/SCEIDEDIVOVE-001-scene-ideation-contract-and-slate-builder.completed.md`

## Problem

Scene ideation now has a clean contract and deterministic slate builder, but the continuation-pressure heuristics are still partially split across layers. `scene-ideation-slate.ts` computes booleans for overdue-thread pressure, aged-promise pressure, protagonist speech pressure, identity guidance, identity-turn pressure, and active-threat pressure, while `scene-ideator-prompt.ts` still owns overlapping continuation filtering for overdue threads and pending promises plus its own prompt-only formatting. That duplication is still localized, but it is now at exactly the seam where prompt/slate drift will grow if left alone.

## Assumption Reassessment (2026-03-18)

1. `src/llm/scene-ideation-contract.ts` and `src/llm/scene-ideation-slate.ts` already exist from ticket 001, so this ticket is not creating the first slate seam. It is extracting shared continuation-signal ownership out of the existing slate implementation.
2. `src/llm/prompts/scene-ideator-prompt.ts` still contains scene-ideator-specific helpers such as `formatOverdueThreadsSection()`, `formatPendingPromisesSection()`, and `buildIdeatorGuidanceSection()`, but only the overdue-thread and pending-promise filtering logic materially overlaps current slate heuristics. Active-state rendering, structure-position rendering, and prose formatting remain prompt-specific concerns.
3. `src/llm/prompts/scene-ideator-prompt.ts` does not yet consume `SceneIdeationSlate` or render an `IDEATION SLATE` block. That prompt rewrite still belongs to ticket 003, so this ticket must not pre-implement that architectural change under a shared-signals label.
4. No active ticket currently owns a neutral continuation-signal module that both the slate builder and the existing prompt helpers can consume before ticket 003 lands.

## Architecture Check

1. A neutral continuation-signal layer is cleaner than letting both slate planning and prompt assembly rediscover the same pressure thresholds independently. The slate builder should derive lane priorities from shared signals, and prompt helpers should render from those same derived signals where overlap is real.
2. This should stay narrow. Do not turn the signal module into a second prompt builder or a speculative abstraction for future tickets. Keep prompt text formatting in `scene-ideator-prompt.ts`.
3. This should not introduce aliases or backwards-compatibility shims. The goal is to move heuristic ownership into one module, not wrap old helpers in parallel paths.
4. This ticket is still architecturally beneficial before tickets 002 and 003 because it centralizes continuation heuristics without widening the output contract or rewriting prompt structure prematurely.

## What to Change

### 1. Introduce a shared scene-ideation continuation-signal module

Create a new module under `src/llm/` that derives reusable continuation signals from `SceneIdeatorContinuationContext`.

The shared signal object should cover at least:

- overdue-thread pressure
- aged-promise pressure
- protagonist speech pressure
- identity guidance pressure
- structure-driven identity-turn pressure
- active threat pressure
- overdue thread entries that the prompt can render
- pending promise entries that the prompt can render

Keep the module pure and deterministic. It should describe context pressure and shared filtered context data, not render prompt text.

### 2. Make the slate builder consume shared signals

Update `src/llm/scene-ideation-slate.ts` to consume the shared continuation-signal module rather than recomputing continuation heuristics locally.

Preserve current behavior unless a documented bug is found. This ticket is architectural cleanup, not a slate-policy rewrite.

### 3. Make prompt assembly consume shared signals where it materially overlaps

Update `src/llm/prompts/scene-ideator-prompt.ts` so overdue-thread and pending-promise sections consume the shared signal source instead of duplicating threshold/filter logic inline.

Do not over-abstract all prompt formatting. Formatting helpers can stay in the prompt file if they become thin renderers over shared signal data.

Do not make this ticket responsible for the lane-based `IDEATION SLATE` block or for replacing the current 3-option prompt contract. Those changes remain in tickets 002 and 003.

## Files to Touch

- `src/llm/scene-ideation-context-signals.ts` (new)
- `src/llm/scene-ideation-slate.ts` (modify)
- `src/llm/prompts/scene-ideator-prompt.ts` (modify)
- `test/unit/llm/scene-ideation-context-signals.test.ts` (new)
- `test/unit/llm/scene-ideation-slate.test.ts` (modify)
- `test/unit/llm/prompts/scene-ideator-prompt.test.ts` (modify)

## Out of Scope

- Changing the lane taxonomy or default count
- Rewriting the current 3-option prompt contract to the future slate-driven prompt shape
- Changing schema/parser validation rules beyond consuming already-existing shared signals
- Client UI or CSS
- Planner prompt refactors

## Acceptance Criteria

### Tests That Must Pass

1. `test/unit/llm/scene-ideation-context-signals.test.ts` verifies overdue-thread, aged-promise, speech, identity-guidance, identity-turn, and active-threat signals are derived deterministically from continuation context.
2. `test/unit/llm/scene-ideation-slate.test.ts` verifies the slate builder still prefers the same lanes for overdue threads, aged promises, speech pressure, and identity-heavy continuation context after signal extraction.
3. `test/unit/llm/prompts/scene-ideator-prompt.test.ts` verifies prompt rendering reflects the same shared overdue-thread and pending-promise filters without reintroducing inline heuristic drift.
3. Existing suites:
   - `npm run test:unit -- --runTestsByPath test/unit/llm/scene-ideation-context-signals.test.ts`
   - `npm run test:unit -- --runTestsByPath test/unit/llm/scene-ideation-slate.test.ts`
   - `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/scene-ideator-prompt.test.ts`

### Invariants

1. Shared continuation-pressure heuristics must have one code owner only; prompt assembly and slate planning may consume shared signals, but they must not each define separate threshold/filter rules for the same pressure.
2. Shared signals remain descriptive and deterministic. They must not become a second prompt renderer or hide formatting concerns inside the signal layer.
3. This ticket must not silently absorb the pending lane-based prompt rewrite from ticket 003.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/scene-ideation-context-signals.test.ts` — lock down the new shared continuation-signal contract directly.
2. `test/unit/llm/scene-ideation-slate.test.ts` — prove the extracted signal path preserves current lane-selection behavior.
3. `test/unit/llm/prompts/scene-ideator-prompt.test.ts` — prove prompt sections still respond to the same pressures after ownership is centralized.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/llm/scene-ideation-context-signals.test.ts test/unit/llm/scene-ideation-slate.test.ts test/unit/llm/prompts/scene-ideator-prompt.test.ts`
2. `npm run typecheck`
3. `npm run lint`

## Outcome

- Completion date: 2026-03-18
- Actual changes:
  - Added `src/llm/scene-ideation-context-signals.ts` as the shared owner for continuation-only scene-ideation pressure signals and filtered prompt-facing context data.
  - Updated `src/llm/scene-ideation-slate.ts` to consume the shared signal object instead of owning its own continuation signal derivation.
  - Updated `src/llm/prompts/scene-ideator-prompt.ts` so overdue-thread and pending-promise sections render from shared filtered signals while keeping prompt prose formatting local.
  - Added `test/unit/llm/scene-ideation-context-signals.test.ts` and updated prompt tests so filtering logic is asserted once at the signal seam and prompt helpers are tested as renderers.
- Deviations from original plan:
  - This ticket intentionally did not rewrite the prompt around `SceneIdeationSlate` or the lane-based 5-option contract because that architecture still belongs to tickets `SCEIDEDIVOVE-002` and `SCEIDEDIVOVE-003`.
  - Active-state and structure-position prompt sections were left in place because they are prompt-owned rendering concerns, not duplicated heuristic owners today.
- Verification results:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/scene-ideation-context-signals.test.ts test/unit/llm/scene-ideation-slate.test.ts test/unit/llm/prompts/scene-ideator-prompt.test.ts` ✅
  - `npm run typecheck` ✅
  - `npm run lint` ✅
