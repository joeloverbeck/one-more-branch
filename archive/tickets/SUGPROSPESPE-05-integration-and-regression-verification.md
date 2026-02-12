# SUGPROSPESPE-05: Integration coverage for one-turn consumption and replay semantics

## Status
**Status**: ✅ COMPLETED

## Summary
Add/adjust integration tests to verify the optional suggested speech flows through continuation generation, does not break replay, and respects one-turn-until-consumed semantics at the API/client boundary.

## Assumption Reassessment (2026-02-12)
- Core implementation from `SUGPROSPESPE-01` through `SUGPROSPESPE-04` is already present in code:
  - route parsing/normalization/length validation exists in `src/server/routes/play.ts`
  - engine/LLM pass-through exists in `src/engine/*` and `src/llm/*`
  - client one-turn clear/retain behavior exists in `public/js/app.js`
- Existing tests already cover most of this ticket's intent:
  - integration server flow includes suggested speech forwarding + replay `wasGenerated` semantics in `test/integration/server/play-flow.test.ts`
  - route contract validation/normalization exists in `test/unit/server/routes/play.test.ts`
  - client one-turn clear/preserve behavior is covered via source-level assertions in `test/unit/server/public/app.test.ts`
- Therefore, this ticket scope is verification-first with only minimal test/code adjustments if gaps are found.

## Depends on
- `tickets/SUGPROSPESPE-01-play-ui-and-client-payload.md`
- `tickets/SUGPROSPESPE-02-route-choice-contract-and-validation.md`
- `tickets/SUGPROSPESPE-03-engine-and-context-threading.md`
- `tickets/SUGPROSPESPE-04-continuation-prompt-instruction-block.md`

## Blocks
- None

## File list it expects to touch
- `tickets/SUGPROSPESPE-05-integration-and-regression-verification.md` (assumption/scope/status updates)
- `test/integration/server/play-flow.test.ts` (only if a verification gap is found)
- `test/unit/server/public/app.test.ts` (only if one-turn clear/retain coverage needs strengthening)
- `test/unit/server/routes/play.test.ts` (only if request-contract regressions are found)
- `test/integration/llm/client.test.ts` (not expected; only if writer-context assertion location is changed)

## Implementation checklist
1. Re-verify generated continuation path where suggested speech is present and reaches writer-context/prompt path.
2. Re-verify replay (`wasGenerated: false`) path and ensure no regressions or required-field behavior.
3. Re-verify one-turn consumption behavior:
   - generated page clears UI value
   - replayed branch preserves UI value
4. Keep tests deterministic using existing mocks/stubs.
5. Avoid broad fixture rewrites; only add/adjust minimal cases if a concrete gap is discovered.

## Out of scope
- New feature expansion beyond suggested protagonist speech.
- Non-deterministic e2e browser automation additions.
- Persistence schema migrations.
- Refactors unrelated to testability for this feature.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:integration -- --runTestsByPath test/integration/server/play-flow.test.ts`
- `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/public/app.test.ts`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e`
- `npm run typecheck`

### Invariants that must remain true
- Existing play flow behavior remains unchanged when field is omitted.
- Replay path continues to be side-effect free regarding generation state.
- No new persistence fields are introduced for suggested speech.
- No new terminal/browser logging of prompt payload beyond existing sink behavior.

## Outcome
- Completion date: 2026-02-12
- What was actually changed:
  - Reassessed and corrected ticket assumptions/scope to reflect that core implementation and required coverage were already in place.
  - Performed hard verification across targeted and full suites; no application code changes were required.
- Deviations from original plan:
  - Original ticket framed work as add/adjust integration tests; reassessment showed existing tests already satisfied the scope, so only ticket documentation/status updates were needed.
- Verification results:
  - `npm run test:integration -- --runTestsByPath test/integration/server/play-flow.test.ts` ✅
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/public/app.test.ts` ✅
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/routes/play.test.ts` ✅
  - `npm run test:integration -- --runTestsByPath test/integration/llm/client.test.ts` ✅
  - `npm run test:unit` ✅
  - `npm run test:integration` ✅
  - `npm run test:e2e` ✅
  - `npm run typecheck` ✅
