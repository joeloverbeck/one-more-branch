# STOENG-009: End-to-End Tests

## Summary

Implement E2E tests that simulate complete user journeys through multi-page story playthroughs. These tests verify the engine handles extended gameplay correctly.

## Files to Create/Modify

### Create
- `test/e2e/engine/full-playthrough.test.ts`

### Modify
- None

## Out of Scope

- **DO NOT** modify any source files in `src/`
- **DO NOT** create unit or integration tests (separate tickets)
- **DO NOT** test UI components (Spec 06)
- **DO NOT** test performance characteristics

## Implementation Details

### test/e2e/engine/full-playthrough.test.ts

Test complete multi-page story journeys:

1. **Complete 3+ page journey**
   - Start story with rich character concept
   - Make choice 0 repeatedly for determinism
   - Traverse at least 3 pages
   - Stop if hitting an ending
   - Verify stats show correct page count and explored branches
   - Verify replay returns to identical page 1

2. **Log journey for debugging**
   - Log story ID at start
   - Log choices available at each page
   - Log state changes at each page
   - Log final stats

### Test Setup

```typescript
const API_KEY = process.env.OPENROUTER_TEST_KEY;
const describeWithKey = API_KEY ? describe : describe.skip;

let testStoryId: StoryId;

afterAll(async () => {
  if (testStoryId) {
    try {
      await storyEngine.deleteStory(testStoryId);
    } catch {}
  }
});
```

### Journey Loop Pattern

```typescript
for (let i = 0; i < 3; i++) {
  const currentPage = await storyEngine.getPage(testStoryId, currentPageId);

  if (!currentPage || currentPage.isEnding) {
    console.log(`Story ended at page ${currentPageId}`);
    break;
  }

  const result = await storyEngine.makeChoice({
    storyId: testStoryId,
    pageId: currentPageId,
    choiceIndex: 0,
    apiKey: API_KEY!,
  });

  console.log(`Page ${result.page.id} (generated: ${result.wasGenerated})`);
  currentPageId = result.page.id;
}
```

## Acceptance Criteria

### Tests That Must Pass

1. **Full playthrough test**
   - `should complete a multi-page story journey` (300s timeout)
   - Creates story with detailed character concept
   - Traverses 3+ pages successfully
   - Stats show pageCount >= 4
   - Stats show exploredBranches >= 3
   - Replay returns identical page 1 content

### Invariants That Must Remain True

1. **State accumulation**: Each page has more accumulated state than parent
2. **Choice consistency**: Always making choice 0 produces deterministic path
3. **Ending handling**: If ending reached, page has no choices
4. **Stats accuracy**: pageCount matches actual pages created
5. **Replay fidelity**: Restarted story has identical page 1

## Estimated Size

~100 lines of tests

## Dependencies

- STOENG-007: Barrel Export (complete module)
- STOENG-008: Integration Tests (patterns to follow)
- All other STOENG tickets must be complete
- OPENROUTER_TEST_KEY environment variable

## Notes

- 5 minute timeout for full playthrough due to multiple LLM calls
- Uses afterAll instead of afterEach to keep story for manual inspection if needed
- Console logging for debugging test runs
- Character concepts prefixed with "E2E TEST:" for identification
