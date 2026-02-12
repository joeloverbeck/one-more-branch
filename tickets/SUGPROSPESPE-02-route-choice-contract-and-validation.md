# SUGPROSPESPE-02: Extend `/play/:storyId/choice` contract for suggested protagonist speech

## Status
**Status**: 📝 DRAFT

## Summary
Add optional request-body support for `suggestedProtagonistSpeech` in the play choice route, normalize it, enforce max length, and forward normalized data to engine options.

## Depends on
- `tickets/SUGPROSPESPE-01-play-ui-and-client-payload.md` (for end-to-end client wiring)

## Blocks
- `tickets/SUGPROSPESPE-03-engine-and-context-threading.md`

## File list it expects to touch
- `src/server/routes/play.ts`
- `test/unit/server/routes/play.test.ts`

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
- Engine internal type and plumbing changes beyond route call-site.
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
