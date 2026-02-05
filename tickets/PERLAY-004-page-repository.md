# PERLAY-004: Page Repository Module

## Summary

Implement CRUD operations for Page entities, including choice link updates and accumulated state computation.

## Files to Create

- `src/persistence/page-repository.ts`

## Files to Touch

- None (new module)

## Dependencies (Must Be Completed First)

- **PERLAY-001**: file-utils.ts
- **PERLAY-002**: lock-manager.ts
- **PERLAY-003**: story-repository.ts (for integration tests)

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify `src/persistence/file-utils.ts`
- **DO NOT** modify `src/persistence/lock-manager.ts`
- **DO NOT** modify `src/persistence/story-repository.ts`
- **DO NOT** create the Storage facade class
- **DO NOT** implement page deletion (pages are immutable once created)

## Implementation Details

### File Data Interface

```typescript
interface PageFileData {
  id: number;
  narrativeText: string;
  choices: Array<{
    text: string;
    nextPageId: number | null;
  }>;
  stateChanges: string[];
  accumulatedState: {
    changes: string[];
  };
  isEnding: boolean;
  parentPageId: number | null;
  parentChoiceIndex: number | null;
}
```

### Conversion Functions

1. **`pageToFileData(page: Page): PageFileData`**
   - Copy arrays for immutability
   - Convert branded types to raw numbers

2. **`fileDataToPage(data: PageFileData): Page`**
   - Cast numbers to branded PageId types

### Repository Functions

1. **`savePage(storyId: StoryId, page: Page): Promise<void>`**
   - Use `withLock(storyId, ...)`
   - Write `page_{id}.json`

2. **`updatePage(storyId: StoryId, page: Page): Promise<void>`**
   - Same as savePage (pages are overwritten)

3. **`loadPage(storyId: StoryId, pageId: PageId): Promise<Page | null>`**
   - No lock needed
   - Return `null` if not found

4. **`pageExists(storyId: StoryId, pageId: PageId): Promise<boolean>`**
   - Check if page file exists

5. **`loadAllPages(storyId: StoryId): Promise<Map<PageId, Page>>`**
   - List all `page_*.json` files
   - Load each and build map

6. **`getMaxPageId(storyId: StoryId): Promise<number>`**
   - Parse all page file names
   - Return highest ID (0 if no pages)

7. **`updateChoiceLink(storyId: StoryId, pageId: PageId, choiceIndex: number, nextPageId: PageId): Promise<void>`**
   - Use `withLock`
   - Load page, update single choice, save
   - Throw if page not found
   - Throw if choiceIndex invalid

8. **`findEndingPages(storyId: StoryId): Promise<PageId[]>`**
   - Load all pages
   - Return IDs where `isEnding === true`

9. **`computeAccumulatedState(storyId: StoryId, pageId: PageId): Promise<AccumulatedState>`**
   - Load all pages
   - Traverse from root to target page
   - Accumulate stateChanges along path

### Key Behaviors

- Page IDs in file names must match internal ID: `page_5.json` contains `id: 5`
- `loadAllPages` uses regex `/^page_(\d+)\.json$/` to find pages
- Choice updates create new array (immutability), not mutate

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/persistence/page-repository.test.ts`:

1. **Serialization**
   - `pageToFileData` converts Page correctly
   - `fileDataToPage` restores Page with branded types
   - Round-trip preserves all fields

2. **savePage/loadPage**
   - Saved page can be loaded
   - All fields preserved (id, narrativeText, choices, stateChanges, accumulatedState, isEnding, parentPageId, parentChoiceIndex)
   - Loading non-existent page returns `null`

3. **pageExists**
   - Returns `true` for existing page
   - Returns `false` for non-existent page

4. **loadAllPages**
   - Returns all pages in story
   - Map keys are PageId branded types
   - Empty map for story with no pages

5. **getMaxPageId**
   - Returns 0 for story with no pages
   - Returns highest ID when pages exist

6. **updateChoiceLink**
   - Updates correct choice's nextPageId
   - Other choices unchanged
   - Throws for invalid page
   - Throws for invalid choice index

7. **findEndingPages**
   - Returns empty array if no endings
   - Returns correct PageIds for ending pages

8. **computeAccumulatedState**
   - Root page has only its own stateChanges
   - Child page accumulates parent's changes
   - Multi-level ancestry accumulated correctly

### Invariants That Must Remain True

1. **Atomic writes** - Page file either fully written or unchanged
2. **Lock safety** - Concurrent writes to same story are serialized
3. **ID consistency** - `page_N.json` contains page with `id: N`
4. **Immutable updates** - updateChoiceLink creates new choice array
5. **File naming** - Pages stored as `page_{id}.json`
6. **No orphans** - Choice links point to existing pages (validated elsewhere)

## Test Setup Requirements

- Create test story in `beforeAll`
- Clean up test story in `afterAll`
- Use story created by PERLAY-003's `saveStory` function

## Imports Required

```typescript
import {
  Page,
  PageId,
  StoryId,
  AccumulatedState,
} from '../models/index.js';
import {
  getStoryDir,
  getPageFilePath,
  readJsonFile,
  writeJsonFile,
  listFiles,
  fileExists,
} from './file-utils.js';
import { withLock } from './lock-manager.js';
```

## Estimated Scope

- ~200 lines of implementation code
- ~200 lines of test code
