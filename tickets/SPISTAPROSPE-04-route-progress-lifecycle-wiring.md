# SPISTAPROSPE-04: Wire progress lifecycle into create and choice routes

## Status
**Status**: Proposed

## Summary
Add optional `progressId` handling to story creation and choice routes, start/finalize lifecycle state in routes, and thread stage callbacks into engine calls.

## Depends on
- `tickets/SPISTAPROSPE-01-progress-domain-and-stage-contract.md`
- `tickets/SPISTAPROSPE-03-engine-stage-callback-plumbing.md`

## Blocks
- `tickets/SPISTAPROSPE-05-frontend-spinner-stage-polling-and-phrases.md`

## File list it expects to touch
- `src/server/routes/stories.ts`
- `src/server/routes/play.ts`
- `src/server/utils/async-route.ts` (if helper updates are needed)
- `test/unit/server/routes/stories.test.ts`
- `test/unit/server/routes/play.test.ts`
- `test/integration/server/play-flow.test.ts` (only if route contract assertions need updates)

## Implementation checklist
1. Accept optional `progressId` in:
   - `POST /stories/create-ajax`
   - `POST /play/:storyId/choice`
2. If `progressId` is present:
   - call `start(progressId, flowType)` at request start,
   - pass stage callback into generation pipeline,
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
