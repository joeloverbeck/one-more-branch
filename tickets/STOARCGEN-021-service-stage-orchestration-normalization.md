# STOARCGEN-021: Service Stage Orchestration Normalization

**Status**: TODO
**Depends on**: STOARCGEN-020
**Blocks**: None

## Summary

Normalize service-layer generation progress orchestration so concept, evolution, content, worldbuilding, and character-web services stop hand-emitting stage events inline.

The remaining service layer is still architecturally uneven:
- some services emit raw `onGenerationStage?.({...})` events directly
- some start multiple stages before any real work begins
- some complete a different stage than the one they started
- most do not attach `durationMs`

This ticket should introduce a clean service-layer orchestration seam rather than letting each service keep inventing its own stage lifecycle.

## Reassessed State

What is true in the current code:
- `src/server/services/concept-service.ts` and `src/server/services/evolution-service.ts` emit stage events manually and currently contain an obvious lifecycle bug:
  - they emit `ANALYZING_SPECIFICITY` as `started`
  - then emit `GENERATING_SCENARIOS` as `completed`
- `src/server/services/content-service.ts` repeats the same start/await/complete pattern for each one-shot and pipeline stage.
- `src/services/worldbuilding-service.ts` and `src/services/character-web-service.ts` each carry their own local stage-emission style.
- the current helper set in `src/engine/generation-pipeline-helpers.ts` is still too low-level for these services, because they need a declarative stage plan rather than ad hoc callback calls.

What should not happen:
- do not patch every service one-off forever
- do not introduce aliases or compatibility shims for incorrect stage pairs
- do not push service-specific sequencing into routes or controllers

## Problem

The current service layer is not using a canonical orchestration model for stageful flows.

That creates four concrete risks:
- **Incorrect progress semantics**: stage start/completion pairs can drift or be mistyped
- **Missing durations**: progress persistence cannot reliably capture stage timing
- **Duplicated sequencing logic**: every service reimplements the same wrapper shape
- **Harder extension**: new service pipelines will copy whichever local pattern happens to be nearby

## Desired Architecture

Service-layer multi-stage flows should declare a stage plan and execute it through a shared service-oriented helper.

That seam should support:
- single-stage steps with automatic `started` / `completed` / `durationMs`
- ordered multi-stage pipelines
- explicit no-op or marker stages only when they represent real work
- narrow ownership: orchestration only, not LLM transport, logging, or persistence

Illustrative shape:

```typescript
interface ServiceStageStep<T> {
  readonly stage: GenerationStage;
  readonly run: () => Promise<T>;
}

async function runGenerationStageSequence<T extends readonly unknown[]>(
  onGenerationStage: GenerationStageCallback | undefined,
  steps: readonly ServiceStageStep<unknown>[]
): Promise<T>
```

The exact API may differ, but the outcome should be:
- one truthful stage lifecycle model for service pipelines
- no raw hand-written progress emission in the migrated services

## Files to Touch

- `src/engine/generation-pipeline-helpers.ts` or a new adjacent shared module if separation is cleaner
- `src/server/services/concept-service.ts`
- `src/server/services/evolution-service.ts`
- `src/server/services/content-service.ts`
- `src/services/worldbuilding-service.ts`
- `src/services/character-web-service.ts`
- related unit tests for each migrated service

## Detailed Changes

### 1. Add a service-stage sequence seam

Introduce a shared orchestration helper for ordered service-stage execution.

Constraints:
- it should build on the existing single-stage helper from `STOARCGEN-020`
- it should remain declarative and thin
- it should not absorb service business logic

### 2. Migrate concept and evolution services first

These are the highest-priority migrations because they currently expose the clearest correctness bug.

Required fixes:
- `ANALYZING_SPECIFICITY` must complete as `ANALYZING_SPECIFICITY`
- `GENERATING_SCENARIOS` should only exist if there is an actual scenario-generation step in the pipeline
- completion events should include measured `durationMs`

If reassessment shows `GENERATING_SCENARIOS` is stale metadata rather than a real stage, remove its use rather than preserving an inaccurate event.

### 3. Migrate content, worldbuilding, and character-web services

Replace direct inline event emission with the shared seam.

Do not rewrite service public contracts.
Do not change route payload shapes.

### 4. Tighten stage vocabulary ownership

After migration:
- no service should complete a stage it never started
- no service should start speculative stages before the underlying work exists
- stage names must reflect actual work boundaries

## Out of Scope

- LLM transport refactors
- Route-layer progress persistence changes
- UI progress rendering changes
- Engine retry pipelines
- Analyst parallel stage orchestration

## Acceptance Criteria

### Functional

- Concept, evolution, content, worldbuilding, and character-web services no longer hand-emit raw progress lifecycle events inline.
- Concept and evolution flows no longer emit mismatched `ANALYZING_SPECIFICITY` / `GENERATING_SCENARIOS` pairs.
- Migrated service-stage completion events include `durationMs`.
- Public service return contracts remain unchanged.

### Tests that should pass or be added

- Update `test/unit/server/services/concept-service.test.ts` to verify stage order, correct stage pairing, and `durationMs`
- Update `test/unit/server/services/evolution-service.test.ts` to verify stage order, correct stage pairing, and `durationMs`
- Update `test/unit/server/services/content-service.test.ts` to verify pipeline and one-shot stage sequencing through the shared seam
- Add or update focused unit tests for `worldbuilding-service` and `character-web-service` stage emission
- Add direct unit coverage for any new service-stage sequence helper
- `npm run typecheck` passes
- `npm run lint` passes

## Why This Is Better Architecture

This change fixes a real correctness bug and removes repeated orchestration boilerplate at the same time.

It is more robust:
- one canonical service-stage seam governs event pairing and timing

It is more extensible:
- future service pipelines can declare stage steps instead of writing raw callback emissions

It is cleaner:
- service modules focus on input normalization and dependency calls, not progress bookkeeping
