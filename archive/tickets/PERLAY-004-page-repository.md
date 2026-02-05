# PERLAY-004: Page Repository Module

## Status

- [ ] In progress
- [x] Completed

## Summary

Implement CRUD operations for Page entities, including choice link updates and accumulated state computation.

## Files to Create

- `src/persistence/page-repository.ts`

## Files to Touch

- `test/unit/persistence/page-repository.test.ts` (new)
- Optional export wiring only if needed by tests (no API-breaking changes)

## Dependencies (Must Be Completed First)

- **PERLAY-001**: file-utils.ts
- **PERLAY-002**: lock-manager.ts
- **PERLAY-003**: story-repository.ts (for creating test stories in unit tests)

## Assumption Reassessment

### Confirmed

- `specs/03-persistence-layer.md` defines per-page files as `stories/{storyId}/page_{id}.json`.
- `file-utils.ts` and `lock-manager.ts` already provide the primitives required by this ticket.
- `PERLAY-003` is already implemented and can be used to create/remove story directories for page repository tests.

### Corrected

- This repository currently has **no** `src/persistence/page-repository.ts`; this ticket should create it.
- There is currently **no** persistence facade (`storage.ts`) or persistence barrel (`src/persistence/index.ts`) in `src/persistence/`; those are out of scope.
- Integration, e2e, performance, and memory persistence tests are not present yet in this branch; this ticket should be satisfied with focused unit tests under `test/unit/persistence/`.
- Current repository style imports from `../models` and `./file-utils` (without `.js` extension); implementation should follow existing conventions.
- To preserve a persistence invariant parallel to story loading, page loading should validate that file content ID matches requested page ID.

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify `src/persistence/file-utils.ts`
- **DO NOT** modify `src/persistence/lock-manager.ts`
- **DO NOT** modify `src/persistence/story-repository.ts`
- **DO NOT** create the Storage facade class
- **DO NOT** create `src/persistence/storage.ts` or `src/persistence/index.ts`
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
   - Throw if `page_{requestedId}.json` contains a different internal `id`

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
   - Return IDs where `isEnding === true` (deterministic order preferred)

9. **`computeAccumulatedState(storyId: StoryId, pageId: PageId): Promise<AccumulatedState>`**
   - Load all pages
   - Traverse from root to target page
   - Accumulate stateChanges along path
   - Throw if target page does not exist or ancestry is broken

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

9. **ID consistency edge case (extra coverage)**
   - `loadPage` throws when persisted page ID does not match requested page ID

### Invariants That Must Remain True

1. **Atomic writes** - Page file either fully written or unchanged
2. **Lock safety** - Concurrent writes to same story are serialized
3. **ID consistency** - `page_N.json` contains page with `id: N`
4. **Immutable updates** - updateChoiceLink creates new choice array
5. **File naming** - Pages stored as `page_{id}.json`
6. **No orphans** - Choice links point to existing pages (validated elsewhere)

## Test Setup Requirements

- Create test stories with PERLAY-003's `saveStory` helper
- Clean up only stories created by this test file (prefer per-test cleanup for isolation)
- Do not delete unrelated story directories

## Imports Required

```typescript
import {
  Page,
  PageId,
  StoryId,
  AccumulatedState,
} from '../models';
import {
  getStoryDir,
  getPageFilePath,
  readJsonFile,
  writeJsonFile,
  listFiles,
  fileExists,
} from './file-utils';
import { withLock } from './lock-manager';
```

## Estimated Scope

- ~200 lines of implementation code
- ~200 lines of test code

## Outcome

- **Planned**: Add `src/persistence/page-repository.ts` with page CRUD/link/state helpers and unit tests for the module.
- **Actual**: Added `src/persistence/page-repository.ts` and `test/unit/persistence/page-repository.test.ts` with 11 unit tests covering save/load/update/exists/list/max-id/link-updates/ending-page-discovery/accumulated-state behavior.
- **Scope differences vs original**:
  - Added explicit ID consistency enforcement in `loadPage` and a dedicated unit test for mismatched persisted page IDs.
  - Kept scope limited to the new module and new unit test file; no changes to model APIs or existing persistence utility/story repository modules.
