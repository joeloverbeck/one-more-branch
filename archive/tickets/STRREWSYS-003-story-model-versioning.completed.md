# STRREWSYS-003: Add Structure Versioning to Story Model

## Summary
Extend the Story model to support multiple structure versions with helper functions for accessing version history.

## Dependencies
- STRREWSYS-001 must be completed first

## Reassessed Assumptions (2026-02-07)
- `src/models/structure-version.ts` and its tests already exist and are passing from STRREWSYS-001/002.
- Persistence and migration are explicitly out of scope for this ticket, so model/type-guard behavior must remain compatible with stories that may not yet include persisted `structureVersions`.
- The original note "structure should always reflect the latest `structureVersions` entry" is only enforceable for flows that actually append versions. In this ticket, `updateStoryStructure` only seeds the first version; rewrite lineage creation with metadata is handled by later tickets (STRREWSYS-011/012/013).

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
import {
  VersionedStoryStructure,
  StructureVersionId,
  createInitialVersionedStructure,
  isVersionedStoryStructure,
} from './structure-version';
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
   * Optional for legacy compatibility until persistence/migration tickets land.
   */
  readonly structureVersions?: readonly VersionedStoryStructure[];

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
  const versions = story.structureVersions ?? [];
  if (versions.length === 0) {
    return null;
  }
  return versions[versions.length - 1];
}

/**
 * Gets a specific structure version by ID.
 */
export function getStructureVersion(
  story: Story,
  versionId: StructureVersionId
): VersionedStoryStructure | null {
  const versions = story.structureVersions ?? [];
  return versions.find(v => v.id === versionId) ?? null;
}

/**
 * Adds a new structure version to the story.
 * Returns a new Story with the version appended.
 */
export function addStructureVersion(
  story: Story,
  version: VersionedStoryStructure
): Story {
  const versions = story.structureVersions ?? [];
  return {
    ...story,
    structure: version.structure,
    structureVersions: [...versions, version],
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
  const versions = story.structureVersions ?? [];

  // If this is the first structure, create initial version
  if (versions.length === 0) {
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
- Accept missing `structureVersions` for legacy-loaded stories until STRREWSYS-009/010.
- Validate entries with `isVersionedStoryStructure` when present.

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
3. **Legacy compatibility pre-migration** - Stories without persisted `structureVersions` still pass runtime validation
4. **Existing tests pass** - `npm run test:unit` passes

## Technical Notes
- Keep `structure` field for backward compatibility during transition
- `createStory` initializes `structureVersions` as `[]`; legacy stories may omit it until migration
- Full rewrite-version lineage metadata is implemented in later STRREWSYS tickets
- Migration of existing stories is handled in STRREWSYS-010

## Status
Completed on 2026-02-07.

## Outcome
- Implemented story-model structure versioning in `src/models/story.ts` with legacy-safe helpers:
  `getLatestStructureVersion`, `getStructureVersion`, `addStructureVersion`.
- Updated `createStory`, `isStory`, and `updateStoryStructure` for initial-version seeding while preserving backward compatibility for legacy stories without persisted `structureVersions`.
- Updated model barrel exports in `src/models/index.ts`.
- Added and updated unit tests in `test/unit/models/story.test.ts` for helper behavior, initial seeding, non-appending legacy update behavior, and legacy compatibility in `isStory`.
- Adjusted scope from the original plan by explicitly allowing missing `structureVersions` during pre-migration phases (instead of requiring strict always-present persistence in this ticket).
