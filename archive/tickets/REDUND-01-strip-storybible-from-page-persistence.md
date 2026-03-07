# REDUND-01: Strip storyBible from Page Persistence

**Status**: COMPLETED
**Priority**: Quick Win
**Effort**: S
**Dependencies**: None
**Category**: Storage redundancy

## Summary

`Page.storyBible` is currently persisted on every page and deserialized back, but no production generation flow reads `parentPage.storyBible`. Story bible context is rebuilt via the lorekeeper/writer pipeline each generation run. Persisting this field in page JSON is redundant and should be removed from persistence.

## Problem

The lorekeeper generates a `StoryBible` used during writer/choice prompt construction, then the built page stores it via `page-builder.ts`. Persistence currently round-trips this field through `serializePage`/`deserializePage`, and integration tests assert that round-trip behavior.

In current production flow, continuation context does not read `parentPage.storyBible`; generation uses `getLastStoryBible()` from the in-memory lorekeeper pipeline. This makes persisted `storyBible` dead weight in page files and serialization types.

## Reassessed Assumptions

- `Page.storyBible` is still used in-memory during generation pipeline assembly and page building.
- Persisted `storyBible` is not used by production continuation logic.
- Current persistence tests do rely on serialized/deserialized `storyBible`, so tests must be updated as part of this change.
- Clean architecture preference here is to remove the persisted field entirely (not keep a nullable placeholder), while keeping the domain `Page.storyBible` field for in-memory use.

## Proposed Fix

1. Keep `storyBible` on the in-memory `Page` type (it's useful during generation pipeline)
2. Remove `storyBible` from `PageFileData` and stop serializing it in `page-serializer.ts`
3. On deserialization, always set `page.storyBible = null`
4. Remove now-unused story-bible persistence converter wiring if no longer referenced
5. Update persistence tests to assert non-persistence (`storyBible` absent from serialized JSON and `null` after load)

## Files to Touch

- `src/persistence/page-serializer.ts` — remove serialization; deserialize to `null`
- `src/persistence/page-serializer-types.ts` — remove `storyBible` from page file contract
- `src/persistence/converters/index.ts` and `src/persistence/converters/story-bible-converter.ts` — remove or dewire unused converter path if fully dead
- `test/unit/persistence/page-serializer.test.ts` — replace round-trip assumption with non-persistence assertions
- `test/integration/persistence/page-serializer-converters.test.ts` — replace story-bible round-trip test with null-after-load / absent-in-file assertions

## Out of Scope

- Removing `storyBible` from the `Page` type (still useful in-memory during generation)
- Changing lorekeeper behavior

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] Serialized page JSON files do not contain a `storyBible` key
- [x] `page.storyBible` is `null` when deserialized from disk
- [x] All existing tests pass
- [x] `npm run test:coverage` thresholds met

## Outcome

- **Completion date**: 2026-03-07
- **What changed**:
  - Removed `storyBible` from the persisted `PageFileData` contract.
  - Stopped serializing `page.storyBible` in `serializePage`.
  - Forced `storyBible: null` during `deserializePage`.
  - Removed dead story-bible persistence converter wiring and deleted the unused converter file.
  - Updated persistence unit/integration tests to assert non-persistence and null-on-load behavior.
- **Deviations from original plan**:
  - Original ticket proposed serializing a `null` storyBible placeholder; implemented cleaner contract removal (no persisted key) to avoid redundant schema surface.
- **Verification**:
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/persistence/page-serializer.test.ts`
  - `npm run test:integration -- --runTestsByPath test/integration/persistence/page-serializer-converters.test.ts`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test:coverage`
