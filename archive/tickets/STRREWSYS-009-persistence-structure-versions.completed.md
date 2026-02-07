# STRREWSYS-009: Persist Structure Versions in Story Repository

## Status
Completed on 2026-02-07.

## Summary
Persist `structureVersions` in `story.json` through the story repository.

Reassessed assumptions:
- `src/persistence/page-serializer.ts` already persisted `structureVersionId` (including migration for missing field).
- `src/persistence/page-repository.ts` already round-tripped `structureVersionId` via serializer.
- The actual gap was limited to `src/persistence/story-repository.ts` and stale tests expecting `structureVersions` to be `undefined`.

## Dependencies
- STRREWSYS-001 (structure version types)
- STRREWSYS-003 (story model with structureVersions)
- STRREWSYS-004 (page model with structureVersionId)

## Scope (Corrected)

### Modified Files
- `src/persistence/story-repository.ts`
- `test/unit/persistence/story-repository.test.ts`
- `test/integration/persistence/story-repository.test.ts`
- `test/e2e/persistence/data-integrity.test.ts`

### Not Modified
- `src/persistence/page-serializer.ts` (already compliant)
- `src/persistence/page-repository.ts` (already compliant)
- `test/unit/persistence/page-serializer.test.ts` (already covered)
- `test/unit/persistence/page-repository.test.ts` (already covered)

## Out of Scope
- Do NOT implement standalone migration module logic here (handled in STRREWSYS-010).
- Do NOT modify `page-service.ts`.
- Do NOT modify `structure-manager.ts`.
- Do NOT create new storage files (versions remain in `story.json`).

## Implementation Details

### `src/persistence/story-repository.ts`

Added versioned structure persistence types and mapping:

```typescript
interface VersionedStoryStructureFileData {
  id: string;
  structure: StoryStructureFileData;
  previousVersionId: string | null;
  createdAtPageId: number | null;
  rewriteReason: string | null;
  preservedBeatIds: string[];
  createdAt: string;
}

interface StoryFileData {
  // ...existing fields...
  structure: StoryStructureFileData | null;
  structureVersions?: VersionedStoryStructureFileData[]; // optional for legacy files
  createdAt: string;
  updatedAt: string;
}
```

Added conversion helpers:
- `versionedStructureToFileData(version)`
- `fileDataToVersionedStructure(data)`

Updated `storyToFileData`:
- Persists `structureVersions` as `(story.structureVersions ?? []).map(...)`.

Updated `fileDataToStory`:
- Loads `structureVersions` from file.
- Backward compatibility: missing `structureVersions` defaults to `[]`.

## Test Updates

### `test/unit/persistence/story-repository.test.ts`
- Added test: preserves `structureVersions` and version chain fields on save/load round-trip.
- Added test: legacy `story.json` without `structureVersions` loads with `structureVersions: []`.
- Strengthened existing baseline test to assert explicit empty `structureVersions` persistence behavior.

### `test/integration/persistence/story-repository.test.ts`
- Updated stale expectation from `structureVersions === undefined` to equality with expected persisted value (`expected.structureVersions ?? []`).

### `test/e2e/persistence/data-integrity.test.ts`
- Updated stale expectation from `structureVersions === undefined` to equality with story value (`story.structureVersions ?? []`).

## Acceptance Criteria

### Tests That Must Pass
- `test/unit/persistence/story-repository.test.ts`
- `test/integration/persistence/story-repository.test.ts`
- `test/e2e/persistence/data-integrity.test.ts`
- Regression suite: `npm test -- test/unit/persistence/`

### Invariants Maintained
1. **I2: Structure Versions Form Linear Chain** - persisted version metadata round-trips unchanged.
2. **I3: Page Structure Version Exists** - page persistence behavior remains unchanged and covered.
3. **Backward compatibility** - legacy story files without `structureVersions` load correctly.
4. **Round-trip integrity** - save → load preserves story and version data.

## Outcome
- Originally planned: story + page persistence updates.
- Actually changed:
  - Implemented missing `structureVersions` persistence in `story-repository`.
  - Did not modify page persistence code because it was already implemented.
  - Updated tests to align with actual persisted model behavior and added missing coverage for legacy/migration fallback.
