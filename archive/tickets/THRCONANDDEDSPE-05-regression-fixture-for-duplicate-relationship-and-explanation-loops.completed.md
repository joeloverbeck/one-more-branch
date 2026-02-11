**Status**: ✅ COMPLETED

# THRCONANDDEDSPE-05: Regression Fixture for Duplicate Relationship and Explanation Loops

## Summary
Add fixture-backed regression coverage from real failure modes (`td-13/14/15/16` style duplication) to prevent recurrence of semantically equivalent relationship/explanation thread duplicates.

## Reassessed assumptions (2026-02-11)
- `THRCONANDDEDSPE-03` and `THRCONANDDEDSPE-04` were already implemented and archived in `archive/tickets/`; this ticket only needed regression fixture coverage.
- Deterministic near-duplicate logic, replacement enforcement, and danger-vs-threat rejection already existed in `src/engine/state-reconciler.ts` and existing unit tests.
- No dedicated thread-dedup fixture existed under `test/fixtures/reconciler/thread-dedup/`.
- Existing coverage already lived in `test/unit/engine/state-reconciler.test.ts`; adding fixture-backed cases there was the minimal non-breaking path.

## File list expected to touch
- `test/fixtures/reconciler/thread-dedup/alicia-bobby-duplicate-loops.json` (NEW)
- `test/unit/engine/state-reconciler.test.ts` (MODIFY)

## Implementation checklist
1. Create a stable, human-reviewable regression fixture with:
   - Previous threads including two relationship/explanation loop examples.
   - Candidate add intents that are reworded duplicates.
   - Candidate add intents that are valid refinements when paired with explicit resolve IDs.
   - Candidate add intents that share entities but represent distinct unresolved questions.
2. Add fixture-backed regression tests for:
   - Duplicate-like add rejected without resolve.
   - Replacement accepted with matching resolve.
   - Two distinct loops sharing entities remain allowed when unresolved question differs.
3. Keep fixture language stable and non-generated.

## Out of scope
- No prompt text changes.
- No reconciler production logic changes unless fixture-backed assertions reveal a real contract gap.
- No integration/e2e scenario expansion beyond existing required verification.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/state-reconciler.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Regression fixtures prove dedup is semantic-loop aware, not exact-string only.
- Equivalent loops still require explicit replace semantics (resolve + add).
- Branch-isolation and replay-safety invariants remain intact.
- Existing non-thread reconciler diagnostics remain stable.

## Outcome
- Completion date: 2026-02-11
- Actual changes:
  - Added `test/fixtures/reconciler/thread-dedup/alicia-bobby-duplicate-loops.json` with three explicit regression scenarios.
  - Added three fixture-backed tests in `test/unit/engine/state-reconciler.test.ts` for duplicate rejection, replacement acceptance with resolve, and distinct shared-entity loop acceptance.
  - No production reconciler logic changes were required; current implementation already satisfied the regression contract.
- Deviations from original plan:
  - Kept tests in `test/unit/engine/state-reconciler.test.ts` instead of introducing a separate regression test file to keep the change minimal.
- Verification results:
  - `npm run test:unit -- --runTestsByPath test/unit/engine/state-reconciler.test.ts` passed.
  - `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts` passed.
  - `npm run typecheck` passed.
