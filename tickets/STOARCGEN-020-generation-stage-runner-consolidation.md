# STOARCGEN-020: Generation Stage Runner Consolidation

**Status**: TODO
**Depends on**: STOARCGEN-012, STOARCGEN-019
**Blocks**: None

## Summary

Consolidate generation-stage mapping and progress emission into a shared runner/seam so pipelines stop re-implementing the same stage lifecycle behavior in multiple places.

Today, the codebase has the right stage vocabulary, but the orchestration is still fragmented:
- `src/llm/structure-generator.ts` manually maps internal pipeline steps to generation stages and emits progress events.
- `src/llm/character-stage-runner.ts` keeps its own stage mapping table and emits progress directly.
- `src/llm/kernel-stage-runner.ts` and several engine pipelines accept stage callbacks through slightly different local seams.
- `src/engine/generation-pipeline-helpers.ts` provides only a low-level emitter, so every pipeline still decides timing, ordering, and mapping for itself.

This is workable, but it is not ideal architecture. The same concerns are duplicated:
- which internal step maps to which canonical `GenerationStage`
- how start/completed events are paired
- how duration is measured
- how future pipelines should expose stage observability without inventing new local conventions

## Problem

The system now has canonical stage IDs, but not a canonical way to run stageful pipelines.

That creates three long-term risks:
- **Drift**: different pipelines can emit stages inconsistently or skip duration measurement.
- **Coupling**: each pipeline mixes domain work with observability bookkeeping.
- **Extension cost**: every new multi-step generation flow must reinvent the same wrapper pattern.

The ideal architecture is:
- domain pipelines define ordered internal steps,
- a shared generation-stage runner maps those steps to canonical `GenerationStage` IDs,
- the runner emits start/completed events and durations consistently,
- callers supply the callback once and do not manually manage stage timing.

## Recommended Direction

Introduce a small shared abstraction for stageful pipelines.

Example shape:

```typescript
interface StageStep<T> {
  readonly stage: GenerationStage;
  readonly run: () => Promise<T>;
}

async function runGenerationStage<T>(
  onGenerationStage: GenerationStageCallback | undefined,
  step: StageStep<T>,
  attempt?: number
): Promise<T>

async function runGenerationStages<TContext>(
  onGenerationStage: GenerationStageCallback | undefined,
  steps: readonly StageStep<unknown>[]
): Promise<unknown[]>
```

The exact API can differ, but the architectural constraints should hold:
- pipelines should define their stage sequence declaratively
- emission and duration measurement should live in one shared implementation
- stage IDs should remain canonical `GenerationStage` values
- the abstraction should stay thin and should not absorb unrelated retry/fallback or logging concerns already handled elsewhere

## Files to Touch

- `src/engine/generation-pipeline-helpers.ts` — promote low-level emit helper into a reusable stage runner seam, or extract a dedicated shared module if cleaner
- `src/llm/structure-generator.ts` — replace local `runStructureStage()` with the shared runner
- `src/llm/character-stage-runner.ts` — replace direct `emitGenerationStage()` sequencing with the shared runner
- `src/llm/kernel-stage-runner.ts` — align stage execution with the shared runner if it still uses a local variant
- Any other generation pipeline still duplicating start/completed/duration behavior after implementation

## Detailed Changes

### 1. Introduce a canonical stage runner

Add a shared helper that:
- accepts `GenerationStageCallback`
- emits `started`
- runs the work
- emits `completed`
- records `durationMs`

The helper should be generic and usable from both engine and LLM-layer pipelines.

### 2. Move stage mapping next to step definitions, not ad hoc emission

Pipelines that have explicit internal steps should declare them as stage steps rather than manually calling `emitGenerationStage()`.

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

This ticket is about orchestration consistency, not broad pipeline unification.

### 4. Avoid aliasing or backward-compatibility seams

Do not introduce duplicate stage names, alternate emitter APIs, or compatibility wrappers that keep the old fragmented patterns alive.

If a pipeline is migrated, it should use the canonical shared seam directly.

## Out of Scope

- New generation stage IDs
- UI phrase/display-name changes beyond what shared stage usage requires
- Rewriting all generation pipelines if some are already single-step and not duplicating logic
- Refactoring retry/fallback into the new seam
- Reworking progress storage or route payloads

## Acceptance Criteria

### Functional

- At least the structure and character stage pipelines use the same shared generation-stage runner abstraction.
- Local ad hoc timing/emission wrappers for those migrated pipelines are removed.
- Start/completed event ordering and `durationMs` behavior remain unchanged for migrated pipelines.
- No canonical stage IDs change as part of this ticket.

### Tests that should pass or be added

- Update structure progress-stage tests to verify behavior still passes through the shared runner.
- Update character-stage runner tests to verify stage emission still occurs in the same order with durations where applicable.
- Add direct unit coverage for the shared stage runner helper.
- `npm run typecheck` passes.
- `npm run lint` passes.

## Why This Is Better Architecture

This change improves the codebase because it removes duplicated orchestration policy without collapsing domain boundaries.

It is more robust:
- one canonical place defines how stage events are emitted

It is more extensible:
- new multi-step generation flows can adopt the same seam without inventing another local pattern

It is cleaner:
- pipelines focus on domain sequencing, not observability boilerplate

It also reduces the chance of repeating the exact problem that STOARCGEN-012 had to correct, where the underlying pipeline architecture and the reported stage lifecycle drifted apart.

## Notes

- I could not find `tickets/README.md` in the current workspace, so this ticket follows the active `tickets/` format already present in the repository.
