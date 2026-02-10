# BEANAMSTRANDPLADIS-06: Update remaining beat fixtures and run cross-suite verification

## Summary
Normalize any remaining beat fixtures/builders to include `name`, then run focused and end-to-end verification for beat-name contract coverage.

## File list it expects to touch
- `test/fixtures/active-state.ts`
- `test/e2e/engine/structured-story-flow.test.ts`
- `test/e2e/engine/structure-rewriting-journey.test.ts`
- `test/e2e/engine/full-playthrough.test.ts`
- `test/integration/engine/page-service.test.ts`
- `tickets/BEANAMSTRANDPLADIS-06-fixtures-and-full-verification.md` (record verification outcomes)

## Implementation checklist
1. Identify all remaining fixture builders with beat objects missing `name`.
2. Update fixture/test data to provide explicit beat names.
3. Adjust assertions impacted by play header string changes.
4. Run targeted integration/E2E suites and record pass/fail results.
5. Run final `typecheck` and full `npm test` sanity check.

## Out of scope
- Do not introduce new product behavior beyond fixture/test updates.
- Do not refactor unrelated tests for style-only improvements.
- Do not change production code unless a failing test exposes a beat-name contract gap.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts`
- `npm run test:e2e -- --runTestsByPath test/e2e/engine/structured-story-flow.test.ts`
- `npm run test:e2e -- --runTestsByPath test/e2e/engine/structure-rewriting-journey.test.ts`
- `npm run test:e2e -- --runTestsByPath test/e2e/engine/full-playthrough.test.ts`
- `npm run typecheck`
- `npm test`

### Invariants that must remain true
- No beat object used by tests omits required `name`.
- No compatibility path is added for legacy no-name beat data.
- Existing story progression and persistence behavior remains green outside the beat-name contract change.

