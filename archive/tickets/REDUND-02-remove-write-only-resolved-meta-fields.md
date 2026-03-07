# REDUND-02: Remove Write-Only resolvedThreadMeta and resolvedPromiseMeta
**Status**: COMPLETED

**Priority**: Quick Win
**Effort**: S
**Dependencies**: None
**Category**: Storage redundancy

## Summary

`Page.resolvedThreadMeta` and `Page.resolvedPromiseMeta` are populated during page building and persisted on disk, but they are presentation metadata (used to render payoff badges), not durable narrative state. They should be removed from the persisted/domain `Page` model and derived at render/response time from canonical state.

## Problem

Initial assumption was incorrect: both fields are consumed in production:
- `GET /play/:storyId` injects them into `#insights-context` for the insights modal
- `POST /play/:storyId/choice` returns them for client-side modal updates
- `public/js/src/05c-analyst-insights.js` reads both to render payoff badges

The architectural issue remains: these fields are denormalized write-path outputs stored in domain/persistence, even though they can be derived from canonical page state and parent page state:
- Resolved thread metadata = (`activeStateChanges.threadsResolved` + parent open-thread metadata)
- Resolved promise metadata = (`analystResult.promisesResolved` + parent accumulated-promise metadata)

Persisting this derived data increases storage redundancy and broadens `Page` responsibilities unnecessarily.

## Proposed Fix

1. Remove `resolvedThreadMeta` and `resolvedPromiseMeta` from `Page` and `CreatePageData`
2. Remove population logic from page build/state lifecycle pipeline
3. Remove both fields from page serialization types and serializer read/write paths
4. Derive insights payoff metadata in server view-model assembly from:
   - current page resolution IDs
   - parent page canonical state
5. Keep payload contract to the client (`resolvedThreadMeta` / `resolvedPromiseMeta` in insights context JSON) but source them from derived server panel data instead of persisted page fields
6. Update and strengthen tests (including derivation edge cases)

## Files to Touch

- `src/models/page.ts` — remove both fields from `Page` interface and create input
- `src/engine/state-lifecycle.ts` / `src/engine/page-builder.ts` — remove resolved-meta generation/passing
- `src/engine/thread-lifecycle.ts` / `src/engine/promise-lifecycle.ts` — remove now-unused resolved-meta builders
- `src/persistence/page-serializer-types.ts` / `src/persistence/page-serializer.ts` — remove fields from persisted schema and mapping
- `src/server/utils/page-panel-data.ts` — derive insights thread/promise metadata from canonical state + parent page
- `src/server/routes/play.ts` and `src/server/views/pages/play.ejs` — consume derived insights metadata
- `test/` — update existing tests and add derivation-focused coverage

## Out of Scope

- Changing analyst result structure
- Modifying how threads/promises are resolved in the engine

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] Both fields removed from `Page` interface
- [x] Insights modal still shows payoff badges for threads and promises
- [x] Resolved payoff metadata is derived from canonical state, not persisted on `Page`
- [x] All existing tests pass
- [x] `npm run test:coverage` thresholds met

## Outcome

- **Completion date**: 2026-03-07
- **What actually changed**:
  - Removed `resolvedThreadMeta` and `resolvedPromiseMeta` from domain model (`Page`), lifecycle output, and persistence schema/serializer.
  - Removed resolved-meta write path from page building/lifecycle code.
  - Added derived insights metadata in `src/server/utils/page-panel-data.ts`:
    - thread badges derived from current page `threadsResolved` + parent open-thread metadata
    - promise badges derived from current page `analystResult.promisesResolved` + parent accumulated-promise metadata
  - Updated play route/view wiring to pass derived `insightsThreadMeta` and `insightsPromiseMeta` into initial render and choice responses.
  - Updated unit/integration tests and added new derivation-focused unit coverage in `test/unit/server/utils/page-panel-data.test.ts`.
- **Deviations from original plan**:
  - Original ticket claimed fields were unused and requested backward-compatible deserialization handling. Reassessment showed production usage in route/view/client insights flow; scope was corrected to remove persistence while preserving UI behavior via derived view-model metadata.
  - Legacy page files with extra keys deserialize safely by default (unknown fields ignored), so no explicit compatibility branch was needed.
- **Verification results**:
  - `npm run typecheck` ✅
  - `npm test` ✅ (3055 passed)
  - `npm run lint` ✅
