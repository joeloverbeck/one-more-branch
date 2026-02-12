# SUGPROSPESPE-01: Add Play UI input and client payload behavior for suggested protagonist speech

## Status
**Status**: 📝 DRAFT

## Summary
Add an optional input on the play page and wire client request/clear behavior so suggested speech is sent only when non-empty and is cleared only when a generated page is returned.

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
