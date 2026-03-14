# STOARCGEN-018: Consolidate Structured Stage Runner Reuse

**Status**: TODO
**Depends on**: STOARCGEN-011, STOARCGEN-012, STOARCGEN-013
**Blocks**: None

## Summary

Consolidate the duplicated structured-stage LLM orchestration that still exists across structure generation, structure repair, structure rewrite, and adjacent rewrite flows.

The codebase already has `src/llm/llm-stage-runner.ts`, which owns the clean reusable pattern for:
- prompt logging
- stage-model lookup
- max-token lookup
- `withRetry`
- `withModelFallback`
- OpenRouter fetch + response parsing
- raw response capture

But the structure pipeline still duplicates this orchestration in:
- `src/llm/structure-generator.ts`
- `src/llm/structure-validator.ts`
- `src/engine/structure-rewriter.ts`
- likely `src/engine/spine-rewriter.ts` if the abstraction can be reused there without forcing an awkward interface

That duplication is no longer just temporary implementation debt. It is an architectural seam that should be explicit and shared.

## Reassessed Assumptions

- This is distinct from `STOARCGEN-016`.
  - `STOARCGEN-016` owns normalization/defaulting consistency.
  - This ticket owns stage-execution orchestration reuse.
- This is also distinct from `STOARCGEN-017`.
  - `STOARCGEN-017` owns prompt-context rendering reuse.
  - This ticket owns runtime execution reuse.
- `src/llm/llm-stage-runner.ts` already exists and should be the starting point. The right fix is probably to extend or adapt that seam, not introduce a second competing runner.
- Structure generation and rewrite need slightly different parse/combine behavior, so the abstraction must stay narrow and stage-oriented rather than becoming a bloated “universal pipeline framework”.

## Problem

The structure-related flows currently repeat the same low-level stage orchestration:
- `logPrompt(...)`
- OpenRouter request construction
- HTTP error handling
- `readJsonResponse()` / `extractResponseContent()` / `parseMessageJsonContent()`
- `withRetry(...)`
- `withModelFallback(...)`
- `logResponse(...)`

That creates three risks:
- drift in retry/fallback/logging behavior between Call 1, Call 2, Call 3, and rewrite flows
- new rewrite tiers copying the same boilerplate again
- harder testing and maintenance when stage behavior changes

## Desired Architecture

One canonical stage-runner seam should own structured-output stage execution for structure-related flows.

That seam should:
- reuse `src/llm/llm-stage-runner.ts` directly if practical
- or extend it surgically if structure repair / rewrite need one missing capability
- support single-stage and multi-stage structured flows without duplicating the OpenRouter plumbing
- keep stage-specific parsing local to the caller
- keep orchestration policy consistent across generation, repair, and rewrite

## Files to Touch

- `src/llm/llm-stage-runner.ts`
- `src/llm/structure-generator.ts`
- `src/llm/structure-validator.ts`
- `src/engine/structure-rewriter.ts`
- `src/engine/spine-rewriter.ts` only if reassessment shows the runner can be reused cleanly there
- Related tests for the touched modules

## Detailed Changes

### Consolidation target

Refactor structure-related execution paths to route through the shared stage runner instead of hand-rolling fetch/retry/fallback/logging logic.

At minimum:
- `generateMacroArchitecture()` / `generateMilestones()` should stop owning a private `callStructuredStage()`
- structure repair should stop owning a private `callStructuredRepairStage()`
- structure rewrite should stop owning another bespoke structured-output request path if `runLlmStage()` can cover it

### Allowed extension points

If `runLlmStage()` is slightly too narrow, extend it only for concrete needs such as:
- preserving the distinction between `stageModel` and `promptType`
- allowing caller-controlled JSON repair behavior
- supporting a light two-phase combine helper where it reduces duplication rather than obscuring flow

### Constraints

- Do not build a generic “pipeline engine”
- Do not move stage-specific parse logic out of its owning module
- Do not couple runtime structure normalization to the runner abstraction
- Do not introduce alias stages or compatibility forks
- Prefer surgical refactors over broad rewrites

## Out of Scope

- Prompt-content changes
- Structure normalization/defaulting changes (`STOARCGEN-016`)
- Prompt-context rendering reuse (`STOARCGEN-017`)
- UI/progress display changes

## Acceptance Criteria

### Tests that must pass

- Update structure generation tests to confirm behavior is preserved after runner reuse
- Update structure repair / validator tests to confirm repair flow still logs, retries, and falls back correctly
- Update structure rewrite tests if rewrite adopts the shared runner
- Add focused tests for any new `llm-stage-runner.ts` capability introduced here
- `npm run typecheck` passes
- `npm run lint` passes

### Invariants that must remain true

- One canonical structured-stage execution seam for structure generation / repair / rewrite
- Retry/model-fallback/logging behavior remains consistent across those stages
- Stage-specific parsing remains local and explicit
- No new abstraction creep into a generic pipeline framework
