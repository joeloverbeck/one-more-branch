# STOARCGEN-024: Kernel Evolution Service Stage Normalization

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: STOARCGEN-020, archive/tickets/STOARCGEN-021-service-stage-orchestration-normalization.completed.md, archive/tickets/STOKERSTAANDCONENR-04-kernel-evaluator-and-runner.md

## Problem

`src/server/services/kernel-evolution-service.ts` still hand-emits generation stage lifecycle events inline even though the canonical single-stage seam already exists in `src/engine/generation-pipeline-helpers.ts`.

That leaves one remaining service-level lifecycle smell in this area:
- the service owns real `EVOLVING_KERNELS` and `EVALUATING_KERNELS` work boundaries
- it emits `started` / `completed` manually instead of using `runGenerationStage(...)`
- completion events therefore omit `durationMs`
- future edits to this service can drift away from the canonical event contract because the lifecycle policy is still duplicated locally

This is not a user-facing correctness break today, but it is an architectural inconsistency in the same class that STOARCGEN-021 just removed from the other service-owned pipelines.

## Assumption Reassessment (2026-03-14)

1. Current code check:
   `src/server/services/kernel-evolution-service.ts` is a thin orchestration service over `evolveKernels(...)` and `evaluateKernels(...)`, and it still emits raw `onGenerationStage?.({...})` events inline for `EVOLVING_KERNELS` and `EVALUATING_KERNELS`.
2. Current ticket check:
   No active ticket in `tickets/` currently owns this service seam. `tickets/STOARCGEN-022-kernel-stage-observability-alignment.md` is about `src/llm/kernel-stage-runner.ts`, which has a different specialized logging boundary.
3. Scope correction:
   This should not be folded into STOARCGEN-022. The clean fix is a separate small service-layer normalization ticket that mirrors the architectural conclusion from STOARCGEN-021: reuse `runGenerationStage(...)` for truthful service-owned stages and avoid inventing another abstraction.
4. Downstream impact correction:
   Route progress handling already accepts optional `durationMs` generically through `createRouteGenerationProgress(...)`, and there is no current route or integration test that depends on the old kernel-evolution completion payload shape. This ticket should stay service-local unless implementation proves otherwise.
5. Test coverage correction:
   `test/unit/server/services/kernel-evolution-service.test.ts` currently verifies stage ordering, but it does not yet assert `durationMs` on completion events or pin deterministic duration values. The missing coverage is in the service unit test, not in route/integration suites.

## Architecture Check

1. Reusing `runGenerationStage(...)` is cleaner than keeping inline callback emission because this service has the exact thin lifecycle shape the helper was designed for: start, run async work, complete with duration.
2. This should stay a narrow service-layer cleanup. Do not add aliases, compatibility shims, or a new kernel-specific stage runner abstraction. `kernel-stage-runner` and `kernel-evolution-service` are different boundaries and should remain separate unless a later ticket proves a cleaner shared seam.
3. The current architecture after STOARCGEN-021 already has a stable answer for service-owned stage orchestration: compose `runGenerationStage(...)` locally per real boundary. Preserving one remaining inline exception is strictly worse than converging on that seam.

## What to Change

### 1. Normalize the service-owned kernel evolution stages

Update `createKernelEvolutionService().evolveKernels(...)` so:
- `EVOLVING_KERNELS` runs through `runGenerationStage(...)`
- `EVALUATING_KERNELS` runs through `runGenerationStage(...)`
- completion events include `durationMs`

Keep validation and return contracts unchanged.

### 2. Add focused service-level coverage

Update or add unit tests that verify:
- stage ordering remains `EVOLVING_KERNELS started -> completed -> EVALUATING_KERNELS started -> completed`
- completed events include `durationMs`
- deterministic duration values can be asserted by controlling `Date.now()` in the service test
- evaluator failures still fail fast and do not change downstream behavior

### 3. Reassess route-level impact only if needed

Current reassessment shows no route or integration test updates are required. Only widen beyond the service/unit-test boundary if implementation reveals a real assertion on exact completion payload shape.

## Files to Touch

- `src/server/services/kernel-evolution-service.ts` (modify)
- `test/unit/server/services/kernel-evolution-service.test.ts` (modify)

## Out of Scope

- `src/llm/kernel-stage-runner.ts` logging/observability alignment work from `STOARCGEN-022`
- New generation stage IDs
- Route contract changes
- UI phrase/display-name changes
- Generic multi-stage service orchestration abstractions

## Acceptance Criteria

### Tests That Must Pass

1. Kernel evolution service tests verify canonical stage ordering with `durationMs` on completion.
2. Kernel evolution service tests verify deterministic completion durations when `Date.now()` is controlled.
3. Kernel evolution service tests still verify fail-fast behavior when evaluation fails.
4. Existing suite: `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/services/kernel-evolution-service.test.ts`

### Invariants

1. `kernel-evolution-service` must emit truthful service-owned stage boundaries only; no stage may complete unless that same stage started first.
2. Public return contracts and route payload shapes must remain unchanged; only progress-event completeness improves.

## Test Plan

### New/Modified Tests

1. `test/unit/server/services/kernel-evolution-service.test.ts` — verify canonical ordering, completion `durationMs`, deterministic duration values under controlled time, and unchanged fail-fast semantics.

### Commands

1. `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/services/kernel-evolution-service.test.ts`
2. `npm run typecheck`
3. `npm run lint`

## Outcome

- Completion date: 2026-03-14
- What actually changed:
  - `src/server/services/kernel-evolution-service.ts` now reuses `runGenerationStage(...)` for the real service-owned `EVOLVING_KERNELS` and `EVALUATING_KERNELS` boundaries.
  - Completion events now include `durationMs` without changing the service return contract or route payload shape.
  - `test/unit/server/services/kernel-evolution-service.test.ts` now verifies completion-event durations and deterministic timing under a controlled clock, in addition to the existing stage-order and fail-fast assertions.
- Deviations from the revised plan:
  - No route or integration tests required updates after reassessment because downstream progress handling already accepted optional `durationMs` and did not assert the old completion payload shape.
- Verification:
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/services/kernel-evolution-service.test.ts`
  - `npm run typecheck`
  - `npm run lint`
