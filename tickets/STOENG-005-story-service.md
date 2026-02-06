# STOENG-005: Story Service

## Summary

Implement story-level operations including creating new stories, loading existing stories, listing all stories, deleting stories, and computing story statistics. This layer orchestrates story lifecycle management.

## Files to Create/Modify

### Create
- `src/engine/story-service.ts`

### Modify
- None

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify any files in `src/llm/`
- **DO NOT** create `src/engine/index.ts` (separate ticket)
- **DO NOT** implement page-level operations (separate ticket)
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

- Load page 1 via `storage.loadPage(storyId, 1 as PageId)`

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

### Integration Tests (require API key)

Create `test/integration/engine/story-service.test.ts`:

1. **Full story creation**
   - Creates story with first page
   - Story is loadable after creation
   - First page has valid content

2. **Story listing**
   - Created stories appear in list
   - Metadata is accurate

3. **Story deletion**
   - Deleted stories not loadable
   - Deleted stories not in list

### Invariants That Must Remain True

1. **Atomic creation**: Story + first page created together or not at all
2. **Cleanup on failure**: Failed creations don't leave orphan directories
3. **Character concept minimum**: At least 10 characters required
4. **API key required**: No story creation without API key
5. **Page 1 guarantee**: Every story has exactly one page 1

## Estimated Size

~180 lines of code + ~200 lines of tests

## Dependencies

- STOENG-001: Engine Types (StartStoryOptions, StartStoryResult, EngineError)
- STOENG-004: Page Service (generateFirstPage)
- Spec 02: Data Models (Story, StoryMetadata, createStory)
- Spec 03: Persistence (storage.saveStory, storage.loadStory, etc.)
