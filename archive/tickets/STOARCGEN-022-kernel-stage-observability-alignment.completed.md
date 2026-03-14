# STOARCGEN-022: Kernel Stage Observability Alignment

**Status**: COMPLETED
**Depends on**: STOARCGEN-020
**Blocks**: None

## Summary

Align `src/llm/kernel-stage-runner.ts` with the canonical progress-event contract without flattening away its logging and failure semantics.

This is intentionally not a generic runner ticket. The problem here is narrower: kernel generation currently has two observability channels that disagree.

## Reassessed State

What is true in the current code:
- `runKernelStage()` uses a local helper, `executeKernelStage(...)`, that emits callback progress events and also logs start/completed/failed stage entries.
- `src/engine/generation-pipeline-helpers.ts` already exposes the canonical thin helper, `runGenerationStage(...)`, for stage seams that only need `started` / `completed` plus `durationMs`.
- logger completion entries include `durationMs`
- callback completion events do not include `durationMs`
- failed stages log an error but do not surface a failure event through the callback contract
- `GenerationStageEvent` in `src/engine/types.ts` still intentionally supports only `status: 'started' | 'completed'`

This is not the same architectural shape as STOARCGEN-020:
- the kernel runner owns logging, unlike the thin helper used by structure and character pipelines
- collapsing it directly into the same helper would either split timing ownership across two seams or bloat the helper into a false abstraction
- the remaining service-level kernel lifecycle normalization is already tracked separately in `tickets/STOARCGEN-024-kernel-evolution-service-stage-normalization.md`

## Problem

Kernel-stage observability is internally inconsistent.

Concrete risks:
- consumers that rely on `GenerationStageCallback` do not receive duration data that already exists
- tests and debugging have to infer stage timing from logs instead of the canonical progress channel
- future kernel work is likely to keep adding logic to the local helper because there is no explicit contract for what it owns

## Desired Architecture

`kernel-stage-runner` should remain a specialized orchestrator, but its callback semantics should align with the canonical generation-stage event model.

The local seam should explicitly own:
- stage start/completion callback emission
- duration measurement
- stage-scoped logging
- failure logging

It should not own:
- alternate callback contracts
- ad hoc per-call event shapes
- hidden divergence between logs and progress events
- delegation to `runGenerationStage(...)` if that would make callback timing and log timing come from different sources

## Files to Touch

- `tickets/STOARCGEN-022-kernel-stage-observability-alignment.md`
- `src/llm/kernel-stage-runner.ts`
- `test/unit/llm/kernel-stage-runner.test.ts`

No service-layer files should change in this ticket. That work belongs to STOARCGEN-024.

## Detailed Changes

### 1. Make callback completion events carry duration

When `executeKernelStage(...)` completes successfully, emit:
- `stage`
- `status: 'completed'`
- `attempt`
- `durationMs`

The callback channel should expose the same timing truth that logs already expose.

### 2. Reassess failure signaling

Decide whether kernel-stage failure should remain log-only or emit a canonical progress failure signal through a separate seam.

If the current global `GenerationStageEvent` contract intentionally supports only `started` / `completed`, keep failure logging local and document in the ticket outcome that no failure-event contract change was made.

Do not invent a one-off kernel-only failure event shape.

### 3. Make helper ownership explicit

Refactor `executeKernelStage(...)` only enough to make the ownership boundary clear:
- progress callback semantics
- logging semantics
- timing semantics

Do not fold it into a generic helper unless implementation proves there is a clean composition point with the existing thin stage helper.

## Out of Scope

- Full migration of kernel stage execution onto the generic helper from STOARCGEN-020
- LLM transport changes
- Route/service API changes
- New generation stage IDs

## Acceptance Criteria

### Functional

- Kernel-stage completion callback events include `durationMs`
- Logger output remains unchanged in meaning and coverage
- No public API contract of `runKernelStage()` changes beyond more complete progress event data
- `kernel-stage-runner` keeps owning its combined callback/logging/timing seam instead of being forced onto `runGenerationStage(...)`

### Tests that should pass or be added

- Update `test/unit/llm/kernel-stage-runner.test.ts` to assert `durationMs` on completion callback events
- Keep coverage for failure logging when ideation fails
- Add a focused test that logger duration and callback duration remain aligned for successful stages
- `npm run typecheck` passes
- `npm run lint` passes

## Why This Is Better Architecture

This brings the kernel pipeline into semantic alignment with the canonical progress contract without pretending it is architecturally identical to the thinner stage helpers.

It is more honest:
- kernel keeps its specialized logging seam

It is more robust:
- progress consumers receive the same timing information logs already had

It is more extensible:
- future kernel orchestration changes have a clearer contract boundary instead of hidden drift between observability channels

## Outcome

- Completion date: 2026-03-14
- What actually changed:
  - `src/llm/kernel-stage-runner.ts` now computes one successful-stage `durationMs` value and emits it through both the completion log entry and the completion callback event.
  - `test/unit/llm/kernel-stage-runner.test.ts` now verifies completion events include `durationMs`, callback/log durations stay aligned, and failures still only emit the started callback event while remaining log-driven for failure reporting.
- Deviations from the original plan:
  - No failure-event contract was added because `GenerationStageEvent` still intentionally supports only `started` / `completed`, and adding a kernel-only failure shape would worsen the architecture.
  - `runGenerationStage(...)` was intentionally not reused here because it would split timing ownership away from the specialized kernel logging seam instead of simplifying it.
- Verification:
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/kernel-stage-runner.test.ts`
  - `npm run typecheck`
  - `npm run lint`
