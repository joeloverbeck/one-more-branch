# PERLAY-006: Integration Tests

## Summary

Create integration tests that verify the persistence layer works correctly when components interact together.

## Files to Create

- `test/integration/persistence/story-repository.test.ts`
- `test/integration/persistence/page-repository.test.ts`

## Files to Touch

- None

## Dependencies (Must Be Completed First)

- **PERLAY-001** through **PERLAY-005**: All persistence implementation

## Out of Scope

- **DO NOT** modify any source files
- **DO NOT** create E2E tests (separate ticket)
- **DO NOT** create performance tests (separate ticket)
- **DO NOT** test failure scenarios that require mocking (keep pure integration)

## Implementation Details

### Story Repository Integration Tests

`test/integration/persistence/story-repository.test.ts`:

Test multi-operation workflows:

1. **Save and load round-trip**
   - Create story with all fields populated
   - Save to disk
   - Load from disk
   - Verify all fields match

2. **Story lifecycle**
   - Create → Save → Update → Load → Delete
   - Verify each state transition

3. **List stories**
   - Create multiple stories
   - List returns all with correct metadata
   - Sorted by createdAt descending

4. **Story with pages**
   - Create story
   - Add multiple pages
   - `getPageCount` returns correct count
   - Delete story removes all pages

5. **Concurrent story operations**
   - Save multiple different stories concurrently
   - No interference between stories

### Page Repository Integration Tests

`test/integration/persistence/page-repository.test.ts`:

Test multi-operation workflows:

1. **Save and load round-trip**
   - Create page with all fields
   - Save to disk
   - Load from disk
   - Verify all fields match

2. **Multiple pages in story**
   - Create story
   - Save pages 1, 2, 3
   - `loadAllPages` returns all three
   - `getMaxPageId` returns 3

3. **Choice linking workflow**
   - Save page 1 with unexplored choices
   - Save page 2 as child of page 1
   - `updateChoiceLink` links page 1 choice to page 2
   - Reload and verify link persists

4. **Accumulated state computation**
   - Create chain: page 1 → page 2 → page 3
   - Each has stateChanges
   - `computeAccumulatedState(3)` includes all changes

5. **Finding ending pages**
   - Create story with mix of endings and non-endings
   - `findEndingPages` returns only ending page IDs

### Test Patterns

```typescript
describe('Story Repository Integration', () => {
  afterEach(async () => {
    // Clean up TEST: stories
    const stories = await listStories();
    for (const story of stories) {
      if (story.characterConcept.startsWith('TEST:')) {
        await deleteStory(story.id);
      }
    }
  });

  it('should handle complete story lifecycle', async () => {
    // Create
    const story = createStory({
      characterConcept: 'TEST: Integration Hero',
      worldbuilding: 'Test world',
      tone: 'test',
    });

    // Save
    await saveStory(story);
    expect(await storyExists(story.id)).toBe(true);

    // Load
    const loaded = await loadStory(story.id);
    expect(loaded?.id).toBe(story.id);

    // Update
    const updated = { ...loaded!, globalCanon: ['New fact'] };
    await updateStory(updated);
    const reloaded = await loadStory(story.id);
    expect(reloaded?.globalCanon).toEqual(['New fact']);

    // Delete
    await deleteStory(story.id);
    expect(await storyExists(story.id)).toBe(false);
  });
});
```

## Acceptance Criteria

### Tests That Must Pass

**Story Repository Integration** (5 test cases):
1. Save/load round-trip with all fields
2. Complete lifecycle (create → update → delete)
3. List multiple stories with metadata
4. Page count tracking
5. Concurrent story saves (no interference)

**Page Repository Integration** (5 test cases):
1. Save/load round-trip with all fields
2. Multiple pages with loadAllPages
3. Choice linking workflow
4. Accumulated state computation
5. Finding ending pages

### Invariants That Must Remain True

1. **Data integrity** - Saved data matches loaded data exactly
2. **Isolation** - Operations on one story don't affect others
3. **Cleanup** - TEST: prefix stories removed after each test
4. **File structure** - Directory structure matches spec
5. **No orphans** - Deleting story removes all associated files

## Test Data Conventions

- All test stories use `characterConcept` starting with `TEST:`
- All test stories cleaned up in `afterEach`
- Tests must not depend on order of execution
- Tests must not depend on other stories existing

## Estimated Scope

- ~200 lines test code (story-repository.test.ts)
- ~200 lines test code (page-repository.test.ts)
