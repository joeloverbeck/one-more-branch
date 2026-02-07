# STRSTOARCSYS-011: Page Persistence

## Status
Completed (2026-02-07)

## Summary
Ensure page persistence treats `accumulatedStructureState` as a first-class persisted field with explicit file-data interfaces and clean-break loading behavior.

## Assumption Reassessment (Current Code vs Ticket)

### Confirmed
- `Page` already includes required `accumulatedStructureState` in `src/models/page.ts`.
- `src/persistence/page-repository.ts` already writes and reads `accumulatedStructureState`.
- Public repository APIs (`savePage`, `loadPage`, etc.) do not need to change.

### Discrepancies Corrected
1. Original ticket assumed structure-state persistence was missing.
- Actual code already persists it inline in `pageToFileData()`/`fileDataToPage()`.
- Scope is corrected to harden and make representation explicit, not introduce feature from scratch.

2. Original ticket requested helper-level tests as primary acceptance.
- Existing repository test style validates behavior through public repository functions and persisted JSON.
- Scope is corrected to prioritize repository behavior tests while allowing internal helpers.

3. Original ticket said clean break (no migration), but current implementation contains optional fallback for `accumulatedStructureState`.
- Current `PageFileData` marks `accumulatedStructureState` optional and defaults missing data to `createEmptyAccumulatedStructureState()`.
- Scope is corrected to remove that fallback for this field so missing state is treated as invalid persisted data.

## Revised Scope
- Touch production code only in `src/persistence/page-repository.ts`.
- Introduce explicit structure-state file-data interfaces and conversion helpers.
- Make `accumulatedStructureState` required in persisted `PageFileData`.
- Remove migration fallback for missing `accumulatedStructureState` (clean-break behavior for this field).
- Keep all public APIs unchanged.
- Add/adjust repository tests to cover structure-state round-trip, JSON shape, and missing-field failure behavior.

## Files to Touch
- `src/persistence/page-repository.ts`
- `test/unit/persistence/page-repository.test.ts`
- `test/integration/persistence/page-repository.test.ts`

## Out of Scope
- DO NOT modify `story-repository.ts` (that's STRSTOARCSYS-010)
- DO NOT modify data models
- DO NOT modify engine layer
- DO NOT add migration for missing `accumulatedStructureState` (clean break per spec)

## Implementation Details

### Add `AccumulatedStructureStateFileData` Interface

```typescript
interface AccumulatedStructureStateFileData {
  currentActIndex: number;
  currentBeatIndex: number;
  beatProgressions: Array<{
    beatId: string;
    status: string;  // 'pending' | 'active' | 'concluded'
    resolution?: string;
  }>;
}
```

### Update `PageFileData` Interface

```typescript
interface PageFileData {
  // ... existing fields ...
  accumulatedStructureState: AccumulatedStructureStateFileData;  // REQUIRED
}
```

### Add Serialization Functions

```typescript
function structureStateToFileData(
  state: AccumulatedStructureState
): AccumulatedStructureStateFileData {
  return {
    currentActIndex: state.currentActIndex,
    currentBeatIndex: state.currentBeatIndex,
    beatProgressions: state.beatProgressions.map(prog => ({
      beatId: prog.beatId,
      status: prog.status,
      resolution: prog.resolution,
    })),
  };
}

function fileDataToStructureState(
  data: AccumulatedStructureStateFileData
): AccumulatedStructureState {
  return {
    currentActIndex: data.currentActIndex,
    currentBeatIndex: data.currentBeatIndex,
    beatProgressions: data.beatProgressions.map(prog => ({
      beatId: prog.beatId,
      status: prog.status as BeatStatus,
      resolution: prog.resolution,
    })),
  };
}
```

### Clean-Break Loading Rule

`fileDataToPage()` must not substitute `createEmptyAccumulatedStructureState()` when
`accumulatedStructureState` is missing in persisted data. Missing field should fail load as invalid data.

### Update `pageToFileData()`

Add structure state serialization:

```typescript
function pageToFileData(page: Page): PageFileData {
  return {
    // ... existing fields ...
    accumulatedStructureState: structureStateToFileData(page.accumulatedStructureState),
  };
}
```

### Update `fileDataToPage()`

Add structure state deserialization:

```typescript
function fileDataToPage(data: PageFileData): Page {
  return {
    // ... existing fields ...
    accumulatedStructureState: fileDataToStructureState(data.accumulatedStructureState),
  };
}
```

## Acceptance Criteria

### Tests That Must Pass

Create/update `test/unit/persistence/page-repository.test.ts`:

1. `savePage/loadPage` with structure state
   - Includes `accumulatedStructureState` field in output
   - Preserves currentActIndex and currentBeatIndex
   - Preserves beatProgressions entries and optional resolution

2. persisted JSON shape
   - Saved page JSON includes `accumulatedStructureState`
   - Structure state payload matches page values

3. round-trip persistence
   - Save page with structure state → load page → state matches
   - Beat progressions preserved through save/load cycle
   - Status values preserved correctly

4. beat progressions with resolutions
   - Concluded beats with resolutions saved correctly
   - Resolutions loaded correctly
   - Pending/active beats without resolutions handled correctly

5. clean-break behavior for missing field
   - Loading persisted page data without `accumulatedStructureState` fails (no default substitution)

### Invariants That Must Remain True
- All existing page persistence functionality unchanged
- File format is valid JSON
- BeatStatus values serialize as strings
- TypeScript strict mode passes
- Existing page persistence tests pass (with structure state coverage additions)

## Dependencies
- STRSTOARCSYS-003 (Page model with accumulatedStructureState)
- STRSTOARCSYS-001 (AccumulatedStructureState type)

## Breaking Changes
- Existing page_N.json files will not load correctly (no migration)
- File format adds `accumulatedStructureState` field

## Estimated Scope
~60 lines of code changes + ~80 lines of tests

## Outcome
- Updated `src/persistence/page-repository.ts` to introduce explicit `BeatProgressionFileData` and `AccumulatedStructureStateFileData` interfaces plus dedicated conversion helpers for structure-state serialization/deserialization.
- Updated `PageFileData.accumulatedStructureState` to be required and removed fallback-to-empty behavior for missing persisted structure state.
- Added/updated tests in unit and integration persistence suites to verify:
  - structure-state round-trip with concluded/active/pending beats
  - persisted JSON shape includes `accumulatedStructureState`
  - load failure when persisted data omits `accumulatedStructureState`

### Actual vs Originally Planned
- The original ticket assumed structure-state persistence was absent; actual code already had baseline support.
- Work focused on hardening existing persistence semantics and aligning them with clean-break rules instead of introducing the feature from scratch.
- Acceptance coverage was implemented through public repository behavior tests (consistent with repo style), while still adding explicit helper-based production code internally.
