**Status**: ✅ COMPLETED

# THRCONANDDEDSPE-03: Deterministic Thread Normalization and Similarity Thresholds

## Summary
Validate and lock deterministic near-duplicate detection behavior for thread text normalization and per-thread-type Jaccard thresholds in the reconciler.

## Depends on
- `specs/12-thread-contract-and-dedup-spec.md` deterministic dedup rules
- `specs/00-writing-prompts-split-implementation-order.md` M4 gate (thread contract + dedup before reconciler finalization)

## Reassessed assumptions (2026-02-11)
- `src/engine/state-reconciler.ts` already implements:
  - lowercasing + punctuation/whitespace normalization for thread similarity text
  - stop-phrase trimming (`currently`, `right now`, `at this point`, plus `for now`)
  - tokenized Jaccard similarity
  - thread-type-specific thresholds at `0.58 / 0.62 / 0.66` by group
- Existing tests already cover duplicate detection behavior generally, but do not explicitly prove threshold boundary behavior for each threshold group.
- Therefore, this ticket is primarily a test-hardening and verification ticket, not a reconciler logic rewrite ticket.

## File list it expects to touch
- `src/engine/state-reconciler.ts`
- `test/unit/engine/state-reconciler.test.ts`

## Implementation checklist
1. Confirm and preserve existing normalization pipeline:
   - lowercase
   - punctuation/repeated whitespace collapse
   - filler stop-phrase trimming (including `currently`, `right now`, `at this point`)
2. Confirm and preserve tokenized Jaccard similarity scoring.
3. Confirm and preserve thread-type-specific thresholds:
   - `RELATIONSHIP`, `MORAL`: `>= 0.58`
   - `MYSTERY`, `INFORMATION`: `>= 0.62`
   - `QUEST`, `RESOURCE`, `DANGER`: `>= 0.66`
4. Add focused unit tests proving near-boundary behavior for each threshold group (accept below threshold, reject at/above threshold when unresolved equivalent exists).

## Out of scope
- No prompt text changes.
- No planner-side validation changes.
- No retry/error policy changes from Spec 13.
- No public API/type contract changes.
- No reconciler algorithm refactor unless a failing test proves a behavioral mismatch.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/state-reconciler.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Reconciler behavior is deterministic for identical inputs.
- Non-thread reconciliation categories (inventory/health/canon/character state) retain current behavior.
- No LLM fallback is introduced for dedup decisions.

## Outcome
- Completion date: 2026-02-11
- What changed:
  - Added deterministic threshold-boundary tests in `test/unit/engine/state-reconciler.test.ts` for all threshold groups (`0.58`, `0.62`, `0.66`).
  - Added a stop-phrase normalization test for thread similarity scoring.
  - Reconciler implementation code in `src/engine/state-reconciler.ts` was unchanged because behavior already matched the ticket contract.
- Deviations from original plan:
  - Original draft implied reconciler logic implementation work; reassessment showed logic was already complete, so this ticket was narrowed to verification and test hardening.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/engine/state-reconciler.test.ts` passed.
  - `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts` passed.
  - `npm run typecheck` passed.
