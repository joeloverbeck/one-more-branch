# SPISTAPROSPE-05: Implement spinner stage polling and phrase rotation

## Status
**Status**: Proposed

## Summary
Update the browser spinner workflow to poll generation progress, switch to stage-specific phrase pools, rotate text while running, and stop cleanly on terminal states.

## Depends on
- `tickets/SPISTAPROSPE-02-progress-read-endpoint.md`
- `tickets/SPISTAPROSPE-04-route-progress-lifecycle-wiring.md`

## Blocks
- None

## File list it expects to touch
- `public/js/app.js`
- `src/server/views/pages/new-story.ejs`
- `src/server/views/pages/play.ejs`
- `test/unit/server/public/app.test.ts`
- `test/unit/server/views/play.test.ts` (if rendered hooks/ids change)
- `test/unit/server/views/new-story.test.ts` (new, if needed)

## Implementation checklist
1. Ensure create-story and make-choice requests generate/provide a `progressId` for polling flows.
2. Add polling loop to call `/generation-progress/:progressId` while request is active.
3. Add stage phrase buckets covering all required stages:
   - `PLANNING_PAGE`
   - `WRITING_OPENING_PAGE`
   - `WRITING_CONTINUING_PAGE`
   - `ANALYZING_SCENE`
   - `RESTRUCTURING_STORY`
4. Provide about 20 silly Sims-style phrases per bucket.
5. Rotate phrase every 1.5s to 2.5s while current stage remains active.
6. On stage transition, immediately switch phrase from the new stage bucket.
7. If endpoint returns `unknown` or transient polling error, keep generic loading fallback and continue retrying.
8. Stop polling and hide spinner on terminal success/failure and client-side fatal errors.

## Out of scope
- Visual redesign of spinner components beyond status text behavior.
- Server-side persistence or SSE/WebSocket transport.
- Prompt/schema/model behavior changes.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/server/public/app.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/server/views/play.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/server/views/new-story.test.ts` (if file is introduced)
- `npm run typecheck`

### Invariants that must remain true
- Spinner is always dismissed on terminal state or fatal client error.
- Generic fallback loading text remains available when progress data is unavailable.
- UI text never includes API keys, prompt payloads, or raw LLM response content.
- Existing request success/failure UX (outside spinner text) remains unchanged.
