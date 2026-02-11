# SPISTAPROSPE-06: Full regression and contract verification pass

## Status
**Status**: Proposed

## Summary
Run full required verification after tickets 01-05 land, and backfill any missing targeted tests needed to prove contract integrity and invariant preservation.

## Depends on
- `tickets/SPISTAPROSPE-01-progress-domain-and-stage-contract.md`
- `tickets/SPISTAPROSPE-02-progress-read-endpoint.md`
- `tickets/SPISTAPROSPE-03-engine-stage-callback-plumbing.md`
- `tickets/SPISTAPROSPE-04-route-progress-lifecycle-wiring.md`
- `tickets/SPISTAPROSPE-05-frontend-spinner-stage-polling-and-phrases.md`

## Blocks
- None

## File list it expects to touch
- `test/unit/server/services/generation-progress.test.ts`
- `test/unit/server/routes/progress.test.ts`
- `test/unit/engine/page-service.test.ts`
- `test/unit/server/routes/stories.test.ts`
- `test/unit/server/routes/play.test.ts`
- `test/unit/server/public/app.test.ts`
- `test/integration/server/play-flow.test.ts` (only if a regression gap is found)
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
