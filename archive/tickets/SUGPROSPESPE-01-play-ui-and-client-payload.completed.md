# SUGPROSPESPE-01: Add Play UI input and client payload behavior for suggested protagonist speech

## Status
**Status**: ✅ COMPLETED

## Summary
Add an optional input on the play page and wire client request/clear behavior so suggested speech is sent only when non-empty and is cleared only when a generated page is returned.

## Assumption Reassessment (2026-02-12)
- Frontend unit coverage in this repo is currently source-assertion based (`fs.readFileSync` + string expectations), not DOM-execution behavior tests. This ticket should satisfy client behavior by implementing the logic in `public/js/app.js` and asserting that logic via source-level test checks in the existing unit suites.
- `POST /play/:storyId/choice` already returns `wasGenerated`, so this ticket should consume that existing field client-side and must not expand server contract scope.
- The current choices UI is rebuilt dynamically after each non-ending response, so suggested-speech input handling must account for both initial server-rendered markup and rebuilt markup paths.

## Depends on
- None

## Blocks
- `tickets/SUGPROSPESPE-02-route-choice-contract-and-validation.md`

## File list it expects to touch
- `src/server/views/pages/play.ejs`
- `public/js/app.js`
- `public/css/styles.css` (only if needed for layout consistency)
- `test/unit/server/public/app.test.ts`
- `test/unit/server/views/play.test.ts`

## Implementation checklist
1. Add a labeled optional text input in play choices UI for suggested protagonist speech.
2. In `public/js/app.js`, collect and trim the input value when posting choice requests.
3. Include `suggestedProtagonistSpeech` in request body only when trimmed value is non-empty.
4. Clear input only when response has `wasGenerated === true`.
5. Preserve input value when response has `wasGenerated === false`.
6. Keep behavior unchanged when input is blank or absent.
7. Ensure value retention also works when the choices section is rebuilt after branch replay responses.

## Out of scope
- Server-side request validation and error response changes.
- Engine/LLM prompt behavior changes.
- Any persistence/storage changes.
- Adding local/session storage for the input.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/views/play.test.ts`
- `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/public/app.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Existing choice submission continues to work when input is blank.
- No prompt payload is logged to browser console.
- UI remains functional on desktop and mobile widths already supported by current play layout.

## Outcome
- Completion date: 2026-02-12
- What actually changed:
  - Added a labeled optional suggested protagonist speech input to play choices UI in `src/server/views/pages/play.ejs`.
  - Implemented client payload behavior in `public/js/app.js` to trim and include `suggestedProtagonistSpeech` only when non-empty on choice submission.
  - Implemented one-turn consumption behavior in `public/js/app.js`: clear only when `wasGenerated === true`, preserve when `wasGenerated === false`, including dynamic choices-section rebuild paths.
  - Added source-level unit assertions in `test/unit/server/views/play.test.ts` and `test/unit/server/public/app.test.ts` for new UI and client logic contract.
- Deviations from original plan:
  - No `public/css/styles.css` changes were required; existing layout remains functional without additional styling.
  - Verification remains source-level for frontend behavior (matching current test harness), rather than DOM-executed client tests.
- Verification results:
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/views/play.test.ts` passed.
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/public/app.test.ts` passed.
  - `npm run typecheck` passed.
