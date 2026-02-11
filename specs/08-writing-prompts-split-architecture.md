**Status**: Draft

# Spec 08: Writing Prompt Split Architecture (Breaking Change)

## Objective

Replace the current continuation/opening generation flow with a strict three-step pipeline:

1. `Page Planner` (LLM): plans scene intent and proposed state transitions
2. `Page Writer` (LLM): writes narrative and player choices only
3. `State Reconciler` (deterministic code): validates, deduplicates, and finalizes state deltas

This is a breaking architecture change with no legacy fallback path.

## Required Decisions (Locked)

1. No phased rollout and no backward compatibility shim.
2. Writer output must not include state add/remove arrays.
3. Reconciliation scope is full state: threats, constraints, threads, inventory, health, character state, canon.
4. Reconciler is deterministic and non-LLM.
5. If planner guidance conflicts with authoritative current structured state, structured state wins.
6. Prompt reports in `reports/*` are removed from maintenance scope and no longer treated as source of truth.

## Current vs Target Flow

Current:
- `generateOpeningPage()` / `generateWriterPage()` returns creative + state mutations in one writer payload.

Target:
- `generatePagePlan()` -> `generatePageWriterOutput(plan)` -> `reconcileState(plan, writerOutput, currentState)`.

## Type-Level Contract Changes

### New interfaces in `src/llm/types.ts`

- `PagePlan`
- `PagePlanContext` (opening/continuation variants)
- `PageWriterResult` (creative-only)
- `StateReconciliationResult`
- `FinalPageGenerationResult = PageWriterResult + StateReconciliationResult`

### Existing interfaces to retire or narrow

- Narrow `WriterResult` into creative-only shape or replace with `PageWriterResult`.
- Keep `ContinuationGenerationResult` as the engine-facing final type, now assembled from writer + reconciler + analyst.

## File/Module Changes

### LLM orchestration

- Add `src/llm/page-planner-generation.ts`
- Add `src/llm/schemas/page-planner-schema.ts`
- Add `src/llm/schemas/page-planner-validation-schema.ts`
- Add `src/llm/schemas/page-planner-response-transformer.ts`
- Add `src/llm/client.ts` exports:
  - `generatePagePlan()`
  - `generatePageWriterOutput()`

### Prompt layer

- Add `src/llm/prompts/page-planner-prompt.ts`
- Refactor `src/llm/prompts/opening-prompt.ts` and `src/llm/prompts/continuation-prompt.ts` to include `PagePlan` input and remove instructions that writer owns state mutation.
- Update `src/llm/prompts/sections/shared/state-tracking.ts` so state mutation instructions move to planner/reconciler context, not writer context.

### Engine

- Update `src/engine/page-service.ts`:
  - First page path: planner -> writer -> reconciler -> page build
  - Continuation path: planner -> writer -> reconciler -> analyst -> merge

### Reconciler

- Add `src/engine/state-reconciler.ts` (pure deterministic module)
- Add `src/engine/state-reconciler-types.ts`

## Non-Goals

1. No UX changes to play page.
2. No storage format redesign beyond required payload shape updates.
3. No model-provider changes.

## Acceptance Criteria

1. Opening and continuation generation run through planner+writer+reconciler in all code paths.
2. Writer payload contains no state add/remove arrays.
3. Final persisted page still contains complete state changes and remains replay-safe.
4. Existing branch isolation and page immutability invariants remain intact.
5. No legacy writer-only fallback path remains in code.

## Required Tests

1. `test/unit/engine/page-service*.test.ts`: new orchestration order and data handoff.
2. `test/unit/llm/*planner*.test.ts`: schema validation and transformation.
3. `test/unit/engine/state-reconciler*.test.ts`: deterministic reconciliation behavior.
4. `test/integration/*generation*.test.ts`: end-to-end opening and continuation with planner+writer+reconciler pipeline.
