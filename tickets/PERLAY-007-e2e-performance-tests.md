# PERLAY-007: E2E and Performance Tests

## Summary

Create end-to-end tests validating full persistence workflows and performance tests ensuring concurrent operations are safe and performant.

## Files to Create

- `test/e2e/persistence/data-integrity.test.ts`
- `test/performance/persistence/concurrent-writes.test.ts`

## Files to Touch

- None

## Dependencies (Must Be Completed First)

- **PERLAY-001** through **PERLAY-006**: All persistence implementation and integration tests

## Out of Scope

- **DO NOT** modify any source files
- **DO NOT** modify integration tests
- **DO NOT** test with external services (Redis, etc.)
- **DO NOT** test multi-process scenarios (single-process only)

## Implementation Details

### E2E Data Integrity Tests

`test/e2e/persistence/data-integrity.test.ts`:

Full workflow simulating real application usage:

1. **Complete story creation workflow**
   - Initialize storage
   - Create story
   - Add first page with choices
   - Add child pages
   - Link choices to child pages
   - Verify all data persists and links are correct

2. **Story branching integrity**
   - Create story with page 1 having 3 choices
   - Create pages 2, 3, 4 as children of page 1
   - Verify accumulated state different for each branch
   - Verify choice links correct

3. **Reload from disk**
   - Create story with pages
   - "Restart" by creating new Storage instance
   - Load story and all pages
   - Verify complete data integrity

4. **Delete cascade**
   - Create story with multiple pages
   - Delete story
   - Verify story and all pages gone
   - Verify directory removed

### Performance Tests

`test/performance/persistence/concurrent-writes.test.ts`:

Stress test concurrent operations:

1. **Concurrent page saves (same story)**
   - Create story with page 1
   - Spawn 10 concurrent page save operations
   - All pages saved correctly
   - No data corruption

2. **Concurrent story saves (different stories)**
   - Spawn 10 concurrent story creation operations
   - All stories created correctly
   - No interference between stories

3. **Read-write concurrency**
   - Start writing pages
   - Concurrently read pages
   - No read errors
   - Written data eventually visible

4. **Lock contention handling**
   - Many writes to same story
   - All complete eventually
   - FIFO order maintained
   - No deadlocks

### Test Patterns

```typescript
describe('Data Integrity E2E', () => {
  it('should maintain story integrity across operations', async () => {
    storage.init();

    // Create story
    const story = createStory({
      characterConcept: 'E2E TEST: Integrity check character',
      worldbuilding: 'A test world',
      tone: 'test tone',
    });
    await storage.saveStory(story);

    // Add page 1
    const page1 = createPage({
      id: 1 as PageId,
      narrativeText: 'Page 1 narrative',
      choices: [createChoice('Option A'), createChoice('Option B')],
      stateChanges: [],
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
    });
    await storage.savePage(story.id, page1);

    // Add page 2 as child
    const page2 = createPage({
      id: 2 as PageId,
      narrativeText: 'Page 2 narrative',
      choices: [createChoice('Continue')],
      stateChanges: ['Player chose A'],
      isEnding: false,
      parentPageId: 1 as PageId,
      parentChoiceIndex: 0,
      parentAccumulatedState: page1.accumulatedState,
    });
    await storage.savePage(story.id, page2);

    // Link pages
    await storage.updateChoiceLink(story.id, 1 as PageId, 0, 2 as PageId);

    // Verify integrity
    const loadedPage1 = await storage.loadPage(story.id, 1 as PageId);
    expect(loadedPage1?.choices[0]?.nextPageId).toBe(2);

    const loadedPage2 = await storage.loadPage(story.id, 2 as PageId);
    expect(loadedPage2?.accumulatedState.changes).toEqual(['Player chose A']);

    // Cleanup
    await storage.deleteStory(story.id);
  });
});
```

```typescript
describe('Concurrent Write Performance', () => {
  it('should handle concurrent page saves without corruption', async () => {
    storage.init();

    const story = createStory({ characterConcept: 'PERF TEST: Concurrent' });
    await storage.saveStory(story);

    // Create page 1 first
    const page1 = createPage({
      id: 1 as PageId,
      narrativeText: 'Start',
      choices: [createChoice('A'), createChoice('B'), createChoice('C'), createChoice('D')],
      stateChanges: [],
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
    });
    await storage.savePage(story.id, page1);

    // Concurrent saves
    const saves = Array.from({ length: 10 }, async (_, i) => {
      const page = createPage({
        id: (i + 2) as PageId,
        narrativeText: `Page ${i + 2} content`,
        choices: [createChoice('Continue')],
        stateChanges: [`Event ${i + 2}`],
        isEnding: false,
        parentPageId: 1 as PageId,
        parentChoiceIndex: i % 4,
      });
      return storage.savePage(story.id, page);
    });

    await Promise.all(saves);

    // Verify all pages saved
    const pages = await storage.loadAllPages(story.id);
    expect(pages.size).toBe(11);

    // Verify content integrity
    for (let i = 2; i <= 11; i++) {
      const page = pages.get(i as PageId);
      expect(page?.narrativeText).toBe(`Page ${i} content`);
    }

    // Cleanup
    await storage.deleteStory(story.id);
  }, 30000);
});
```

## Acceptance Criteria

### Tests That Must Pass

**E2E Data Integrity** (4 test cases):
1. Complete story creation workflow with linking
2. Story branching with different accumulated states
3. Reload from disk maintains integrity
4. Delete cascade removes all data

**Performance/Concurrency** (4 test cases):
1. 10 concurrent page saves to same story - no corruption
2. 10 concurrent story saves - no interference
3. Concurrent reads and writes - no errors
4. Lock contention - FIFO order, no deadlocks

### Invariants That Must Remain True

1. **No data corruption** - All concurrent operations complete correctly
2. **FIFO locking** - Operations execute in order acquired
3. **Complete cleanup** - Delete removes all associated data
4. **Reload consistency** - Fresh load matches original data
5. **Branching isolation** - Different branches have correct accumulated state

### Performance Requirements

- Concurrent save test should complete within 30 seconds
- No operations should timeout
- No memory leaks from lock queuing

## Test Data Conventions

- E2E tests use `E2E TEST:` prefix
- Performance tests use `PERF TEST:` prefix
- All tests clean up after themselves
- Extended timeout (30s) for performance tests

## Estimated Scope

- ~150 lines test code (data-integrity.test.ts)
- ~150 lines test code (concurrent-writes.test.ts)
