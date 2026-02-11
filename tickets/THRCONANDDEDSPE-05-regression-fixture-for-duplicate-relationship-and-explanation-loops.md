**Status**: Draft

# THRCONANDDEDSPE-05: Regression Fixture for Duplicate Relationship and Explanation Loops

## Summary
Add regression coverage derived from real failure modes (`td-13/14/15/16` style duplication) to prevent recurrence of semantically equivalent relationship/explanation thread duplicates.

## Depends on
- `THRCONANDDEDSPE-03`
- `THRCONANDDEDSPE-04`
- `specs/12-thread-contract-and-dedup-spec.md` required regression fixture

## File list it expects to touch
- `test/fixtures/reconciler/thread-dedup/alicia-bobby-duplicate-loops.json` (NEW)
- `test/unit/engine/state-reconciler.test.ts` or `test/unit/engine/state-reconciler-thread-regression.test.ts` (NEW)

## Implementation checklist
1. Create a fixture with:
   - previous threads including two relationship/explanation loops
   - candidate add intents that are reworded duplicates
   - candidate add intents that are valid refinements when paired with explicit resolve IDs
2. Add regression tests for:
   - duplicate-like add rejected without resolve
   - replacement accepted with matching resolve
   - two distinct loops sharing entities remain allowed when unresolved question differs
3. Keep fixture language stable and human-reviewable (no generated noise).

## Out of scope
- No prompt text changes.
- No reconciler production logic changes outside what is required for fixture-backed assertions.
- No integration/e2e scenario expansion beyond this regression scope.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/state-reconciler.test.ts`
- If split test file is created: `npm run test:unit -- --runTestsByPath test/unit/engine/state-reconciler-thread-regression.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Regression fixtures prove dedup is semantic-loop aware, not exact-string only.
- Branch-isolation and replay-safety invariants remain intact.
- Existing non-thread reconciler diagnostics remain stable.

