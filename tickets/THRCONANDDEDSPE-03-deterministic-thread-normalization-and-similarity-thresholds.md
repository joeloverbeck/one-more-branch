**Status**: Draft

# THRCONANDDEDSPE-03: Deterministic Thread Normalization and Similarity Thresholds

## Summary
Implement and lock deterministic near-duplicate detection behavior for thread text normalization and per-thread-type Jaccard thresholds in the reconciler.

## Depends on
- `specs/12-thread-contract-and-dedup-spec.md` deterministic dedup rules
- `specs/00-writing-prompts-split-implementation-order.md` M4 gate (thread contract + dedup before reconciler finalization)

## File list it expects to touch
- `src/engine/state-reconciler.ts`
- `test/unit/engine/state-reconciler.test.ts`

## Implementation checklist
1. Ensure normalization pipeline includes:
   - lowercase
   - punctuation/repeated whitespace collapse
   - trim filler stop-phrases (for example: `currently`, `right now`, `at this point`)
2. Ensure similarity scoring uses tokenized Jaccard.
3. Enforce thread-type-specific thresholds:
   - `RELATIONSHIP`, `MORAL`: `>= 0.58`
   - `MYSTERY`, `INFORMATION`: `>= 0.62`
   - `QUEST`, `RESOURCE`, `DANGER`: `>= 0.66`
4. Add focused unit tests proving threshold boundary behavior per group.

## Out of scope
- No prompt text changes.
- No planner-side validation changes.
- No retry/error policy changes from Spec 13.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/state-reconciler.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Reconciler behavior is deterministic for identical inputs.
- Non-thread reconciliation categories (inventory/health/canon/character state) retain current behavior.
- No LLM fallback is introduced for dedup decisions.

