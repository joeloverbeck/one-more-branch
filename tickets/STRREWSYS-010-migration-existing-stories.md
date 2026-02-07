# STRREWSYS-010: Migrate Existing Stories and Pages to Versioned Structure

## Summary
Implement transparent migration for existing stories and pages that were created before structure versioning. Migration happens on load, not as a batch operation.

## Dependencies
- STRREWSYS-001 (structure version types)
- STRREWSYS-003 (story model with structureVersions)
- STRREWSYS-004 (page model with structureVersionId)
- STRREWSYS-009 (persistence layer updates)

## Files to Touch

### New Files
- `src/persistence/migration.ts`

### Modified Files
- `src/persistence/story-repository.ts`
- `src/persistence/page-repository.ts`
- `test/unit/persistence/migration.test.ts` (new)

## Out of Scope
- Do NOT run batch migration scripts
- Do NOT modify existing story.json files directly
- Do NOT block application startup for migration
- Do NOT add database versioning or schema tracking

## Implementation Details

### New File: `src/persistence/migration.ts`

```typescript
import { Story, Page } from '../models';
import {
  VersionedStoryStructure,
  StructureVersionId,
  createInitialVersionedStructure,
} from '../models/structure-version';

/**
 * Migrates a story loaded from disk to include structureVersions.
 * Called during load, not during save.
 */
export function migrateStoryToVersionedStructure(story: Story): Story {
  // Already migrated
  if (story.structureVersions && story.structureVersions.length > 0) {
    return story;
  }

  // No structure to migrate
  if (!story.structure) {
    return {
      ...story,
      structureVersions: [],
    };
  }

  // Create initial version from existing structure
  const initialVersion = createInitialVersionedStructure(story.structure);

  return {
    ...story,
    structureVersions: [initialVersion],
  };
}

/**
 * Migrates a page loaded from disk to include structureVersionId.
 * Assigns the initial structure version if story has versions.
 */
export function migratePageToVersionedStructure(
  page: Page,
  story: Story
): Page {
  // Already has structureVersionId
  if (page.structureVersionId !== undefined) {
    return page;
  }

  // Assign first structure version if available
  const initialVersion = story.structureVersions[0];
  const structureVersionId = initialVersion?.id ?? null;

  return {
    ...page,
    structureVersionId,
  };
}

/**
 * Checks if story needs migration.
 */
export function storyNeedsMigration(story: Story): boolean {
  // Has structure but no versions
  return story.structure !== null &&
    (!story.structureVersions || story.structureVersions.length === 0);
}

/**
 * Checks if page needs migration.
 */
export function pageNeedsMigration(page: Page): boolean {
  return page.structureVersionId === undefined;
}
```

### `src/persistence/story-repository.ts` Updates

Update `loadStory`:
```typescript
import { migrateStoryToVersionedStructure } from './migration';

export async function loadStory(storyId: StoryId): Promise<Story | null> {
  const data = await readJsonFile<StoryFileData>(getStoryFilePath(storyId));

  if (!data) {
    return null;
  }

  if (data.id !== storyId) {
    throw new Error(`Story ID mismatch: expected ${storyId}, found ${data.id}`);
  }

  const story = fileDataToStory(data);

  // Migrate on load if needed
  return migrateStoryToVersionedStructure(story);
}
```

### `src/persistence/page-repository.ts` Updates

Update `loadPage` to accept story for migration:
```typescript
import { migratePageToVersionedStructure } from './migration';

export async function loadPage(
  storyId: StoryId,
  pageId: PageId,
  story?: Story  // Optional for migration context
): Promise<Page | null> {
  // ... existing load logic ...

  const page = fileDataToPage(data);

  // Migrate on load if needed and story provided
  if (story && pageNeedsMigration(page)) {
    return migratePageToVersionedStructure(page, story);
  }

  return page;
}
```

### Test File: `test/unit/persistence/migration.test.ts`

```typescript
import {
  migrateStoryToVersionedStructure,
  migratePageToVersionedStructure,
  storyNeedsMigration,
  pageNeedsMigration,
} from '../../../src/persistence/migration';

describe('migrateStoryToVersionedStructure', () => {
  it('should return story unchanged if already has structureVersions');
  it('should return story with empty structureVersions if no structure');
  it('should create initial version from existing structure');
  it('should preserve all other story fields');
  it('should set structure field from initial version');
});

describe('migratePageToVersionedStructure', () => {
  it('should return page unchanged if has structureVersionId');
  it('should assign initial structure version ID from story');
  it('should assign null if story has no structure versions');
  it('should preserve all other page fields');
});

describe('storyNeedsMigration', () => {
  it('should return true for story with structure but no versions');
  it('should return false for story with structure and versions');
  it('should return false for story without structure');
});

describe('pageNeedsMigration', () => {
  it('should return true when structureVersionId is undefined');
  it('should return false when structureVersionId is null');
  it('should return false when structureVersionId is set');
});
```

## Acceptance Criteria

### Tests That Must Pass
- `test/unit/persistence/migration.test.ts`
- Existing persistence tests continue to pass
- Run with: `npm test -- test/unit/persistence/`

### Invariants That Must Remain True
1. **No data loss** - All existing story/page data preserved
2. **Idempotent** - Migrating already-migrated data returns same result
3. **Transparent** - Application works without explicit migration step
4. **I2: Version Chain Integrity** - Migrated stories have valid initial version
5. **I3: Page Version Exists** - Migrated pages reference valid version or null
6. **Existing tests pass** - `npm run test:unit` passes

## Technical Notes
- Migration is lazy (on load), not eager (batch script)
- Migrated stories are saved with new format on next save
- Pages may need story context for migration, so loadPage signature changes
- This is a non-breaking change - old format stories work immediately
