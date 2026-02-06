# STOENG-005: Story Service

## Status

Completed (2026-02-06)

## Summary

Implement story-level operations including creating new stories, loading existing stories, listing all stories, deleting stories, and computing story statistics. This layer orchestrates story lifecycle management.

## Reassessed Assumptions (2026-02-06)

- `src/engine/story-service.ts` is not present and should be created in this ticket.
- `src/engine/page-service.ts` already exists (from STOENG-004) and returns `{ page, updatedStory }` from `generateFirstPage`.
- The current codebase uses extensionless TypeScript imports (for example `../models`) and `parsePageId(1)` rather than `1 as PageId` in most places.
- Integration tests for engine flows are tracked in `tickets/STOENG-008-integration-tests.md`; this ticket should focus on unit coverage for story-service behavior with mocks.
- Current branch already contains unrelated staged work from STOENG-004; this ticket should avoid touching those files.

## Updated Scope

- Create `src/engine/story-service.ts` with story lifecycle helpers used by later engine orchestration.
- Add `test/unit/engine/story-service.test.ts` with mocked dependencies that verify validation, cleanup-on-failure, delegation, and story stats.
- Keep changes limited to story service code/tests plus this ticket document.

## Files to Create/Modify

### Create
- `src/engine/story-service.ts`
- `test/unit/engine/story-service.test.ts`

### Modify
- `tickets/STOENG-005-story-service.md`

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify any files in `src/llm/`
- **DO NOT** create `src/engine/index.ts` (separate ticket)
- **DO NOT** modify `src/engine/page-service.ts` unless needed for compile compatibility
- **DO NOT** implement the main engine class (separate ticket)

## Implementation Details

Create `src/engine/story-service.ts` with the following exports:

### startNewStory

```typescript
export async function startNewStory(
  options: StartStoryOptions
): Promise<StartStoryResult>
```

- Validate characterConcept minimum length (10 chars), throw VALIDATION_FAILED
- Validate apiKey is present, throw VALIDATION_FAILED
- Create Story via `createStory` from models
- Save story first (creates directory) via `storage.saveStory`
- Generate first page via `generateFirstPage`
- Save first page via `storage.savePage`
- Update story if canon/arc changed
- On any failure: clean up by deleting story directory
- Return { story, page }

### loadStory

```typescript
export async function loadStory(storyId: StoryId): Promise<Story | null>
```

- Delegate to `storage.loadStory`
- Return null if not found

### getPage

```typescript
export async function getPage(
  storyId: StoryId,
  pageId: PageId
): Promise<Page | null>
```

- Delegate to `storage.loadPage`

### getStartingPage

```typescript
export async function getStartingPage(storyId: StoryId): Promise<Page | null>
```

- Load page 1 via `storage.loadPage(storyId, parsePageId(1))`

### listAllStories

```typescript
export async function listAllStories(): Promise<StoryMetadata[]>
```

- Delegate to `storage.listStories`

### deleteStory

```typescript
export async function deleteStory(storyId: StoryId): Promise<void>
```

- Delegate to `storage.deleteStory`

### getStoryStats

```typescript
export async function getStoryStats(storyId: StoryId): Promise<{
  pageCount: number;
  exploredBranches: number;
  totalBranches: number;
  hasEnding: boolean;
}>
```

- Load all pages via `storage.loadAllPages`
- Count pages, endings, explored/total branches
- Explored = choices with nextPageId !== null
- Total = all choices across all pages

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/engine/story-service.test.ts` (with mocked dependencies):

1. **startNewStory validation**
   - Throws VALIDATION_FAILED for short characterConcept
   - Throws VALIDATION_FAILED for missing apiKey
   - Calls createStory with correct options

2. **startNewStory cleanup on failure**
   - Deletes story directory if page generation fails
   - Propagates original error after cleanup

3. **loadStory**
   - Returns story when found
   - Returns null when not found

4. **getStartingPage**
   - Returns page 1
   - Returns null for non-existent story

5. **getStoryStats**
   - Counts pages correctly
   - Identifies explored vs unexplored branches
   - Detects endings
6. **Additional edge coverage**
   - Treats whitespace-only API keys as missing
   - Preserves original generation error after cleanup attempt

Integration-level behavior is covered by `tickets/STOENG-008-integration-tests.md` and is out of scope for this ticket.

### Invariants That Must Remain True

1. **Atomic creation**: Story + first page created together or not at all
2. **Cleanup on failure**: Failed creations don't leave orphan directories
3. **Character concept minimum**: At least 10 characters required
4. **API key required**: No story creation without API key
5. **Page 1 guarantee**: Every story has exactly one page 1

## Estimated Size

~160 lines of code + ~220 lines of tests

## Dependencies

- STOENG-001: Engine Types (StartStoryOptions, StartStoryResult, EngineError)
- STOENG-004: Page Service (generateFirstPage)
- Spec 02: Data Models (Story, StoryMetadata, createStory)
- Spec 03: Persistence (storage.saveStory, storage.loadStory, etc.)

## Outcome

Originally planned:
- Add story lifecycle service methods and broad test coverage for validation, cleanup, loading, listing, deletion, and story stats.

Actually changed:
- Added `src/engine/story-service.ts` with `startNewStory`, `loadStory`, `getPage`, `getStartingPage`, `listAllStories`, `deleteStory`, and `getStoryStats`.
- Implemented strict `EngineError` validation for short `characterConcept` and missing/whitespace API keys.
- Implemented cleanup-on-failure semantics that preserve the original creation error even if cleanup fails.
- Added `test/unit/engine/story-service.test.ts` with mocked dependencies covering acceptance criteria plus edge-case invariants.
- Verified with `npm run test:unit -- --coverage=false --testPathPattern=test/unit/engine/story-service.test.ts` and `npm run typecheck`.
