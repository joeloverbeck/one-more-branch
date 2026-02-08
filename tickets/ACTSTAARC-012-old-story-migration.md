# ACTSTAARC-012: Implement Old Story Migration

**Status**: PENDING
**Priority**: MEDIUM (cleanup task)
**Depends On**: ACTSTAARC-011
**Estimated Scope**: Medium

---

## Summary

Implement detection and migration of old-format stories. Old stories (using `stateChanges` without `activeStateChanges`) should be moved to `old-stories/` directory and will no longer be loadable by the application.

---

## Files to Touch

### Create
- `src/migration/old-story-detector.ts` - Detection logic
- `src/migration/story-migrator.ts` - Migration execution

### Modify
- `src/persistence/story-storage.ts` - Add migration check on story load
- `src/index.ts` or startup code - Run migration on startup (optional)

---

## Out of Scope (DO NOT CHANGE)

- `src/models/**` - Model changes in other tickets
- `src/llm/**` - LLM changes in other tickets
- `src/engine/**` - Engine changes in ACTSTAARC-009
- `src/server/**` - Server unchanged (just won't serve old stories)
- Page persistence internals - Changed in ACTSTAARC-011

---

## Implementation Details

### Detection Logic

A story is "old format" if ANY of its pages have `stateChanges` but NOT `activeStateChanges`:

```typescript
async function isOldFormatStory(storyId: string): Promise<boolean> {
  const pageIds = await listPageIds(storyId);

  for (const pageId of pageIds) {
    const pageData = await readRawPageFile(storyId, pageId);
    const parsed = JSON.parse(pageData);

    // Old format: has stateChanges, doesn't have activeStateChanges
    if (parsed.stateChanges && !parsed.activeStateChanges) {
      return true;
    }
  }

  return false;
}
```

### Alternative: Check Page 1 Only

Since all pages in a story use the same format, checking just page 1 is sufficient:

```typescript
async function isOldFormatStory(storyId: string): Promise<boolean> {
  try {
    const page1Data = await readRawPageFile(storyId, 1);
    const parsed = JSON.parse(page1Data);
    return parsed.stateChanges && !parsed.activeStateChanges;
  } catch {
    // No page 1 = incomplete story, treat as old
    return true;
  }
}
```

### Migration Execution

```typescript
async function migrateOldStory(storyId: string): Promise<void> {
  const sourceDir = path.join(STORIES_DIR, storyId);
  const targetDir = path.join(OLD_STORIES_DIR, storyId);

  // Ensure old-stories directory exists
  await fs.mkdir(OLD_STORIES_DIR, { recursive: true });

  // Move entire story directory
  await fs.rename(sourceDir, targetDir);

  console.log(`Migrated old story ${storyId} to old-stories/`);
}
```

### Batch Migration

```typescript
async function migrateAllOldStories(): Promise<string[]> {
  const storyIds = await listStoryIds();
  const migrated: string[] = [];

  for (const storyId of storyIds) {
    if (await isOldFormatStory(storyId)) {
      await migrateOldStory(storyId);
      migrated.push(storyId);
    }
  }

  return migrated;
}
```

### Load-Time Protection

When loading a story, check if it's old format:

```typescript
async function loadStory(storyId: string): Promise<Story> {
  if (await isOldFormatStory(storyId)) {
    throw new Error(
      `Story ${storyId} uses old format and is no longer supported. ` +
      `It has been moved to old-stories/ directory.`
    );
  }

  // Normal load logic
  return loadStoryInternal(storyId);
}
```

### Directory Structure

```
project/
├── stories/           # Active stories (new format)
│   └── story-abc/
├── old-stories/       # Archived stories (old format)
│   └── old-story-xyz/
└── ...
```

---

## Acceptance Criteria

### Tests That Must Pass

Create `test/integration/migration/story-migration.test.ts`:

```typescript
describe('Old story detection', () => {
  it('detects old-format story by missing activeStateChanges', async () => {
    await createOldFormatStory('test-old-story');

    const isOld = await isOldFormatStory('test-old-story');

    expect(isOld).toBe(true);
  });

  it('detects new-format story as not old', async () => {
    await createNewFormatStory('test-new-story');

    const isOld = await isOldFormatStory('test-new-story');

    expect(isOld).toBe(false);
  });

  it('handles story with mixed pages (still old)', async () => {
    // This shouldn't happen in practice, but if page 1 is old, it's old
    await createMixedFormatStory('test-mixed');

    const isOld = await isOldFormatStory('test-mixed');

    expect(isOld).toBe(true);
  });
});

describe('Story migration', () => {
  it('moves old-format story to old-stories/', async () => {
    await createOldFormatStory('test-old');

    await migrateOldStory('test-old');

    expect(await exists('stories/test-old')).toBe(false);
    expect(await exists('old-stories/test-old')).toBe(true);
  });

  it('preserves all story files during migration', async () => {
    await createOldFormatStory('test-old');
    // Create multiple pages
    await createOldFormatPage('test-old', 2);
    await createOldFormatPage('test-old', 3);

    await migrateOldStory('test-old');

    expect(await exists('old-stories/test-old/story.json')).toBe(true);
    expect(await exists('old-stories/test-old/page_1.json')).toBe(true);
    expect(await exists('old-stories/test-old/page_2.json')).toBe(true);
    expect(await exists('old-stories/test-old/page_3.json')).toBe(true);
  });

  it('leaves new-format stories in place', async () => {
    await createNewFormatStory('test-new');

    await migrateAllOldStories();

    expect(await exists('stories/test-new')).toBe(true);
    expect(await exists('old-stories/test-new')).toBe(false);
  });
});

describe('Load-time protection', () => {
  it('throws when loading old-format story', async () => {
    await createOldFormatStory('test-old');

    await expect(loadStory('test-old')).rejects.toThrow('old format');
  });

  it('loads new-format story normally', async () => {
    await createNewFormatStory('test-new');

    const story = await loadStory('test-new');

    expect(story).toBeDefined();
  });
});
```

Create `test/e2e/migration.test.ts`:

```typescript
describe('Migration E2E', () => {
  it('batch migrates all old stories on startup', async () => {
    // Create mix of old and new stories
    await createOldFormatStory('old-1');
    await createOldFormatStory('old-2');
    await createNewFormatStory('new-1');

    // Run migration
    const migrated = await migrateAllOldStories();

    expect(migrated).toContain('old-1');
    expect(migrated).toContain('old-2');
    expect(migrated).not.toContain('new-1');

    // Verify locations
    expect(await exists('old-stories/old-1')).toBe(true);
    expect(await exists('old-stories/old-2')).toBe(true);
    expect(await exists('stories/new-1')).toBe(true);
  });
});
```

### Invariants That Must Remain True

1. **No Data Loss**: Migrated stories are moved, not deleted
2. **New Stories Unaffected**: New-format stories remain in `stories/`
3. **Complete Move**: All files in story directory are moved together
4. **Idempotent**: Running migration twice has no additional effect
5. **Clear Errors**: Attempting to load old story gives clear error message
6. **Directory Creation**: `old-stories/` created automatically if needed

---

## Definition of Done

- [ ] `isOldFormatStory` detects old format correctly
- [ ] `migrateOldStory` moves story to `old-stories/`
- [ ] `migrateAllOldStories` processes all stories
- [ ] Story load fails gracefully for old format
- [ ] All migration tests pass
- [ ] E2E migration test passes
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
