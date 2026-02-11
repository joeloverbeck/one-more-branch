# SPISTAPROSPE-01: Introduce progress domain service and shared stage contract

## Status
**Status**: ✅ COMPLETED

## Summary
Create the in-memory progress tracking domain and a shared stage contract that can be reused by server and engine layers without changing generation behavior.

## Assumption check (2026-02-11)
- Confirmed: `src/server/services/generation-progress.ts` does not exist yet and must be created.
- Confirmed: there is no shared `GenerationStage` contract in `src/engine/types.ts` yet.
- Corrected test target: `test/unit/engine/types.test.ts` already exists and should be extended for stage-contract assertions (no separate contract test file needed).

## Depends on
- None

## Blocks
- `tickets/SPISTAPROSPE-02-progress-read-endpoint.md`
- `tickets/SPISTAPROSPE-03-engine-stage-callback-plumbing.md`
- `tickets/SPISTAPROSPE-04-route-progress-lifecycle-wiring.md`
- `tickets/SPISTAPROSPE-05-frontend-spinner-stage-polling-and-phrases.md`

## File list it expects to touch
- `src/server/services/generation-progress.ts` (new)
- `src/server/services/index.ts`
- `src/engine/types.ts`
- `test/unit/server/services/generation-progress.test.ts` (new)
- `test/unit/engine/types.test.ts` (add shared stage contract assertions)

## Implementation checklist
1. Add a shared generation-stage type/enum with exactly these stage IDs:
   - `PLANNING_PAGE`
   - `WRITING_OPENING_PAGE`
   - `WRITING_CONTINUING_PAGE`
   - `ANALYZING_SCENE`
   - `RESTRUCTURING_STORY`
2. Add `generation-progress` service with lifecycle API:
   - `start(progressId, flowType)`
   - `markStageStarted(progressId, stage, attempt?)`
   - `markStageCompleted(progressId, stage, attempt?)`
   - `complete(progressId)`
   - `fail(progressId, publicMessage?)`
   - `get(progressId)`
3. Implement in-memory store keyed by `progressId` with TTL eviction cleanup.
4. Ensure public read model supports:
   - `status: running | completed | failed | unknown`
   - `activeStage: GenerationStage | null`
   - `completedStages: GenerationStage[]` (ordered)
   - `updatedAt: number` (epoch ms)
   - `flowType: new-story | choice`
5. Keep the service presentation-safe: no prompt text, no model raw outputs, no API credentials.

## Out of scope
- Route handlers and HTTP endpoint wiring.
- Engine/page-service callback invocation.
- Frontend polling and spinner phrase rendering.
- Any persistence schema or disk writes.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/server/services/generation-progress.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/engine/types.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Progress tracking is in-memory only; no story/page model persistence changes.
- Progress transitions are monotonic (`running` to terminal `completed|failed` only).
- Unknown `progressId` returns `status: unknown` semantics, not thrown errors.
- Stage identifiers remain prompt-stage-only vocabulary.

## Outcome
- Completion date: 2026-02-11
- What changed:
  - Added shared stage contract in `src/engine/types.ts` via `GENERATION_STAGES` and `GenerationStage`.
  - Added in-memory progress domain service in `src/server/services/generation-progress.ts` with required lifecycle API and TTL eviction.
  - Exported the new service/types from `src/server/services/index.ts`.
  - Added unit coverage in `test/unit/server/services/generation-progress.test.ts` and stage-contract assertions in `test/unit/engine/types.test.ts`.
- Deviations from original plan:
  - No separate "nearest contract test" file was created; existing `test/unit/engine/types.test.ts` was extended instead.
  - TTL eviction is implemented with lazy cleanup on service operations rather than a background timer, keeping behavior in-memory and deterministic for tests.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/server/services/generation-progress.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/engine/types.test.ts`
  - `npm run typecheck`
