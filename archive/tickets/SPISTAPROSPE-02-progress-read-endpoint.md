# SPISTAPROSPE-02: Add generation progress read endpoint

## Status
**Status**: ✅ COMPLETED

## Summary
Expose progress snapshots through a dedicated read endpoint so the browser can poll for current stage updates while generation is running.

## Depends on
- `specs/spinner-stage-progress-spec.md`

## Blocks
- `tickets/SPISTAPROSPE-05-frontend-spinner-stage-polling-and-phrases.md`

## File list it expects to touch
- `src/server/routes/progress.ts` (new)
- `src/server/routes/index.ts`
- `test/unit/server/routes/progress.test.ts` (new)
- `test/unit/server/index.test.ts` (if route registration assertions are added)

## Reassessed assumptions and scope
- `src/server/services/generation-progress.ts` already exists and exports a stable snapshot contract.
- `test/unit/server/services/generation-progress.test.ts` already covers unknown-ID behavior and lifecycle transitions.
- Route mounting should happen in `src/server/routes/index.ts`; `src/server/index.ts` does not need changes for this ticket.
- Scope for this ticket is limited to exposing the read endpoint and verifying route-level response/sanitization behavior.

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

## Outcome
- Completion date: 2026-02-11
- What changed:
  - Added `GET /generation-progress/:progressId` via new `src/server/routes/progress.ts`.
  - Mounted route in `src/server/routes/index.ts`.
  - Added `test/unit/server/routes/progress.test.ts` to verify unknown-ID handling, response contract, and response sanitization.
- Deviations from original plan:
  - Did not modify `src/server/index.ts`; route mounting was correctly handled in `src/server/routes/index.ts`.
  - Did not add assertions to `test/unit/server/index.test.ts`; existing coverage remained sufficient and passed unchanged.
- Verification results:
  - `npm run test:unit -- --runTestsByPath test/unit/server/routes/progress.test.ts test/unit/server/index.test.ts` passed.
  - `npm run typecheck` passed.
