# STOARCGEN-020: Generation Stage Runner Consolidation

**Status**: COMPLETED
**Depends on**: STOARCGEN-012, STOARCGEN-019
**Blocks**: None

## Reassessed State

The original framing of this ticket overstates how much of the codebase currently shares the same architectural problem.

What is true in the current code:
- `src/llm/structure-generator.ts` has a tiny local wrapper, `runStructureStage()`, that emits canonical generation-stage start/completed events and measures `durationMs`.
- `src/llm/character-stage-runner.ts` duplicates the same basic stage lifecycle shape, but inlined inside the stage switch instead of behind a helper.
- Both of those modules are thin domain orchestrators whose duplicated concern is exactly: emit `started`, run async work, emit `completed`, and optionally attach duration.
- `src/engine/generation-pipeline-helpers.ts` currently exposes only the low-level `emitGenerationStage(...)` primitive, so these two LLM pipelines still carry lifecycle boilerplate locally.

What is not true in the current code:
- `src/llm/kernel-stage-runner.ts` is not just another copy of the same seam. Its local helper also owns structured logging and failure logging, and its callback behavior currently omits `durationMs` even though logs include it.
- Several engine pipelines that call `emitGenerationStage(...)` directly are not merely missing a helper. They include retries, partial completion semantics, parallel sub-work, or route/service-local orchestration that would be poorly served by forcing them into a single generic runner right now.
- There is no evidence that a broad `runGenerationStages(...)` framework is currently needed. The concrete repeated problem is a smaller single-stage wrapper.

Correct architectural conclusion:
- This ticket should consolidate the repeated stage lifecycle seam shared by `structure-generator` and `character-stage-runner`.
- It should not pull `kernel-stage-runner` or the engine pipelines into the abstraction unless the helper is later proven to fit their additional logging/error semantics cleanly.

## Summary

Consolidate the repeated generation-stage lifecycle wrapper used by the structure and character pipelines into a shared helper.

This is a narrower and cleaner goal than the original ticket text. The real duplicated concern is not "every place that emits stages"; it is the small orchestration seam that pairs canonical stage events with async work and duration measurement. That seam currently exists twice in the LLM layer and should exist once.

## Problem

The system has canonical stage IDs and a canonical low-level emitter, but two adjacent LLM pipelines still duplicate the same "run one stageful async operation" wrapper.

That creates three concrete risks:
- **Drift**: structure and character generation can diverge on duration behavior or event pairing.
- **Coupling**: domain orchestration stays mixed with stage bookkeeping.
- **False generalization pressure**: without a small shared seam, future work is more likely to either duplicate again or overcorrect into a too-generic framework.

The ideal architecture is:
- a shared helper runs one canonical `GenerationStage` around one async operation,
- domain pipelines keep ownership of their own sequencing and stage mapping,
- completed events consistently include measured `durationMs` for migrated pipelines,
- the helper stays thin and does not absorb unrelated transport, retry, or logging policy.

## Recommended Direction

Introduce a small shared helper for one stageful async operation.

Example shape:

```typescript
async function runGenerationStage<T>(
  onGenerationStage: GenerationStageCallback | undefined,
  stage: GenerationStage,
  operation: () => Promise<T>,
  attempt?: number
): Promise<T>
```

The exact API can differ, but the architectural constraints should hold:
- stage IDs remain canonical `GenerationStage` values
- emission and duration measurement live in one shared implementation
- structure and character pipelines use the shared helper directly
- the helper remains intentionally small rather than expanding into a generic multi-step framework without evidence
- `kernel-stage-runner` and engine pipelines stay on their local seams for now unless reassessment during implementation proves otherwise

## Files to Touch

- `tickets/STOARCGEN-020-generation-stage-runner-consolidation.md` — corrected assumptions and narrowed scope
- `src/engine/generation-pipeline-helpers.ts` — add the shared stage execution helper next to `emitGenerationStage(...)`
- `src/llm/structure-generator.ts` — remove the local `runStructureStage()` wrapper and delegate to the shared helper
- `src/llm/character-stage-runner.ts` — replace inlined stage start/completed sequencing with the shared helper
- Targeted unit tests covering the helper and the migrated pipelines

Do not touch `src/llm/kernel-stage-runner.ts` in this ticket unless implementation discovers a concrete, low-risk win that preserves its logging/error semantics without widening scope.

## Detailed Changes

### 1. Introduce a canonical single-stage runner

Add a shared helper that:
- accepts `GenerationStageCallback`
- emits `started`
- runs the work
- emits `completed`
- records `durationMs`

The helper should be generic and usable from both engine and LLM-layer pipelines, but the initial migration target is only the two LLM orchestrators that already share the same lifecycle pattern.

### 2. Keep stage mapping local, but move lifecycle bookkeeping out

Pipelines should keep stage mapping next to their domain steps, but should stop owning the repeated timing/emission wrapper themselves.

For example:
- structure pipeline:
  - `DESIGNING_ARCHITECTURE`
  - `GENERATING_MILESTONES`
  - `VALIDATING_STRUCTURE`
- character development pipeline:
  - `GENERATING_CHAR_KERNEL`
  - `GENERATING_CHAR_TRIDIMENSIONAL`
  - `GENERATING_CHAR_AGENCY`
  - `GENERATING_CHAR_RELATIONSHIPS`
  - `GENERATING_CHAR_PRESENTATION`

### 3. Preserve existing architectural boundaries

Do not merge unrelated concerns into the stage runner:
- OpenRouter HTTP execution stays in `llm-stage-runner.ts`
- model fallback and retry stay where they are
- prompt logging stays where it is
- progress persistence stays in `src/server/services/generation-progress.ts`
- kernel-stage logging/failure logging stays in `src/llm/kernel-stage-runner.ts`
- engine-local retry/partial-completion orchestration stays in the engine pipelines that currently own it

This ticket is about removing one duplicated lifecycle seam, not about broad pipeline unification.

### 4. Avoid aliasing or backward-compatibility seams

Do not introduce duplicate stage names, alternate emitter APIs, or compatibility wrappers that keep the old fragmented patterns alive.

If a pipeline is migrated in this ticket, it should use the canonical shared seam directly.

## Out of Scope

- New generation stage IDs
- UI phrase/display-name changes
- `runGenerationStages(...)` or any larger stage pipeline framework
- Consolidating `kernel-stage-runner` logging/transport concerns into the same helper
- Rewriting engine pipelines that emit stages for materially different lifecycle reasons
- Refactoring retry/fallback/logging into the new seam
- Reworking progress storage or route payloads

## Acceptance Criteria

### Functional

- `structure-generator` and `character-stage-runner` use the same shared generation-stage helper.
- The local `runStructureStage()` wrapper is removed.
- `character-stage-runner` no longer inlines repeated `started`/`completed` emission around each stage implementation.
- Completed events for migrated pipelines include measured `durationMs`.
- No canonical stage IDs change as part of this ticket.
- `kernel-stage-runner` remains unchanged unless implementation proves a surgical, architecture-improving reuse with no abstraction creep.

### Tests that should pass or be added

- Add direct unit coverage for the shared stage helper.
- Update structure progress-stage tests to verify stage emission still occurs in order with `durationMs`.
- Update character-stage runner tests to verify stage emission still occurs in the same order and now includes `durationMs` on completion.
- `npm run typecheck` passes.
- `npm run lint` passes.

## Why This Is Better Architecture

This change improves the codebase because it removes duplicated lifecycle policy without collapsing unrelated boundaries.

It is more robust:
- one canonical place defines how a migrated pipeline emits start/completed events and measures duration

It is more extensible:
- future stageful pipelines can adopt the helper when they truly match this lifecycle, instead of copying the wrapper or being forced into an oversized framework

It is cleaner:
- structure and character orchestrators focus on sequencing and data dependencies, not observability boilerplate

It is also a better long-term architecture than the original broader proposal because it avoids a false abstraction. Forcing kernel and engine pipelines into the same seam right now would mix fundamentally different concerns and make the design less honest, not more reusable.

## Notes

- I could not find `tickets/README.md` in the current workspace, so this ticket follows the active `tickets/` format already present in the repository.

## Outcome

- Completion date: 2026-03-14
- What actually changed:
  - Added `runGenerationStage(...)` to `src/engine/generation-pipeline-helpers.ts` as the canonical thin lifecycle wrapper for a single generation stage.
  - `src/llm/structure-generator.ts` now uses the shared helper instead of its private `runStructureStage()` wrapper.
  - `src/llm/character-stage-runner.ts` now uses the shared helper for each stage execution, so completed events carry measured `durationMs`.
  - Added focused unit coverage for the shared helper and updated the structure and character progress tests to reflect the consolidated lifecycle behavior.
- Deviations from the original plan:
  - `src/llm/kernel-stage-runner.ts` was intentionally left unchanged after reassessment because its local seam also owns logging/failure behavior and does not cleanly fit the narrower helper without forcing a worse abstraction.
  - No engine pipelines were migrated in this ticket because they are not all duplicating the same lifecycle problem.
- Verification:
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/engine/generation-pipeline-helpers.test.ts test/unit/llm/structure-generator-progress.test.ts test/unit/llm/character-stage-runner.test.ts`
  - `npm run typecheck`
  - `npm run lint`
