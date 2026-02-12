# SUGPROSPESPE-02: Extend `/play/:storyId/choice` contract for suggested protagonist speech

## Status
**Status**: ✅ COMPLETED

## Summary
Add optional request-body support for `suggestedProtagonistSpeech` in the play choice route, normalize it, enforce max length, and forward normalized data to engine options.

## Reassessed assumptions (2026-02-12)
- Client wiring is already present:
  - `src/server/views/pages/play.ejs` already includes the input.
  - `public/js/app.js` already sends trimmed `suggestedProtagonistSpeech` when non-empty.
  - `test/unit/server/public/app.test.ts` already covers payload inclusion behavior.
- This ticket does not need to implement UI behavior.
- Route-only edits are insufficient for type safety: `storyEngine.makeChoice(...)` option typing must accept the new optional field for the route call to compile.

## Depends on
- No blocking dependency. Prior UI/client payload wiring already exists in the codebase.

## Blocks
- `tickets/SUGPROSPESPE-03-engine-and-context-threading.md`

## File list it expects to touch
- `src/server/routes/play.ts`
- `src/engine/types.ts`
- `test/unit/server/routes/play.test.ts`
- `test/integration/server/play-flow.test.ts` (non-regression and request contract coverage)

## Implementation checklist
1. Extend request body typing in `POST /play/:storyId/choice` to include optional `suggestedProtagonistSpeech?: string`.
2. Normalize value in route:
   - `undefined` stays `undefined`
   - trim whitespace
   - empty-after-trim becomes `undefined`
3. Enforce max length (500 chars unless product constant already exists and should be reused).
4. Return `400` for over-limit payload with existing route error style.
5. Pass normalized field into `storyEngine.makeChoice(...)`.
6. Preserve current behavior when field is not present.

## Out of scope
- Prompt composition changes.
- Engine generation/prompt behavior changes (this ticket is route contract + validation only).
- Frontend rendering/interaction behavior.
- Story/page schema or persistence modifications.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/routes/play.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/server/play-flow.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Backward compatibility for older clients that do not send the field.
- Existing route error handling contract remains intact for unrelated errors.
- No additional terminal/browser logging of prompt payload content.

## Outcome
- Completion date: 2026-02-12
- What actually changed:
  - Added optional route contract support for `suggestedProtagonistSpeech` in `POST /play/:storyId/choice`.
  - Added route normalization (`trim`, empty-to-`undefined`) and 500-char max validation with `400` response.
  - Forwarded normalized value into `storyEngine.makeChoice(...)` only when present.
  - Added `suggestedProtagonistSpeech?: string` to `MakeChoiceOptions` so route forwarding is type-safe.
  - Added/updated tests for over-limit validation, trimming/forwarding, blank normalization, and integration non-regression.
- Deviations from original plan:
  - The ticket originally implied client wiring dependency; reassessment found UI/client payload wiring already implemented, so no UI changes were required.
  - Original file-scope assumed route-only changes; one additional type file (`src/engine/types.ts`) was required for TypeScript contract compatibility.
- Verification results:
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/routes/play.test.ts` passed.
  - `npm run test:integration -- --runTestsByPath test/integration/server/play-flow.test.ts` passed.
  - `npm run typecheck` passed.
