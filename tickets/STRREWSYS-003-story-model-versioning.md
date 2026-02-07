# STRREWSYS-003: Add Structure Versioning to Story Model

## Summary
Extend the Story model to support multiple structure versions with helper functions for accessing version history.

## Dependencies
- STRREWSYS-001 must be completed first

## Files to Touch

### Modified Files
- `src/models/story.ts`
- `test/unit/models/story.test.ts`

## Out of Scope
- Do NOT modify persistence layer (handled in STRREWSYS-009)
- Do NOT modify page-service.ts (handled in STRREWSYS-011)
- Do NOT implement migration (handled in STRREWSYS-010)
- Do NOT touch story-repository.ts (handled in STRREWSYS-009)

## Implementation Details

### `src/models/story.ts` Changes

Add imports:
```typescript
import { VersionedStoryStructure, StructureVersionId } from './structure-version';
```

Update Story interface:
```typescript
export interface Story {
  readonly id: StoryId;
  readonly title: string;
  readonly characterConcept: string;
  readonly worldbuilding: string;
  readonly tone: StoryTone;
  globalCanon: GlobalCanon;
  globalCharacterCanon: GlobalCharacterCanon;

  /**
   * Current structure (convenience accessor for backward compatibility).
   * Derived from latest structureVersions entry.
   */
  structure: StoryStructure | null;

  /**
   * All structure versions, ordered by creation time.
   * Index 0 is the initial structure.
   */
  readonly structureVersions: readonly VersionedStoryStructure[];

  readonly createdAt: Date;
  updatedAt: Date;
}
```

Add new functions:
```typescript
/**
 * Gets the latest structure version.
 */
export function getLatestStructureVersion(
  story: Story
): VersionedStoryStructure | null {
  if (story.structureVersions.length === 0) {
    return null;
  }
  return story.structureVersions[story.structureVersions.length - 1];
}

/**
 * Gets a specific structure version by ID.
 */
export function getStructureVersion(
  story: Story,
  versionId: StructureVersionId
): VersionedStoryStructure | null {
  return story.structureVersions.find(v => v.id === versionId) ?? null;
}

/**
 * Adds a new structure version to the story.
 * Returns a new Story with the version appended.
 */
export function addStructureVersion(
  story: Story,
  version: VersionedStoryStructure
): Story {
  return {
    ...story,
    structure: version.structure,
    structureVersions: [...story.structureVersions, version],
    updatedAt: new Date(),
  };
}
```

Update `createStory`:
```typescript
export function createStory(data: CreateStoryData): Story {
  // ... existing validation ...

  return {
    id: generateStoryId(),
    title,
    characterConcept,
    worldbuilding: data.worldbuilding?.trim() ?? '',
    tone: data.tone?.trim() ?? 'fantasy adventure',
    globalCanon: [],
    globalCharacterCanon: {},
    structure: null,
    structureVersions: [],  // NEW: empty array initially
    createdAt: now,
    updatedAt: now,
  };
}
```

Update `updateStoryStructure`:
```typescript
export function updateStoryStructure(story: Story, structure: StoryStructure): Story {
  // If this is the first structure, create initial version
  if (story.structureVersions.length === 0) {
    const initialVersion = createInitialVersionedStructure(structure);
    return addStructureVersion(story, initialVersion);
  }

  // Otherwise just update structure (for backward compatibility)
  return {
    ...story,
    structure,
    updatedAt: new Date(),
  };
}
```

Update `isStory` type guard to validate `structureVersions`.

### `test/unit/models/story.test.ts` Updates

Add tests:
```typescript
describe('getLatestStructureVersion', () => {
  it('should return null for empty structureVersions');
  it('should return last version in array');
});

describe('getStructureVersion', () => {
  it('should return null when version not found');
  it('should return matching version by ID');
});

describe('addStructureVersion', () => {
  it('should append version to structureVersions');
  it('should update structure field to new version structure');
  it('should update updatedAt timestamp');
  it('should return new story object (immutability)');
});

describe('updateStoryStructure with versioning', () => {
  it('should create initial version when structureVersions is empty');
  it('should not create new version when versions exist');
});
```

## Acceptance Criteria

### Tests That Must Pass
- `test/unit/models/story.test.ts` - all existing tests still pass
- New tests for `getLatestStructureVersion`, `getStructureVersion`, `addStructureVersion`
- Run with: `npm test -- test/unit/models/story.test.ts`

### Invariants That Must Remain True
1. **I2: Structure Versions Form Linear Chain** - Each version (except initial) points to valid previous version
2. **Backward compatibility** - Existing code using `story.structure` continues to work
3. **Immutability** - `structureVersions` array is readonly
4. **Existing tests pass** - `npm run test:unit` passes

## Technical Notes
- Keep `structure` field for backward compatibility during transition
- The `structure` field should always reflect the latest `structureVersions` entry
- Migration of existing stories is handled in STRREWSYS-010
