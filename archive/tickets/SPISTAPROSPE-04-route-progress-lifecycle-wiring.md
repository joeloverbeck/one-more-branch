# SPISTAPROSPE-04: Wire progress lifecycle into create and choice routes

## Status
**Status**: ✅ COMPLETED

## Summary
Add optional `progressId` handling to story creation and choice routes and wire route-level progress lifecycle state to existing engine stage callbacks.

## Reassessed assumptions (2026-02-11)
- `src/server/services/generation-progress.ts` and `GET /generation-progress/:progressId` already exist.
- Engine stage callback plumbing is already implemented (`onGenerationStage` in engine types/services).
- Remaining gap is route lifecycle wiring in:
  - `POST /stories/create-ajax`
  - `POST /play/:storyId/choice`
- `src/server/utils/async-route.ts` does not require changes for this ticket.
- Integration test updates are not expected unless route response contracts change.

## Depends on
- `tickets/SPISTAPROSPE-01-progress-domain-and-stage-contract.md`
- `tickets/SPISTAPROSPE-03-engine-stage-callback-plumbing.md`

## Blocks
- `tickets/SPISTAPROSPE-05-frontend-spinner-stage-polling-and-phrases.md`

## File list it expects to touch
- `src/server/routes/stories.ts`
- `src/server/routes/play.ts`
- `test/unit/server/routes/stories.test.ts`
- `test/unit/server/routes/play.test.ts`

## Implementation checklist
1. Accept optional `progressId` in:
   - `POST /stories/create-ajax`
   - `POST /play/:storyId/choice`
2. If `progressId` is present:
   - call `start(progressId, flowType)` at request start,
   - pass stage callback into generation pipeline via existing `onGenerationStage` engine options,
   - call `complete(progressId)` on success,
   - call `fail(progressId, publicMessage?)` on handled failure paths.
3. If `progressId` is absent, preserve exact existing behavior.
4. Ensure route errors still return existing response contract while also finalizing progress status.

## Out of scope
- Implementing the GET progress route (separate ticket).
- Frontend polling logic and phrase rotation.
- Changing generation business logic or prompt schemas.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/server/routes/stories.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/server/routes/play.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/server/play-flow.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Backward compatibility when `progressId` is omitted.
- Terminal state is always recorded for started progress sessions (`completed` or `failed`).
- Route responses do not expose prompt content or secret material.
- No persistence side effects from progress lifecycle wiring.

## Outcome
- Completion date: 2026-02-11
- What was changed:
  - Added optional `progressId` lifecycle wiring to `POST /stories/create-ajax` and `POST /play/:storyId/choice`.
  - Routes now start progress sessions, forward engine stage events, and finalize progress as `completed` or `failed`.
  - Added route unit coverage for validation, success, and error lifecycle behavior with `progressId`.
- Deviations from original plan:
  - No changes were needed in `src/server/utils/async-route.ts`.
  - No integration route contract changes were required beyond keeping existing integration coverage green.
- Verification:
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/routes/stories.test.ts`
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/routes/play.test.ts`
  - `npm run test:integration -- --runTestsByPath test/integration/server/play-flow.test.ts`
  - `npm run typecheck`
