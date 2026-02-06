# STOENG-009: End-to-End Tests

## Status

Completed (2026-02-06)

## Summary

Implement E2E tests that simulate complete user journeys through multi-page story playthroughs. These tests verify the engine handles extended gameplay correctly.

## Reassessed Assumptions (2026-02-06)

- `test/e2e/engine/` does not exist yet and must be created.
- Engine APIs to use are `startStory`, `makeChoice`, `getPage`, `getStoryStats`, `restartStory`, and `deleteStory`.
- A live model can end a story early, so requiring `pageCount >= 4` and `exploredBranches >= 3` in every run is too strict.
- Determinism in this codebase is guaranteed for replaying an already-linked choice path, not for predicting live model outputs before generation.
- `OPENROUTER_TEST_KEY` gating is required for live E2E generation tests.

## Files to Create/Modify

### Create
- `test/e2e/engine/full-playthrough.test.ts`

### Modify
- `tickets/STOENG-009-e2e-tests.md`

## Updated Scope

- Add live E2E engine tests in `test/e2e/engine/full-playthrough.test.ts`.
- Validate full-playthrough invariants that remain true even when a run hits an early ending.
- Keep changes test-only unless a concrete source bug is found.

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
   - Attempt up to 3 continuation steps
   - Stop if hitting an ending
   - Verify stats align with actual pages visited/generated
   - Verify replay returns to identical page 1
   - Verify re-selecting the same already-linked choice returns the same next page

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
   - Attempts up to 3 continuation steps unless an ending is reached
   - If no ending reached in-loop: at least 4 pages exist
   - If ending reached early: ending page has zero choices
   - Stats reflect generated path size and explored links
   - Replay returns identical page 1 content

### Invariants That Must Remain True

1. **State accumulation**: Child accumulated state preserves parent history (prefix)
2. **Choice consistency**: Replaying the same already-linked choice returns identical next page
3. **Ending handling**: If ending reached, page has no choices
4. **Stats accuracy**: pageCount matches actual pages created in the story
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

## Outcome

Originally planned:
- Add one E2E full-playthrough test with fixed thresholds (`pageCount >= 4`, `exploredBranches >= 3`).

Actually changed:
- Corrected ticket assumptions to match existing API and live-generation behavior.
- Added `test/e2e/engine/full-playthrough.test.ts` with:
  - A full-playthrough test that attempts 3 continuation steps, handles early endings, validates stats/state/restart invariants, and validates replay on already-linked choices.
  - An additional deterministic replay test for an already-linked root choice.
- No `src/` code changes were required.
