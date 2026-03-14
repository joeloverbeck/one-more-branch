# STOARCGEN-019: Consolidate Spine Rewrite Stage Runner Reuse

**Status**: TODO
**Depends on**: STOARCGEN-018
**Blocks**: None

## Summary

Consolidate the bespoke structured-output orchestration in `src/engine/spine-rewriter.ts` onto the shared `src/llm/llm-stage-runner.ts` seam.

`STOARCGEN-018` intentionally left `spine-rewriter` out of scope to keep the structure generation / repair / rewrite seam focused. That reassessment still left one adjacent architectural defect behind: `spine-rewriter` owns its own retry/fetch/parsing/logging path even though the repository now has a canonical runner for exactly that concern.

## Reassessed Assumptions

- There is no matching spec file for this ticket yet. This ticket is the implementation source of truth.
- `src/llm/llm-stage-runner.ts` already supports the capabilities spine rewrite needs:
  - stage-model lookup
  - max-token lookup
  - prompt logging
  - response logging
  - retry
  - model fallback
  - structured JSON parsing
  - caller-owned response parsing
- `src/engine/spine-rewriter.ts` is now an outlier relative to the structure-related runner architecture because `structure-generator`, `structure-validator`, and `structure-rewriter` already route through the shared runner.
- This should remain a narrow consolidation ticket. It is not a prompt rewrite, spine contract rewrite, or broader LLM transport refactor.

## Problem

`src/engine/spine-rewriter.ts` still duplicates low-level structured-stage transport behavior:

- `logPrompt(...)`
- OpenRouter request construction
- HTTP error handling
- `readJsonResponse()` / `parseMessageJsonContent()`
- `withRetry(...)`
- `logResponse(...)`

That creates avoidable architectural drift:

- spine rewrite can diverge from the canonical retry/fallback/logging policy
- future changes to shared LLM transport policy still require hand edits in a separate rewrite path
- tests for rewrite-stage behavior stay fragmented across two architectural patterns

## Desired Architecture

`spine-rewriter` should use `runLlmStage()` directly, with spine-specific parsing remaining local to `src/engine/spine-rewriter.ts`.

That seam should:

- make `runLlmStage()` the sole owner of prompt logging, response logging, retry, fallback, and transport
- keep `parseSpineRewriteResponse(...)` local and explicit
- avoid introducing a spine-specific wrapper unless reassessment finds a concrete repeated need elsewhere
- preserve the current `rewriteSpine(...)` external contract

## Files to Touch

- `src/engine/spine-rewriter.ts`
- `src/llm/llm-stage-runner.ts` only if reassessment finds a concrete missing capability
- Related unit tests for spine rewrite and any shared-runner behavior added here

## Detailed Changes

### Consolidation target

Refactor `rewriteSpine(...)` to route its default structured-output call through `runLlmStage()`.

At minimum:

- remove bespoke fetch/error/parsing orchestration from `src/engine/spine-rewriter.ts`
- move prompt logging ownership into the shared runner path
- ensure retry and model fallback behavior match the canonical runner policy

### Allowed extension points

If `runLlmStage()` is too narrow, extend it only for a concrete spine-rewrite need discovered during implementation.

Do not extend it for capabilities it already has.

### Constraints

- Do not change the spine prompt content in this ticket
- Do not change the spine response contract in this ticket
- Do not move `parseSpineRewriteResponse(...)` out of `src/engine/spine-rewriter.ts`
- Do not introduce aliases, compatibility layers, or a second runner abstraction
- Prefer surgical edits over broad cleanup

## Out of Scope

- Spine prompt/content revisions
- Story spine schema/domain-model changes
- Broader consolidation of unrelated LLM modules still using bespoke transport
- UI/progress changes

## Acceptance Criteria

### Tests that must pass

- Update spine rewrite unit tests to confirm prompt logging now comes from the shared runner-backed path
- Add or update tests to confirm retry/model-fallback behavior is preserved under the shared runner
- Add focused runner tests only if implementation introduces new shared-runner capability
- `npm run typecheck` passes
- `npm run lint` passes

### Invariants that must remain true

- One canonical structured-stage execution seam for spine rewrite
- Spine-specific parsing remains local and explicit
- No new abstraction creep into a generic pipeline framework
- No behavioral regression in `rewriteSpine(...)` result shape
