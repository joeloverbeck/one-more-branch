# STOARCGEN-018: Consolidate Structured Stage Runner Reuse

**Status**: COMPLETED
**Depends on**: STOARCGEN-011, STOARCGEN-012, STOARCGEN-013
**Blocks**: None

## Summary

Consolidate the duplicated structured-stage LLM orchestration that still exists across structure generation, structure repair, and structure rewrite.

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

That duplication is no longer just temporary implementation debt. It is an architectural seam that should be explicit and shared.

## Reassessed Assumptions

- There is no matching `specs/STOARCGEN-018*` document in the repository. This ticket remains the implementation source of truth; `CLAUDE.md` and the existing structure prompt/tests are reference context only.
- This is distinct from `STOARCGEN-016`.
  - `STOARCGEN-016` owns normalization/defaulting consistency.
  - This ticket owns stage-execution orchestration reuse.
- This is also distinct from `STOARCGEN-017`.
  - `STOARCGEN-017` owns prompt-context rendering reuse.
  - This ticket owns runtime execution reuse.
- `src/llm/llm-stage-runner.ts` already exists and should be the starting point. The right fix is probably to extend or adapt that seam, not introduce a second competing runner.
- `src/llm/llm-stage-runner.ts` already supports separate `stageModel` and `promptType`, and already allows caller-controlled JSON repair via `allowJsonRepair`. Those are not missing capabilities that justify a second runner.
- `src/llm/structure-generator.ts` and `src/llm/structure-validator.ts` still hand-roll the same retry/fallback/logging/fetch/parsing orchestration that `runLlmStage()` already provides, so they are direct consolidation targets.
- `src/engine/structure-rewriter.ts` is the highest-value consolidation target because its default rewrite path currently bypasses `withRetry(...)` and `withModelFallback(...)`, and prompt logging is split between `rewriteStructure()` and the transport implementation instead of being owned by one canonical seam.
- `src/engine/spine-rewriter.ts` also has duplicate transport logic, but it is not part of the structure generation / repair / rewrite seam targeted by this ticket. Pulling it into scope here would broaden the change without improving the architecture of this specific pipeline.
- Structure generation, repair, and rewrite still need slightly different parse/combine behavior, so the abstraction must stay narrow and stage-oriented rather than becoming a bloated “universal pipeline framework”.

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

There is also one concrete architectural flaw in the current rewrite path:
- `structure-rewriter` does not just duplicate plumbing; its default path is behaviorally different from the canonical runner because retry/fallback live outside the rewrite seam while prompt logging is split across two layers.

## Desired Architecture

One canonical stage-runner seam should own structured-output stage execution for structure-related flows.

That seam should:
- reuse `src/llm/llm-stage-runner.ts` directly if practical
- only extend it if implementation finds a concrete missing capability
- support single-stage and multi-stage structured flows without duplicating the OpenRouter plumbing
- keep stage-specific parsing local to the caller
- keep orchestration policy consistent across generation, repair, and rewrite
- own prompt logging inside the execution seam instead of splitting that responsibility between callers and transport helpers

## Files to Touch

- `src/llm/llm-stage-runner.ts`
- `src/llm/structure-generator.ts`
- `src/llm/structure-validator.ts`
- `src/engine/structure-rewriter.ts`
- Related tests for the touched modules

## Detailed Changes

### Consolidation target

Refactor structure-related execution paths to route through the shared stage runner instead of hand-rolling fetch/retry/fallback/logging logic.

At minimum:
- `generateMacroArchitecture()` / `generateMilestones()` should stop owning a private `callStructuredStage()`
- structure repair should stop owning a private `callStructuredRepairStage()`
- structure rewrite should stop owning another bespoke structured-output request path and should route its default execution through `runLlmStage()`
- prompt logging for the default structure rewrite path should move fully into the shared runner-backed execution seam

### Allowed extension points

If `runLlmStage()` is slightly too narrow, extend it only for concrete needs discovered during implementation.

Do not extend it for capabilities it already has, including:
- preserving the distinction between `stageModel` and `promptType`
- allowing caller-controlled JSON repair behavior

### Constraints

- Do not build a generic “pipeline engine”
- Do not move stage-specific parse logic out of its owning module
- Do not couple runtime structure normalization to the runner abstraction
- Do not introduce alias stages or compatibility forks
- Prefer surgical refactors over broad rewrites
- Do not pull `spine-rewriter` into this ticket just because it also duplicates HTTP plumbing; that belongs in a separate reassessment if we want a broader runner-consolidation pass later

## Out of Scope

- Prompt-content changes
- Structure normalization/defaulting changes (`STOARCGEN-016`)
- Prompt-context rendering reuse (`STOARCGEN-017`)
- `spine-rewriter` consolidation
- UI/progress display changes

## Acceptance Criteria

### Tests that must pass

- Update structure generation tests to confirm behavior is preserved after runner reuse
- Update structure repair / validator tests to confirm repair flow still logs, retries, and falls back correctly
- Update structure rewrite tests to confirm the default rewrite path now uses the shared runner behavior, especially retry/fallback/logging ownership
- Add focused tests for any new `llm-stage-runner.ts` capability introduced here
- Run the targeted unit suites covering stage runner, structure generation, structure repair, and structure rewrite
- `npm run typecheck` passes
- `npm run lint` passes

### Invariants that must remain true

- One canonical structured-stage execution seam for structure generation / repair / rewrite
- Retry/model-fallback/logging behavior remains consistent across those stages
- Stage-specific parsing remains local and explicit
- No new abstraction creep into a generic pipeline framework

## Outcome

- Completed: 2026-03-14
- Actually changed:
  - `structure-generator` now routes macro architecture and milestone generation through `runLlmStage()` instead of a private structured-stage transport helper.
  - `structure-validator` now routes repair execution through `runLlmStage()` instead of its own bespoke repair-stage transport helper.
  - `structure-rewriter` default execution now routes through `runLlmStage()`, so retry, model fallback, prompt logging, and response logging are owned by the shared runner seam.
  - Tests were updated to match the new prompt-logging ownership and to cover shared-runner retry behavior for structure repair and structure rewrite.
- Deviations from the original plan:
  - `spine-rewriter` was explicitly left out of scope after reassessment because consolidating it here would broaden the change without improving the targeted structure-generation/rewrite seam.
  - `llm-stage-runner.ts` itself did not need new capabilities; the reassessment confirmed it already supported the required stage/prompt separation and JSON-repair control.
- Verification:
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/llm-stage-runner.test.ts test/unit/llm/structure-generator.test.ts test/unit/llm/structure-validator.test.ts test/unit/engine/structure-rewriter.test.ts test/unit/engine/structure-rewriter-model-selection.test.ts`
  - `npm run typecheck`
  - `npm run lint`
