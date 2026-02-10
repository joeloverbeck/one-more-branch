# BEANAMSTRANDPLADIS-06: Update remaining beat fixtures and run cross-suite verification

## Status
**Status**: ✅ COMPLETED

## Summary
Normalize any remaining beat fixtures/builders to include `name`, then run focused and end-to-end verification for beat-name contract coverage.

## File list it expects to touch
- `test/e2e/engine/structured-story-flow.test.ts`
- `test/e2e/engine/structure-rewriting-journey.test.ts`
- `test/e2e/engine/full-playthrough.test.ts`
- `test/integration/engine/page-service.test.ts`
- `tickets/BEANAMSTRANDPLADIS-06-fixtures-and-full-verification.md` (record verification outcomes)

## Reassessed assumptions (2026-02-10)
- The referenced path in the request used `BEANARM...`; actual ticket filename is `BEANAMSTRANDPLADIS-06-fixtures-and-full-verification.md`.
- `test/fixtures/active-state.ts` does not contain beat fixtures and is out of scope for this ticket.
- The targeted suites currently pass, so this is an invariant-hardening task rather than a red-to-green fix.
- The remaining discrepancy is mock structure data in targeted integration/E2E tests where beat objects still omit `name`.
- Play-header assertion updates are not required in the targeted files because those tests do not assert header strings.

## Implementation checklist
1. Identify all remaining fixture builders with beat objects missing `name`.
2. Update fixture/test data to provide explicit beat names.
3. Strengthen assertions to explicitly verify beat names are present where structure fixtures are exercised.
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

## Outcome
- **Completion date**: 2026-02-10
- **What changed**:
  - Added explicit `beat.name` values to remaining mocked structure fixtures in:
    - `test/e2e/engine/structured-story-flow.test.ts`
    - `test/e2e/engine/structure-rewriting-journey.test.ts`
    - `test/e2e/engine/full-playthrough.test.ts`
    - `test/integration/engine/page-service.test.ts`
  - Strengthened targeted tests with explicit assertions that every beat in exercised structures has a truthy `name`.
- **Deviations from original plan**:
  - `test/fixtures/active-state.ts` was removed from scope after reassessment because it has no beat fixtures.
  - No play-header assertion changes were needed in the targeted files because they do not assert rendered header strings.
- **Verification results**:
  - `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts` ✅
  - `npm run test:e2e -- --runTestsByPath test/e2e/engine/structured-story-flow.test.ts` ✅
  - `npm run test:e2e -- --runTestsByPath test/e2e/engine/structure-rewriting-journey.test.ts` ✅
  - `npm run test:e2e -- --runTestsByPath test/e2e/engine/full-playthrough.test.ts` ✅
  - `npm run typecheck` ✅
  - `npm test` ✅
