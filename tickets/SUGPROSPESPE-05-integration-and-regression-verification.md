# SUGPROSPESPE-05: Integration coverage for one-turn consumption and replay semantics

## Status
**Status**: 📝 DRAFT

## Summary
Add/adjust integration tests to verify the optional suggested speech flows through continuation generation, does not break replay, and respects one-turn-until-consumed semantics at the API/client boundary.

## Depends on
- `tickets/SUGPROSPESPE-01-play-ui-and-client-payload.md`
- `tickets/SUGPROSPESPE-02-route-choice-contract-and-validation.md`
- `tickets/SUGPROSPESPE-03-engine-and-context-threading.md`
- `tickets/SUGPROSPESPE-04-continuation-prompt-instruction-block.md`

## Blocks
- None

## File list it expects to touch
- `test/integration/server/play-flow.test.ts`
- `test/unit/server/public/app.test.ts` (if one-turn clear/retain is asserted here instead of integration)
- `test/integration/llm/client.test.ts` (only if writer-context propagation assertions belong here)

## Implementation checklist
1. Cover generated continuation path where suggested speech is present and reaches writer-context/prompt path.
2. Cover replay (`wasGenerated: false`) path and ensure no regressions or required-field behavior.
3. Verify one-turn consumption behavior:
   - generated page clears UI value
   - replayed branch preserves UI value
4. Keep tests deterministic using existing mocks/stubs.
5. Avoid broad fixture rewrites; only add minimal cases for this feature.

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
