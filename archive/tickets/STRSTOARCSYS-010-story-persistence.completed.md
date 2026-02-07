# STRSTOARCSYS-010: Story Persistence

## Status
Completed (2026-02-07)

## Summary
Update story persistence to serialize/deserialize `Story.structure` (including nested acts/beats and `generatedAt`) instead of dropping it on load/save.

## Assumption Reassessment (Current Code vs Ticket)

### Confirmed
- `Story` already uses `structure: StoryStructure | null` in `src/models/story.ts`.
- `StoryStructure` is already defined in `src/models/story-arc.ts`.
- `story-repository` is the remaining persistence gap for structure in this scope.

### Discrepancies Corrected
1. Legacy `storyArc` replacement was already completed in models.
- Original ticket framing implied repository-wide `storyArc` model migration still pending.
- Actual code already removed `storyArc` from `Story` and uses `structure`.
- Scope corrected to persistence behavior only.

2. Existing story repository tests were partially updated but incomplete.
- Unit tests expected `structure` in mismatch fixtures but still only asserted `structure: null` behavior for normal round-trip.
- Scope corrected to add explicit non-null structure persistence tests and null coverage.

3. Ticket over-specified private helper tests.
- Original acceptance criteria requested direct tests for serializer helper internals.
- Current test style in this repo validates persistence via public repository functions.
- Scope corrected to assert behavior through `saveStory/loadStory` and persisted JSON shape.

## Revised Scope
- Modify `src/persistence/story-repository.ts` only for production code.
- Add `StoryStructureFileData` and structure serialization/deserialization helpers.
- Persist `structure` in `storyToFileData()` and restore in `fileDataToStory()`.
- Keep public repository API unchanged.
- Update story repository unit/integration tests to cover non-null and null structure round-trip and legacy field absence.

## Implementation Details
- Added `StoryStructureFileData` shape to on-disk story format.
- Added:
  - `structureToFileData(structure: StoryStructure): StoryStructureFileData`
  - `fileDataToStructure(data: StoryStructureFileData): StoryStructure`
- Updated `StoryFileData` to include `structure: StoryStructureFileData | null`.
- Updated `storyToFileData()` and `fileDataToStory()` to persist/restore `structure`.

## Acceptance Criteria (Updated)
1. Saving and loading a story with non-null `structure` preserves all structure fields, including nested acts/beats and `generatedAt` date.
2. Saving and loading a story with `structure: null` keeps `structure` null.
3. Persisted `story.json` includes `structure` and does not include legacy `storyArc`.
4. Existing story repository behavior (id/title/canon/date handling/listing/page-count/lifecycle) remains intact.

## Out of Scope
- `src/persistence/page-repository.ts` (STRSTOARCSYS-011)
- Model/engine/prompt/schema changes
- Migration/backward-compat logic for legacy story files

## Dependencies
- STRSTOARCSYS-001
- STRSTOARCSYS-002

## Breaking Changes
- Story file format now persists `structure` explicitly.
- No migration behavior added for legacy story file formats.

## Outcome
- Updated `src/persistence/story-repository.ts` to persist and load `Story.structure` with full nested shape and date conversion for `generatedAt`.
- Updated `test/unit/persistence/story-repository.test.ts` with non-null structure round-trip and persisted JSON assertions (`structure` present, `storyArc` absent).
- Updated `test/integration/persistence/story-repository.test.ts` with non-null structure round-trip and explicit null-structure round-trip coverage.

### Actual vs Originally Planned
- Completed the intended persistence change for `structure`.
- Reduced scope from direct helper-unit tests to repository-level behavior tests, matching existing project test patterns and keeping changes minimal.
- No API changes were required.
