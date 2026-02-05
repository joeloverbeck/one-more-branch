# PERLAY-003: Story Repository Module

## Status

- [ ] In progress
- [x] Completed

## Summary

Implement CRUD operations for Story entities, including serialization/deserialization between TypeScript types and JSON file format.

## Files to Create

- `src/persistence/story-repository.ts`

## Files to Touch

- `test/unit/persistence/story-repository.test.ts` (new)
- Optional export wiring only if needed by tests (no API-breaking changes)

## Dependencies (Must Be Completed First)

- **PERLAY-001**: file-utils.ts (path helpers, JSON read/write, directory operations)
- **PERLAY-002**: lock-manager.ts (withLock for write serialization)

## Assumption Reassessment

### Confirmed

- `specs/03-persistence-layer.md` expects stories to be stored under `stories/{storyId}/story.json`.
- `file-utils.ts` and `lock-manager.ts` already provide the primitives this ticket needs.
- Story list metadata includes `id`, `characterConcept`, `tone`, `createdAt`, `pageCount`, and `hasEnding`.

### Corrected

- This repository currently has **no** `src/persistence/story-repository.ts`; this ticket should create it.
- The existing test baseline is unit-level for persistence utilities; this ticket should be satisfied by focused unit tests under `test/unit/persistence/`.
- `src/persistence/index.ts`, `page-repository.ts`, and `storage.ts` do not exist yet and are out of scope.
- Story IDs are UUID-branded values; deserialization must use `parseStoryId` to retain branded type safety.
- To preserve an explicit persistence invariant, loading should validate that the ID inside `story.json` matches the directory/story ID being loaded.

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify `src/persistence/file-utils.ts`
- **DO NOT** modify `src/persistence/lock-manager.ts`
- **DO NOT** create page repository (separate ticket)
- **DO NOT** create the Storage facade class
- **DO NOT** implement page counting with ending detection (hasEnding is always false for now)
- **DO NOT** change public model interfaces in `src/models/`

## Implementation Details

### File Data Interface

```typescript
interface StoryFileData {
  id: string;
  characterConcept: string;
  worldbuilding: string;
  tone: string;
  globalCanon: string[];
  storyArc: string | null;
  createdAt: string;  // ISO 8601
  updatedAt: string;  // ISO 8601
}
```

### Conversion Functions

1. **`storyToFileData(story: Story): StoryFileData`**
   - Convert Date to ISO string
   - Spread arrays to create copies (immutability)

2. **`fileDataToStory(data: StoryFileData): Story`**
   - Parse ISO strings back to Date
   - Use `parseStoryId` for branded type

### Repository Functions

1. **`saveStory(story: Story): Promise<void>`**
   - Call `ensureStoriesDir()` first
   - Use `withLock(story.id, ...)` for write safety
   - Create story directory
   - Write `story.json`

2. **`updateStory(story: Story): Promise<void>`**
   - Use `withLock`
   - Verify story exists (throw if not)
   - Write updated `story.json`

3. **`loadStory(storyId: StoryId): Promise<Story | null>`**
   - No lock needed (reads are safe)
   - Return `null` if not found
   - Throw if `story.json` contains an `id` that does not match `storyId`

4. **`storyExists(storyId: StoryId): Promise<boolean>`**
   - Check if story directory exists

5. **`deleteStory(storyId: StoryId): Promise<void>`**
   - Use `withLock`
   - Delete entire story directory

6. **`listStories(): Promise<StoryMetadata[]>`**
   - Scan `stories/` for subdirectories
   - Load each story
   - Count page files per story
   - Sort by `createdAt` descending

7. **`getPageCount(storyId: StoryId): Promise<number>`**
   - Count `page_*.json` files in story directory

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/persistence/story-repository.test.ts`:

1. **Serialization**
   - Save/load round-trip preserves all story fields, including timestamp precision and branded ID behavior

2. **saveStory/loadStory**
   - Saved story can be loaded
   - All fields preserved (id, characterConcept, worldbuilding, tone, globalCanon, storyArc, timestamps)
   - Loading non-existent story returns `null`

3. **updateStory**
   - Updated fields persist
   - Throws error for non-existent story

4. **storyExists**
   - Returns `true` for existing story
   - Returns `false` for non-existent story

5. **deleteStory**
   - Story no longer exists after delete
   - Deleting non-existent story doesn't throw

6. **listStories**
   - Returns all saved stories
   - Includes pageCount
   - Sorted by createdAt descending
   - `hasEnding` is always `false` for this ticket

7. **ID consistency edge case (extra coverage)**
   - `loadStory` throws when persisted `story.json.id` does not match the requested `storyId`

### Invariants That Must Remain True

1. **Atomic writes** - Story file either fully written or unchanged
2. **Lock safety** - Concurrent writes to same story are serialized
3. **ID consistency** - Loaded story ID matches directory name
4. **Date integrity** - Timestamps survive round-trip exactly
5. **Directory structure** - Each story in `stories/{storyId}/story.json`
6. **Immutable arrays** - globalCanon is copied, not referenced

## Test Setup Requirements

- Tests should use `TEST:` prefix in characterConcept where stories are created via models
- Tests must clean up only test-created directories/stories in `afterEach`
- Tests must not mutate or remove unrelated runtime stories

## Imports Required

```typescript
import { Story, StoryId, StoryMetadata, parseStoryId } from '../models/index.js';
import {
  STORIES_DIR,
  ensureStoriesDir,
  getStoryDir,
  getStoryFilePath,
  readJsonFile,
  writeJsonFile,
  ensureDirectory,
  listDirectories,
  directoryExists,
  listFiles,
  deleteDirectory,
} from './file-utils.js';
import { withLock } from './lock-manager.js';
```

## Estimated Scope

- ~150 lines of implementation code
- ~150 lines of test code

## Outcome

- **Planned**: Create `story-repository.ts` with story CRUD/list/count behavior and unit coverage.
- **Actual**: Added `src/persistence/story-repository.ts` and `test/unit/persistence/story-repository.test.ts` covering save/load/update/exists/delete/list/count flows.
- **Scope differences vs original**:
  - Added explicit ID consistency enforcement in `loadStory` (throws when `story.json.id` mismatches the requested story directory ID) and corresponding extra test coverage.
  - Kept work limited to the new module and its unit tests; no model or utility module API changes were made.
