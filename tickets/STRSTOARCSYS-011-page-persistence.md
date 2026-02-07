# STRSTOARCSYS-011: Page Persistence

## Summary
Update the page repository to serialize/deserialize the new `accumulatedStructureState` field. Add proper file data interfaces for structure state storage.

## Files to Touch
- `src/persistence/page-repository.ts`

## Out of Scope
- DO NOT modify `story-repository.ts` (that's STRSTOARCSYS-010)
- DO NOT modify data models
- DO NOT modify engine layer
- DO NOT handle migration of existing pages (clean break per spec)

## Implementation Details

### First, read current page-repository.ts structure

The page repository likely has a `PageFileData` interface. We need to add structure state to it.

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
  accumulatedStructureState: AccumulatedStructureStateFileData;  // NEW
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

1. `structureStateToFileData`
   - Converts AccumulatedStructureState to file-safe format
   - Preserves currentActIndex and currentBeatIndex
   - Converts beatProgressions array correctly
   - Handles optional resolution field

2. `fileDataToStructureState`
   - Converts file data back to AccumulatedStructureState
   - Parses status string to BeatStatus type
   - Preserves all fields
   - Handles missing resolution correctly

3. `pageToFileData` with structure state
   - Includes `accumulatedStructureState` field in output
   - All structure state fields serialized correctly

4. `fileDataToPage` with structure state
   - Parses `accumulatedStructureState` field correctly
   - Page has valid AccumulatedStructureState object

5. Round-trip persistence
   - Save page with structure state → load page → state matches
   - Beat progressions preserved through save/load cycle
   - Status values preserved correctly

6. Beat progressions with resolutions
   - Concluded beats with resolutions saved correctly
   - Resolutions loaded correctly
   - Pending/active beats without resolutions handled correctly

### Invariants That Must Remain True
- All existing page persistence functionality unchanged
- File format is valid JSON
- BeatStatus values serialize as strings
- TypeScript strict mode passes
- Existing page persistence tests pass (with structure state additions)

## Dependencies
- STRSTOARCSYS-003 (Page model with accumulatedStructureState)
- STRSTOARCSYS-001 (AccumulatedStructureState type)

## Breaking Changes
- Existing page_N.json files will not load correctly (no migration)
- File format adds `accumulatedStructureState` field

## Estimated Scope
~60 lines of code changes + ~80 lines of tests
