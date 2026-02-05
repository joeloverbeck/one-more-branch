# PERLAY-005: Storage Facade and Module Exports

## Summary

Create the Storage facade class that provides a unified interface to all persistence operations, and the index.ts barrel file for module exports.

## Files to Create

- `src/persistence/storage.ts`
- `src/persistence/index.ts`

## Files to Touch

- None (new files only)

## Dependencies (Must Be Completed First)

- **PERLAY-001**: file-utils.ts
- **PERLAY-002**: lock-manager.ts
- **PERLAY-003**: story-repository.ts
- **PERLAY-004**: page-repository.ts

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any other persistence files
- **DO NOT** add new functionality beyond what repositories provide
- **DO NOT** add caching or optimization logic

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

- Minimal unit tests (just verify structure)
- Integration testing handled by PERLAY-006

## Imports Required

For `storage.ts`:
```typescript
import { Story, StoryId, Page, PageId, StoryMetadata } from '../models/index.js';
import { saveStory, updateStory, loadStory, storyExists, deleteStory, listStories, getPageCount } from './story-repository.js';
import { savePage, updatePage, loadPage, pageExists, loadAllPages, getMaxPageId, updateChoiceLink, findEndingPages, computeAccumulatedState } from './page-repository.js';
import { ensureStoriesDir } from './file-utils.js';
```

## Estimated Scope

- ~100 lines of implementation code (storage.ts)
- ~40 lines of implementation code (index.ts)
- ~60 lines of test code
