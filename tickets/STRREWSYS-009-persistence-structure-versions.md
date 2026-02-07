# STRREWSYS-009: Persist Structure Versions in Story Repository

## Summary
Update the persistence layer to save and load structure versions as part of the story, and update page serialization to include structureVersionId.

## Dependencies
- STRREWSYS-001 (structure version types)
- STRREWSYS-003 (story model with structureVersions)
- STRREWSYS-004 (page model with structureVersionId)

## Files to Touch

### Modified Files
- `src/persistence/story-repository.ts`
- `src/persistence/page-serializer.ts`
- `src/persistence/page-repository.ts`
- `test/unit/persistence/story-repository.test.ts`
- `test/unit/persistence/page-serializer.test.ts`
- `test/unit/persistence/page-repository.test.ts`

## Out of Scope
- Do NOT implement migration logic here (handled in STRREWSYS-010)
- Do NOT modify page-service.ts
- Do NOT modify structure-manager.ts
- Do NOT create new storage files (versions stored in story.json)

## Implementation Details

### `src/persistence/story-repository.ts` Changes

Add new file data interface:
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
  // ... existing fields ...
  structure: StoryStructureFileData | null;
  structureVersions: VersionedStoryStructureFileData[];  // NEW
  createdAt: string;
  updatedAt: string;
}
```

Add conversion functions:
```typescript
function versionedStructureToFileData(
  version: VersionedStoryStructure
): VersionedStoryStructureFileData {
  return {
    id: version.id,
    structure: structureToFileData(version.structure),
    previousVersionId: version.previousVersionId,
    createdAtPageId: version.createdAtPageId,
    rewriteReason: version.rewriteReason,
    preservedBeatIds: [...version.preservedBeatIds],
    createdAt: version.createdAt.toISOString(),
  };
}

function fileDataToVersionedStructure(
  data: VersionedStoryStructureFileData
): VersionedStoryStructure {
  return {
    id: data.id as StructureVersionId,
    structure: fileDataToStructure(data.structure),
    previousVersionId: data.previousVersionId as StructureVersionId | null,
    createdAtPageId: data.createdAtPageId as PageId | null,
    rewriteReason: data.rewriteReason,
    preservedBeatIds: [...data.preservedBeatIds],
    createdAt: new Date(data.createdAt),
  };
}
```

Update `storyToFileData`:
```typescript
function storyToFileData(story: Story): StoryFileData {
  // ... existing fields ...
  return {
    // ... existing ...
    structure: story.structure ? structureToFileData(story.structure) : null,
    structureVersions: story.structureVersions.map(versionedStructureToFileData),
    createdAt: story.createdAt.toISOString(),
    updatedAt: story.updatedAt.toISOString(),
  };
}
```

Update `fileDataToStory`:
```typescript
function fileDataToStory(data: StoryFileData): Story {
  // Migration: handle stories without structureVersions
  const structureVersions = data.structureVersions
    ? data.structureVersions.map(fileDataToVersionedStructure)
    : [];

  return {
    // ... existing fields ...
    structure: data.structure ? fileDataToStructure(data.structure) : null,
    structureVersions,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}
```

### `src/persistence/page-serializer.ts` Changes

Update PageFileData:
```typescript
interface PageFileData {
  // ... existing fields ...
  structureVersionId: string | null;  // NEW
}
```

Update serialization:
```typescript
export function pageToFileData(page: Page): PageFileData {
  return {
    // ... existing fields ...
    structureVersionId: page.structureVersionId ?? null,
  };
}

export function fileDataToPage(data: PageFileData): Page {
  return {
    // ... existing fields ...
    structureVersionId: data.structureVersionId as StructureVersionId | null,
  };
}
```

### Test Updates

#### `test/unit/persistence/story-repository.test.ts`
```typescript
describe('story with structure versions', () => {
  it('should save story with structureVersions');
  it('should load story with structureVersions');
  it('should preserve version chain on round-trip');
  it('should handle empty structureVersions array');
  it('should handle story without structureVersions (migration)');
});
```

#### `test/unit/persistence/page-serializer.test.ts`
```typescript
describe('page with structureVersionId', () => {
  it('should serialize structureVersionId');
  it('should deserialize structureVersionId');
  it('should handle null structureVersionId');
  it('should handle missing structureVersionId (migration)');
});
```

## Acceptance Criteria

### Tests That Must Pass
- `test/unit/persistence/story-repository.test.ts`
- `test/unit/persistence/page-serializer.test.ts`
- `test/unit/persistence/page-repository.test.ts`
- Run with: `npm test -- test/unit/persistence/`

### Invariants That Must Remain True
1. **I2: Structure Versions Form Linear Chain** - Persisted versions maintain chain integrity
2. **I3: Page Structure Version Exists** - Saved/loaded pages preserve structureVersionId
3. **Backward compatibility** - Stories/pages without new fields load correctly
4. **Round-trip integrity** - save → load produces equivalent objects
5. **Existing tests pass** - `npm run test:unit` passes

## Technical Notes
- Structure versions are stored in `story.json`, not separate files
- Keep the JSON structure flat for easier inspection/debugging
- Migration of existing data happens transparently on load (undefined → empty array)
- StructureVersionId is stored as plain string, cast on load
