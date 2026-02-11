# DETSTARECSPE-05: Reconciler Thread Dedup and Contradiction Rules

**Status**: ✅ COMPLETED

## Summary
Implement deterministic thread dedup and replacement enforcement using Spec 12 similarity thresholds, including threat-vs-danger misclassification checks.

## Assumptions reassessment (2026-02-11)
- `src/engine/state-reconciler.ts` currently normalizes and validates thread IDs but does **not** yet enforce similarity thresholds, replacement semantics for equivalent loops, or `DANGER` misclassification rules.
- `test/unit/engine/state-reconciler.test.ts` currently has no coverage for near-duplicate thread thresholds, missing-resolve rejection, or immediate-hazard `DANGER` rejection.
- `test/integration/llm/active-state-pipeline.test.ts` validates writer-transformer/page-builder flow and is not a reconciler-rule test; it is out of scope for this ticket.
- `src/engine/state-reconciler-types.ts` already provides the required diagnostics shape (`code`, `message`, optional `field`/`anchor`) and does not require API changes for this ticket.

## Updated scope
- Add deterministic thread-text similarity checks (tokenization + Jaccard + per-`ThreadType` thresholds) inside reconciler thread add handling.
- Reject near-duplicate thread adds when no equivalent previous thread is resolved in the same reconciliation payload.
- Reject duplicate-like thread adds within the same payload deterministically.
- Reject `DANGER` thread adds that describe immediate scene hazards and emit a rule diagnostic.
- Keep reconciler public API unchanged; enforce via filtered thread deltas + diagnostics only.

## Depends on
- DETSTARECSPE-02
- DETSTARECSPE-04
- `specs/12-thread-contract-and-dedup-spec.md`

## Blocks
- DETSTARECSPE-07

## File list it expects to touch
- `src/engine/state-reconciler.ts`
- `test/unit/engine/state-reconciler.test.ts`

## Implementation checklist
1. Add deterministic thread normalization/tokenization for similarity checks.
2. Implement per-`ThreadType` Jaccard thresholds from Spec 12.
3. Reject near-duplicate add intents that do not resolve the existing equivalent thread.
4. Enforce replace path: equivalent loops must be `resolve old td-* + add refined successor`.
5. Reject `DANGER` threads that describe immediate present-scene hazards.
6. Emit diagnostic rule codes for duplicate-like add, missing resolve, and misclassification.

## Out of scope
- Prompt-side contract wording updates from Spec 12.
- Non-thread state dedup beyond rules already in earlier reconciler tickets.
- Retry policy and hard failure behavior.
- UI or persistence schema changes.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/state-reconciler.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Thread dedup outcome is deterministic and threshold-driven by `ThreadType`.
- Equivalent unresolved loops cannot be added twice without explicit replacement semantics.
- Existing non-thread state categories are unaffected by thread-specific checks.

## Outcome
- Completion date: 2026-02-11
- What was actually changed:
  - Added deterministic thread similarity normalization/tokenization + per-`ThreadType` Jaccard thresholds in `src/engine/state-reconciler.ts`.
  - Added reconciler thread rules for:
    - near-duplicate add rejection when equivalent previous thread is not resolved
    - near-duplicate add rejection within the same payload
    - immediate-hazard `DANGER` misclassification rejection
  - Added machine-readable diagnostics:
    - `THREAD_DUPLICATE_LIKE_ADD`
    - `THREAD_MISSING_EQUIVALENT_RESOLVE`
    - `THREAD_DANGER_IMMEDIATE_HAZARD`
  - Added focused unit tests in `test/unit/engine/state-reconciler.test.ts` for all three rule families and replacement-allowed behavior.
- Deviations from originally planned scope:
  - `src/engine/state-reconciler-types.ts` was not changed because existing diagnostic types already supported these rules.
  - `test/integration/llm/active-state-pipeline.test.ts` was not changed because it does not exercise reconciler rule logic.
- Verification results:
  - `npm run test:unit -- --runTestsByPath test/unit/engine/state-reconciler.test.ts` ✅
  - `npm run typecheck` ✅
