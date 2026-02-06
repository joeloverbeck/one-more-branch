# STOENG-008: Integration Tests

## Summary

Implement comprehensive integration tests that verify the Story Engine works correctly with real persistence and LLM operations. These tests exercise the complete flow from story creation through multi-page gameplay.

## Files to Create/Modify

### Create
- `test/integration/engine/story-engine.test.ts`
- `test/integration/engine/replay.test.ts`

### Modify
- None

## Out of Scope

- **DO NOT** modify any source files in `src/`
- **DO NOT** create E2E tests (separate ticket)
- **DO NOT** modify test configuration files
- **DO NOT** create performance tests

## Implementation Details

### test/integration/engine/story-engine.test.ts

Test the main engine operations with real LLM calls:

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
const API_KEY = process.env.OPENROUTER_TEST_KEY;
const describeWithKey = API_KEY ? describe : describe.skip;

let testStoryId: StoryId;

afterEach(async () => {
  if (testStoryId) {
    try {
      await storyEngine.deleteStory(testStoryId);
    } catch {}
  }
});
```

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

1. **API key required**: Tests skip if OPENROUTER_TEST_KEY not set
2. **Cleanup after each**: Test stories deleted even on failure
3. **Deterministic replay**: Same path yields same content
4. **Persistence correctness**: Saved data loads identically
5. **Branch independence**: Different choices don't affect each other

## Estimated Size

~300 lines of tests

## Dependencies

- STOENG-007: Barrel Export (complete module)
- All other STOENG tickets must be complete
- OPENROUTER_TEST_KEY environment variable for execution

## Notes

- Tests require valid OpenRouter API key
- Long timeouts due to LLM API calls
- Each test creates and cleans up its own story
- Tests should use unique character concepts for traceability
