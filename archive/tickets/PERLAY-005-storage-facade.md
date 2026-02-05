# PERLAY-005: Storage Facade and Module Exports

## Status

- [ ] In progress
- [x] Completed

## Summary

Create the Storage facade class that provides a unified interface to all persistence operations, and the index.ts barrel file for module exports.

## Files to Create

- `src/persistence/storage.ts`
- `src/persistence/index.ts`

## Files to Touch

- `test/unit/persistence/storage.test.ts` (new)

## Dependencies (Must Be Completed First)

- **PERLAY-001**: file-utils.ts
- **PERLAY-002**: lock-manager.ts
- **PERLAY-003**: story-repository.ts
- **PERLAY-004**: page-repository.ts

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** refactor internals of existing persistence repository/utility modules
- **DO NOT** add new functionality beyond what repositories provide
- **DO NOT** add caching or optimization logic

## Assumption Reassessment

### Confirmed

- `src/persistence/storage.ts` and `src/persistence/index.ts` are currently missing and must be created.
- Dependencies from PERLAY-001 through PERLAY-004 are already implemented and available.
- `specs/03-persistence-layer.md` expects a persistence facade plus barrel exports.

### Corrected

- The repository already has comprehensive unit tests for the existing persistence modules; this ticket should add focused tests for the new facade/barrel rather than only structure checks.
- Existing source style uses extensionless relative imports (for example `../models`, `./story-repository`), so `.js` suffixed imports in this ticket should not be followed.
- "New files only" is inaccurate for test scope because adding `test/unit/persistence/storage.test.ts` is required to validate behavior.

## Revised Scope

1. Add `src/persistence/storage.ts` as a pure delegation facade over existing repository functions with synchronous `init()`.
2. Add `src/persistence/index.ts` barrel exports for storage facade, persistence helpers, and repository functions.
3. Add `test/unit/persistence/storage.test.ts` covering singleton consistency, `init()`, delegation behavior, and barrel export completeness.
4. Preserve current public APIs in existing persistence modules (no breaking changes).

## Implementation Details

### Storage Class (`storage.ts`)

The Storage class is a facade that delegates to the repository functions:

```typescript
export class Storage {
  init(): void {
    ensureStoriesDir();
  }

  // Story operations - delegate to story-repository
  async saveStory(story: Story): Promise<void>
  async updateStory(story: Story): Promise<void>
  async loadStory(storyId: StoryId): Promise<Story | null>
  async storyExists(storyId: StoryId): Promise<boolean>
  async deleteStory(storyId: StoryId): Promise<void>
  async listStories(): Promise<StoryMetadata[]>
  async getPageCount(storyId: StoryId): Promise<number>

  // Page operations - delegate to page-repository
  async savePage(storyId: StoryId, page: Page): Promise<void>
  async updatePage(storyId: StoryId, page: Page): Promise<void>
  async loadPage(storyId: StoryId, pageId: PageId): Promise<Page | null>
  async pageExists(storyId: StoryId, pageId: PageId): Promise<boolean>
  async loadAllPages(storyId: StoryId): Promise<Map<PageId, Page>>
  async getMaxPageId(storyId: StoryId): Promise<number>
  async updateChoiceLink(storyId: StoryId, pageId: PageId, choiceIndex: number, nextPageId: PageId): Promise<void>
  async findEndingPages(storyId: StoryId): Promise<PageId[]>
  async computeAccumulatedState(storyId: StoryId, pageId: PageId): Promise<{ changes: string[] }>
}

// Singleton instance
export const storage = new Storage();
```

### Index Exports (`index.ts`)

Export everything needed by consumers:

```typescript
// Storage facade
export { Storage, storage } from './storage.js';

// File utilities (selective)
export {
  STORIES_DIR,
  ensureStoriesDir,
  getStoryDir,
  getStoryFilePath,
  getPageFilePath,
} from './file-utils.js';

// Lock manager
export { lockManager, withLock } from './lock-manager.js';

// Story repository functions
export {
  saveStory,
  updateStory,
  loadStory,
  storyExists,
  deleteStory,
  listStories,
  getPageCount,
} from './story-repository.js';

// Page repository functions
export {
  savePage,
  updatePage,
  loadPage,
  pageExists,
  loadAllPages,
  getMaxPageId,
  updateChoiceLink,
  findEndingPages,
  computeAccumulatedState,
} from './page-repository.js';
```

### Key Design Decisions

1. **Singleton pattern** - `storage` instance for convenience
2. **Pure delegation** - No additional logic in Storage class
3. **Comprehensive exports** - Both class methods and standalone functions available
4. **Synchronous init** - `init()` is synchronous, can be called at startup

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/persistence/storage.test.ts`:

1. **Storage class instantiation**
   - `new Storage()` creates instance
   - `storage` singleton exists

2. **init() method**
   - Creates `stories/` directory if not exists
   - Doesn't throw if directory already exists

3. **Method delegation** (verify methods exist and call through)
   - `saveStory`, `updateStory`, `loadStory`, `storyExists`, `deleteStory`
   - `listStories`, `getPageCount`
   - `savePage`, `updatePage`, `loadPage`, `pageExists`
   - `loadAllPages`, `getMaxPageId`, `updateChoiceLink`
   - `findEndingPages`, `computeAccumulatedState`

4. **Module exports** (verify index.ts)
   - `Storage` class exported
   - `storage` singleton exported
   - All path helpers exported
   - `lockManager` and `withLock` exported
   - All repository functions exported

### Invariants That Must Remain True

1. **Singleton consistency** - `storage` always same instance
2. **Complete delegation** - No logic added in facade
3. **Export completeness** - All public APIs available from index
4. **Type safety** - All methods have correct signatures

## Test Setup Requirements

- Focused unit tests for facade/barrel behavior and delegation wiring
- Integration testing handled by PERLAY-006

## Imports Required

For `storage.ts`:
```typescript
import { Story, StoryId, Page, PageId, StoryMetadata } from '../models';
import { saveStory, updateStory, loadStory, storyExists, deleteStory, listStories, getPageCount } from './story-repository';
import { savePage, updatePage, loadPage, pageExists, loadAllPages, getMaxPageId, updateChoiceLink, findEndingPages, computeAccumulatedState } from './page-repository';
import { ensureStoriesDir } from './file-utils';
```

## Estimated Scope

- ~100 lines of implementation code (storage.ts)
- ~40 lines of implementation code (index.ts)
- ~120 lines of test code

## Outcome

- **Planned**: Add storage facade + persistence barrel + focused unit tests for delegation/exports.
- **Actual**:
  - Added `src/persistence/storage.ts` with synchronous `init()` and pure delegation across all story/page operations.
  - Added `src/persistence/index.ts` barrel exports for storage, file utils, lock helpers, and repository functions.
  - Added `test/unit/persistence/storage.test.ts` covering singleton consistency, init behavior, full delegation, and export completeness.
- **Scope differences vs original**:
  - Updated ticket assumptions to reflect existing repository test coverage and existing extensionless import style.
  - Kept existing repository/module public APIs unchanged (no breaking changes).
