# SPISTAPROSPE-02: Add generation progress read endpoint

## Status
**Status**: Proposed

## Summary
Expose progress snapshots through a dedicated read endpoint so the browser can poll for current stage updates while generation is running.

## Depends on
- `tickets/SPISTAPROSPE-01-progress-domain-and-stage-contract.md`

## Blocks
- `tickets/SPISTAPROSPE-05-frontend-spinner-stage-polling-and-phrases.md`

## File list it expects to touch
- `src/server/routes/progress.ts` (new)
- `src/server/routes/index.ts`
- `src/server/index.ts` (if needed for route mounting)
- `test/unit/server/routes/progress.test.ts` (new)

## Implementation checklist
1. Add `GET /generation-progress/:progressId` route.
2. Route should fetch from `generation-progress` service and always return JSON response contract:
   - `status`
   - `activeStage`
   - `completedStages`
   - `updatedAt`
   - `flowType`
3. Preserve unknown-id behavior as a non-error response (`status: unknown`).
4. Keep response sanitized and presentation-safe.

## Out of scope
- Starting/completing/failing progress sessions from POST routes.
- Any changes to generation pipeline execution.
- Spinner phrase or UI behavior.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/server/routes/progress.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/server/index.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Unknown progress IDs do not produce 500 errors.
- Endpoint does not leak prompt payloads, raw model output, or secrets.
- Existing home/stories/play route behavior remains unchanged.
