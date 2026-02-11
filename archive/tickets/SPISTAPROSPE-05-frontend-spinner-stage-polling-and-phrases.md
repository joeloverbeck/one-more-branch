# SPISTAPROSPE-05: Implement spinner stage polling and phrase rotation

## Status
**Status**: ✅ COMPLETED

## Summary
Update the browser spinner workflow to poll generation progress, switch to stage-specific phrase pools, rotate text while running, and stop cleanly on terminal states.

## Depends on
- `tickets/SPISTAPROSPE-02-progress-read-endpoint.md`
- `tickets/SPISTAPROSPE-04-route-progress-lifecycle-wiring.md`

## Blocks
- None

## File list it expects to touch
- `public/js/app.js`
- `test/unit/server/public/app.test.ts`

## Implementation checklist
1. Reassessed assumptions:
   - `GET /generation-progress/:progressId` already exists and returns `status`, `activeStage`, `completedStages`, `updatedAt`, `flowType`.
   - `POST /stories/create-ajax` and `POST /play/:storyId/choice` already accept optional `progressId` and already wire stage lifecycle callbacks.
   - Route-level progress lifecycle tests already exist in route/service test suites.
2. Ensure create-story and make-choice browser requests provide a `progressId` for polling flows.
3. Add polling loop to call `/generation-progress/:progressId` while request is active.
4. Add stage phrase buckets covering all required stages:
   - `PLANNING_PAGE`
   - `WRITING_OPENING_PAGE`
   - `WRITING_CONTINUING_PAGE`
   - `ANALYZING_SCENE`
   - `RESTRUCTURING_STORY`
5. Provide about 20 total silly Sims-style phrases distributed across stage buckets.
6. Rotate phrase every 1.5s to 2.5s while current stage remains active.
7. On stage transition, immediately switch phrase from the new stage bucket.
8. If endpoint returns `unknown` or transient polling error, keep generic loading fallback and continue retrying.
9. Stop polling and hide spinner on terminal success/failure and client-side fatal errors.

## Out of scope
- Visual redesign of spinner components beyond status text behavior.
- Server-side persistence or SSE/WebSocket transport.
- Prompt/schema/model behavior changes.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/server/public/app.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Spinner is always dismissed on terminal state or fatal client error.
- Generic fallback loading text remains available when progress data is unavailable.
- UI text never includes API keys, prompt payloads, or raw LLM response content.
- Existing request success/failure UX (outside spinner text) remains unchanged.

## Outcome
- Completion date: 2026-02-11
- What was actually changed:
  - Updated this ticket assumptions/scope after reassessment: backend progress endpoint/lifecycle wiring was already implemented, so work was narrowed to frontend + frontend tests.
  - Implemented frontend progress polling and stage phrase rotation in `public/js/app.js`:
    - Client now generates and sends `progressId` for create-story and make-choice AJAX requests.
    - Spinner now polls `GET /generation-progress/:progressId` while requests are active.
    - Stage-specific phrase pools were added for all required stages with rotation every 1.5-2.5s.
    - Unknown/transient polling states now keep generic fallback loading text.
    - Polling and spinner text updates stop cleanly on terminal states and client-side completion/error paths.
  - Strengthened `test/unit/server/public/app.test.ts` to assert stage buckets, polling behavior, and progressId request wiring.
- Deviations from original plan:
  - No server route/service/template changes were required, because prerequisite backend work had already landed.
  - No new view test file was introduced.
- Verification results:
  - `npm run test:unit -- --runTestsByPath test/unit/server/public/app.test.ts` passed.
  - `npm run test:unit -- --runTestsByPath test/unit/server/views/play.test.ts` passed.
  - `npm run typecheck` passed.
