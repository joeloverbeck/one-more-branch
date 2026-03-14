# STOARCGEN-021: Service Stage Orchestration Normalization

**Status**: COMPLETED
**Depends on**: STOARCGEN-020
**Blocks**: None

## Summary

Normalize service-layer generation progress orchestration so the remaining services with local lifecycle bookkeeping stop hand-emitting or half-emitting stage events.

The current service layer is still architecturally uneven, but the problem is narrower than the original framing:
- `concept-service`, `evolution-service`, and `content-service` still emit raw `onGenerationStage?.({...})` events directly
- `worldbuilding-service` only emits `started` events through a local helper and never emits matching completion events or `durationMs`
- `character-web-service` is not fully raw anymore for web generation; it already uses the canonical `emitGenerationStage(...)` helper, and character stage generation delegates lifecycle ownership into `character-stage-runner`
- the clearest correctness bug remains the concept/evolution verification lifecycle, which starts `ANALYZING_SPECIFICITY` and completes `GENERATING_SCENARIOS`

This ticket should normalize truthful service-owned stage boundaries by reusing the existing canonical `runGenerationStage(...)` seam rather than introducing a new generic sequence framework.

## Reassessed State

What is true in the current code:
- `src/server/services/concept-service.ts` and `src/server/services/evolution-service.ts` emit stage events manually and currently contain an obvious lifecycle bug:
  - they emit `ANALYZING_SPECIFICITY` as `started`
  - then emit `GENERATING_SCENARIOS` as `completed`
- `src/server/services/content-service.ts` repeats the same start/await/complete pattern for each one-shot and pipeline stage.
- `src/services/worldbuilding-service.ts` uses a local `emitStage(...)` helper that only emits `started`, so its service-owned stages never complete and never record `durationMs`.
- `src/services/character-web-service.ts` only partially fits the original framing:
  - `generateWeb()` already uses shared engine-level emission primitives
  - `generateCharacterStage()` and `regenerateCharacterStage()` do not own lifecycle bookkeeping locally; they pass the callback to `character-stage-runner`, which already uses `runGenerationStage(...)`
- `src/engine/generation-pipeline-helpers.ts` already contains the right thin abstraction, `runGenerationStage(...)`, for truthful service-owned stages.

What should not happen:
- do not patch every service one-off forever
- do not introduce aliases or compatibility shims for incorrect stage pairs
- do not push service-specific sequencing into routes or controllers
- do not introduce a second higher-level orchestration abstraction unless the existing helper proves insufficient

## Problem

The current service layer is not consistently using the canonical single-stage orchestration seam for stageful flows.

That creates four concrete risks:
- **Incorrect progress semantics**: stage start/completion pairs can drift or be mistyped
- **Missing durations**: progress persistence cannot reliably capture stage timing
- **Duplicated lifecycle bookkeeping**: several services reimplement the same wrapper shape
- **Harder extension**: new service pipelines will copy whichever local pattern happens to be nearby

## Desired Architecture

Service-layer stageful flows should reuse the existing canonical helper for each real stage boundary they actually own.

That seam should support:
- single-stage work with automatic `started` / `completed` / `durationMs`
- ordered pipelines by composing multiple local `await runGenerationStage(...)` calls
- truthful stage ownership: only emit a stage when the service itself owns that work boundary
- narrow ownership: lifecycle only, not LLM transport, logging, or persistence

Architectural conclusion:
- use `runGenerationStage(...)` as the shared lifecycle seam
- keep sequencing local to each service
- avoid adding `runGenerationStageSequence(...)` unless a future ticket shows a real need for declarative plans across multiple services

## Files to Touch

- `src/server/services/concept-service.ts`
- `src/server/services/evolution-service.ts`
- `src/server/services/content-service.ts`
- `src/services/worldbuilding-service.ts`
- `src/services/character-web-service.ts`
- related unit tests for each migrated service

## Detailed Changes

### 1. Reuse the canonical single-stage seam

Migrate service-owned work boundaries onto `runGenerationStage(...)`.

Constraints:
- it should reuse the existing helper from `STOARCGEN-020`
- it should remain thin
- it should not absorb service business logic
- it should not create a second declarative sequencing layer without evidence

### 2. Migrate concept and evolution services first

These are the highest-priority migrations because they currently expose the clearest correctness bug.

Required fixes:
- `ANALYZING_SPECIFICITY` must complete as `ANALYZING_SPECIFICITY`
- `GENERATING_SCENARIOS` should only exist if there is an actual scenario-generation step in the pipeline
- completion events should include measured `durationMs`

If reassessment shows `GENERATING_SCENARIOS` is stale metadata rather than a real stage, remove its use rather than preserving an inaccurate event.

### 3. Migrate content, worldbuilding, and character-web service-owned stage boundaries

Replace direct inline event emission with the shared seam where the service itself owns the work.

Do not rewrite service public contracts.
Do not change route payload shapes.
Do not migrate character stage generation paths that already delegate to `character-stage-runner`; only normalize the service-owned `generateWeb()` lifecycle if any cleanup is still warranted there.

### 4. Tighten stage vocabulary ownership

After migration:
- no service should complete a stage it never started
- no service should start speculative stages before the underlying work exists
- stage names must reflect actual work boundaries
- worldbuilding stages should complete if the service successfully finishes that boundary

## Out of Scope

- LLM transport refactors
- Route-layer progress persistence changes
- UI progress rendering changes
- Engine retry pipelines
- Analyst parallel stage orchestration
- Introducing a new `runGenerationStageSequence(...)` abstraction
- Refactoring `character-stage-runner` again; it already sits on the canonical helper from `STOARCGEN-020`

## Acceptance Criteria

### Functional

- Concept, evolution, content, and worldbuilding services no longer hand-emit or half-emit progress lifecycle events inline.
- `character-web-service` no longer contains avoidable local lifecycle duplication for `generateWeb()`, but character stage generation remains delegated to `character-stage-runner`.
- Concept and evolution flows no longer emit mismatched `ANALYZING_SPECIFICITY` / `GENERATING_SCENARIOS` pairs.
- Migrated service-stage completion events include `durationMs`.
- Public service return contracts remain unchanged.

### Tests that should pass or be added

- Update `test/unit/server/services/concept-service.test.ts` to verify stage order, correct stage pairing, and `durationMs`
- Update `test/unit/server/services/evolution-service.test.ts` to verify stage order, correct stage pairing, and `durationMs`
- Update `test/unit/server/services/content-service.test.ts` to verify pipeline and one-shot stage sequencing through the shared seam
- Add or update focused unit tests for `worldbuilding-service` and `character-web-service` stage emission where those services still own lifecycle behavior
- Reuse the existing helper tests rather than adding a second sequence-helper test surface
- `npm run typecheck` passes
- `npm run lint` passes

## Why This Is Better Architecture

This change fixes a real correctness bug and removes repeated lifecycle boilerplate at the same time.

It is more robust:
- one canonical service-stage seam governs event pairing and timing

It is more extensible:
- future service pipelines can compose the existing canonical helper instead of writing raw callback emissions or inventing a parallel framework

It is cleaner:
- service modules focus on sequencing and dependency calls, not stage bookkeeping

It is also a better long-term architecture than the original proposal:
- reusing the existing canonical seam is cleaner and more honest than layering a new generic stage-sequence abstraction over already-local service sequencing

## Outcome

- Completion date: 2026-03-14
- What actually changed:
  - `concept-service` now orchestrates real seeding, architecting, engineering, evaluation, and specificity-analysis stages through `runGenerationStage(...)` instead of starting speculative stages and completing mismatched ones.
  - `evolution-service` now orchestrates real evolved-seed, architecting, engineering, evaluation, and specificity-analysis stages through `runGenerationStage(...)` with truthful completion events.
  - `content-service`, `worldbuilding-service`, and `character-web-service` now reuse the canonical helper for the service-owned stage boundaries they actually control, so completion events carry `durationMs`.
  - Added and updated unit/integration coverage for corrected stage pairing, duration emission, and the previously untested worldbuilding lifecycle.
- Deviations from the revised plan:
  - `character-stage-runner` remained unchanged because it already owned stage lifecycle through the canonical helper.
  - `kernel-evolution-service` was left untouched even though it still uses inline lifecycle emission; it has the same general smell, but there was no correctness bug there and widening this ticket would have made the change less surgical.
- Verification:
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/services/concept-service.test.ts test/unit/server/services/evolution-service.test.ts test/unit/server/services/content-service.test.ts test/unit/server/services/character-web-service.test.ts test/unit/services/worldbuilding-service.test.ts test/unit/engine/generation-pipeline-helpers.test.ts test/integration/llm/concept-pipeline.test.ts test/integration/llm/evolution-pipeline.test.ts`
  - `npm run typecheck`
  - `npm run lint`
