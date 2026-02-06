# STOENG-006: Story Engine Class

## Status

Completed (2026-02-06)

## Summary

Implement the main `StoryEngine` facade that orchestrates existing engine services and exposes a unified API for story operations.

## Reassessed Assumptions (2026-02-06)

- `src/engine/story-engine.ts` did not exist and was created in this ticket.
- Lower-level dependencies already existed and were unit-tested:
  - `src/engine/story-service.ts`
  - `src/engine/page-service.ts`
  - `src/engine/types.ts`
- Engine barrel export remains intentionally separate (`tickets/STOENG-007-barrel-export.md`), so this ticket did not create/modify `src/engine/index.ts`.
- Integration and E2E engine tests remain separate (`tickets/STOENG-008-integration-tests.md`, `tickets/STOENG-009-e2e-tests.md`).
- Current code style uses extensionless TypeScript imports and branded id helpers like `parsePageId(1)`.

## Updated Scope

- Create `src/engine/story-engine.ts` implementing the `StoryEngine` class and singleton export.
- Add focused unit tests for story-engine orchestration/validation behavior with mocked dependencies.
- Keep changes limited to story-engine code/tests and this ticket document.

## Files Created/Modified

### Created
- `src/engine/story-engine.ts`
- `test/unit/engine/story-engine.test.ts`

### Modified
- `tickets/STOENG-006-story-engine.md`

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify any files in `src/llm/`
- **DO NOT** create `src/engine/index.ts` (separate ticket)
- **DO NOT** add integration/e2e tests in this ticket

## Implementation Details

Added `src/engine/story-engine.ts` with:

- `init()` delegating to `storage.init()`
- `startStory()` delegating to `startNewStory()`
- `makeChoice()` orchestration and validations:
  - `STORY_NOT_FOUND` when story missing
  - `PAGE_NOT_FOUND` when page missing
  - `INVALID_CHOICE` when attempting choices on ending pages
  - `INVALID_CHOICE` for out-of-bounds choice index
  - delegation to `getOrGeneratePage()` and return of `{ page, wasGenerated }`
- Delegation methods for `loadStory`, `getPage`, `getStartingPage`, `listStories`, `deleteStory`, and `getStoryStats`
- `restartStory()` returning starting page or `PAGE_NOT_FOUND`
- `storyExists()` delegation to storage
- `getFullStory()` returning `null` for missing stories, otherwise `{ story, pages }`
- Singleton export: `storyEngine`

## Acceptance Criteria

### Unit Tests Implemented

Created `test/unit/engine/story-engine.test.ts` with mocked dependencies covering:

1. `init()` calls `storage.init()`
2. `makeChoice()` validation:
   - Throws `STORY_NOT_FOUND` for missing story
   - Throws `PAGE_NOT_FOUND` for missing page
   - Throws `INVALID_CHOICE` for out-of-bounds index
   - Throws `INVALID_CHOICE` on ending page
3. `makeChoice()` delegation:
   - Calls `getOrGeneratePage` with expected params
   - Returns `MakeChoiceResult`
4. `restartStory()`:
   - Returns starting page when present
   - Throws `PAGE_NOT_FOUND` when absent
5. `getFullStory()`:
   - Returns story and pages when story exists
   - Returns `null` when story does not exist
6. Additional orchestration coverage:
   - `storyExists()` delegates to storage
   - `startStory()`, `listStories()`, `deleteStory()`, and `getStoryStats()` delegate correctly

### Verification Run

- `npm run test:unit -- --coverage=false --testPathPattern=test/unit/engine/story-engine.test.ts`
- `npm run typecheck`

## Invariants Preserved

1. **Stateless engine**: `StoryEngine` orchestrates service/persistence calls only
2. **API key never stored**: API key remains operation-scoped in method calls
3. **Error consistency**: validation/orchestration errors use `EngineError` typed codes
4. **Singleton pattern**: single `storyEngine` instance exported
5. **Ending enforcement**: `makeChoice()` rejects choices on ending pages

## Outcome

Originally planned:
- Add the `StoryEngine` facade plus unit coverage for orchestration and validation behavior.

Actually changed:
- Added `src/engine/story-engine.ts` with the full facade and singleton export.
- Added `test/unit/engine/story-engine.test.ts` for orchestration/validation/delegation coverage.
- Applied one minimal behavioral refinement discovered during testing: `makeChoice()` now checks `isEnding` before index bounds, ensuring explicit ending-page enforcement even when ending pages have zero choices.
- Confirmed behavior and compile safety with targeted unit test run and typecheck.
