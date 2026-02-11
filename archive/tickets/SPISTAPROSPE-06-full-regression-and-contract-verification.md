# SPISTAPROSPE-06: Full regression and contract verification pass

## Status
**Status**: ✅ COMPLETED

## Summary
Run full required verification after tickets 01-05 land, and backfill any missing targeted tests needed to prove contract integrity and invariant preservation.

## Reassessed assumptions (2026-02-11)
- Tickets 01-05 are already landed and archived under `archive/tickets/` (not present in `tickets/`).
- Progress domain/routes/frontend stage polling and prompt-stage callback plumbing already exist in the codebase; this ticket is a verification and gap-closing pass.
- The optional integration target `test/integration/server/play-flow.test.ts` already exists and is part of the verification surface. If an additional integration regression gap is found, coverage should be added in existing suites (including `test/integration/engine/page-service.test.ts`) or a new integration file under `test/integration/`.

## Depends on
- `archive/tickets/SPISTAPROSPE-01-progress-domain-and-stage-contract.md`
- `archive/tickets/SPISTAPROSPE-02-progress-read-endpoint.md`
- `archive/tickets/SPISTAPROSPE-03-engine-stage-callback-plumbing.md`
- `archive/tickets/SPISTAPROSPE-04-route-progress-lifecycle-wiring.md`
- `archive/tickets/SPISTAPROSPE-05-frontend-spinner-stage-polling-and-phrases.md`

## Blocks
- None

## File list it expects to touch
- `test/unit/server/services/generation-progress.test.ts`
- `test/unit/server/routes/progress.test.ts`
- `test/unit/engine/page-service.test.ts`
- `test/unit/server/routes/stories.test.ts`
- `test/unit/server/routes/play.test.ts`
- `test/unit/server/public/app.test.ts`
- `test/integration/server/play-flow.test.ts` and/or `test/integration/engine/page-service.test.ts` (only if a regression gap is found)
- `specs/spinner-stage-progress-spec.md` (only if verification reveals contract drift requiring spec clarification)

## Implementation checklist
1. Confirm each new/updated targeted test asserts the intended contract from this spec.
2. Add missing tests only where verifiable gaps remain (avoid broad rewrites).
3. Run the required full suites and capture pass/fail evidence.
4. If behavior diverges from spec, either:
   - fix implementation to match spec, or
   - propose explicit spec amendment (do not silently drift).

## Out of scope
- New feature additions beyond spinner-stage progress scope.
- Refactors unrelated to failing tests or contract mismatches.
- Any storage/model schema changes.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e`
- `npm run typecheck`

### Invariants that must remain true
- Existing generation behavior is unchanged when `progressId` is absent.
- Progress ordering remains monotonic per request.
- Only prompt stages are exposed in progress surface.
- Branching invariants remain true (ending pages zero choices; non-ending pages at least two).
- Progress tracking remains in-memory only with no persistence side effects.

## Outcome
- Completion date: 2026-02-11
- What was changed:
  - Reassessed and corrected ticket assumptions/scope to match repository reality (archived dependency paths and existing integration test location).
  - Added focused regression tests for the `progressId`-absent invariant in:
    - `test/unit/server/routes/stories.test.ts`
    - `test/unit/server/routes/play.test.ts`
  - No production code changes were required; existing implementation already satisfied spinner-stage progress contract.
  - Ran required verification:
    - `npm run test:unit` (pass)
    - `npm run test:integration` (pass)
    - `npm run test:e2e` (pass)
    - `npm run typecheck` (pass)
- Deviations from original plan:
  - Original ticket referenced `test/integration/server/play-flow.test.ts` as optional gap target; that file already exists and passed, so no new integration file was needed.
