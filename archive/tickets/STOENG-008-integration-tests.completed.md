# STOENG-008: Integration Tests

## Status

Completed (2026-02-06)

## Summary

Implement integration tests that verify Story Engine behavior across real persistence operations with deterministic LLM stubs. These tests exercise the flow from story creation through branching/replay while avoiding live network dependencies.

## Reassessed Assumptions (2026-02-06)

- `test/integration/engine/` does not exist yet and should be created by this ticket.
- Existing integration tests in this repository are deterministic and do not call external services directly.
- `specs/05-story-engine.md` includes examples that use `OPENROUTER_TEST_KEY`, but this repository's integration style currently favors mocked `fetch`/LLM for repeatability.
- Requiring a live OpenRouter key here would create flaky tests and conflict with the current local/CI-friendly integration patterns.
- Engine APIs needed by this ticket already exist (`startStory`, `makeChoice`, `restartStory`, `loadStory`, `listStories`, `deleteStory`).

## Files to Create/Modify

### Create
- `test/integration/engine/story-engine.test.ts`
- `test/integration/engine/replay.test.ts`

### Modify
- `tickets/STOENG-008-integration-tests.md`

## Updated Scope

- Add integration tests that use:
  - Real filesystem persistence (`src/persistence`)
  - Real engine orchestration (`src/engine`)
  - Mocked LLM generation (`src/llm` exports) with deterministic outputs
- Validate deterministic replay and branch isolation via persistence-backed operations.
- Keep source changes minimal and test-only unless a concrete test failure requires a source fix.

## Out of Scope

- **DO NOT** require live network calls to OpenRouter
- **DO NOT** require `OPENROUTER_TEST_KEY` for these tests
- **DO NOT** create E2E tests (separate ticket)
- **DO NOT** modify test configuration files
- **DO NOT** create performance tests

## Implementation Details

### test/integration/engine/story-engine.test.ts

Test main engine operations with deterministic LLM stubs:

1. **Create new story with first page**
   - Verify story has correct metadata
   - Verify page 1 has narrative, choices, state changes
   - Verify page 1 is not an ending (has 2+ choices)

2. **Make choice and generate new page**
   - Verify page 2 is created with correct ID
   - Verify wasGenerated is true
   - Verify parent linkage is correct

3. **Load existing page without regeneration**
   - First call generates, second call loads
   - wasGenerated is false on second call
   - Content is identical between calls

4. **Branch isolation**
   - Different choices create different pages
   - Page IDs are different
   - Narrative content is different
   - Both have same parent page

### test/integration/engine/replay.test.ts

Test replay and persistence features:

1. **Restart story from page 1**
   - Navigate away from page 1
   - Call restartStory
   - Verify returns page 1 with identical content

2. **Persist across engine instances**
   - Create story with one engine
   - Create new StoryEngine instance
   - Load story - verify identical

3. **Story listing includes created stories**
   - Create story
   - List stories
   - Verify created story in list

## Test Setup

```typescript
let testStoryId: StoryId;

afterEach(async () => {
  if (testStoryId) {
    try {
      await storyEngine.deleteStory(testStoryId);
    } catch {}
  }
});
```

LLM functions should be mocked with deterministic responses keyed on `selectedChoice` so branch behavior is stable across runs.

## Acceptance Criteria

### Tests That Must Pass

1. **story-engine.test.ts**
   - `should create new story with first page` (60s timeout)
   - `should make choice and generate new page` (120s timeout)
   - `should load existing page without regeneration` (120s timeout)
   - `should maintain branch isolation` (180s timeout)

2. **replay.test.ts**
   - `should restart story from page 1` (120s timeout)
   - `should persist story across engine instances` (60s timeout)

### Invariants That Must Remain True

1. **No external dependency**: Tests pass without OPENROUTER_TEST_KEY
2. **Cleanup after each**: Test stories deleted even on failure
3. **Deterministic replay**: Same path yields same content
4. **Persistence correctness**: Saved data loads identically
5. **Branch independence**: Different choices don't affect each other

## Estimated Size

~300 lines of tests

## Dependencies

- STOENG-007: Barrel Export (complete module)
- All other STOENG tickets must be complete

## Notes

- Tests should run offline with deterministic stubs
- Each test creates and cleans up its own story
- Tests should use unique character concepts for traceability

## Outcome

Originally planned:
- Integration tests coupled to live OpenRouter calls and `OPENROUTER_TEST_KEY`.

Actually changed:
- Added `test/integration/engine/story-engine.test.ts` and `test/integration/engine/replay.test.ts` using real engine + persistence with mocked deterministic LLM outputs.
- Preserved public APIs and made no `src/` changes.
- Verified via `npm run test:integration -- --testPathPattern=test/integration/engine` (all integration suites passed under this script invocation).
