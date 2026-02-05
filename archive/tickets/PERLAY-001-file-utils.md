# PERLAY-001: File Utilities Module

## Status

Completed

## Summary

Implement the foundational file system utilities for the persistence layer, including path helpers, atomic file writes, and JSON serialization.

## Files to Create

- `src/persistence/file-utils.ts`

## Files to Touch

- `test/unit/persistence/file-utils.test.ts` (new unit test file required by acceptance criteria)
- Optional: `src/persistence/index.ts` only if export wiring is needed by the implementation approach

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** create the story or page repository files
- **DO NOT** create the lock manager
- **DO NOT** create test fixtures or integration tests (separate ticket)
- **DO NOT** add runtime story data files under `stories/` to git (the repo already tracks `stories/.gitkeep`)

## Assumptions (Reassessed)

- `src/persistence/` already exists and currently contains only `.gitkeep`; this ticket should add `file-utils.ts` there.
- `stories/` already exists in-repo with `.gitkeep`; tests must not write to runtime `stories/`.
- Unit tests should run in an isolated temporary directory under the repo (for example, under `test/temp/`), not under `stories/`.

## Implementation Details

### Constants

```typescript
export const STORIES_DIR = path.join(process.cwd(), 'stories');
```

### Functions to Implement

1. **`ensureStoriesDir()`** - Synchronously create `stories/` directory if it doesn't exist
2. **`getStoryDir(storyId: string)`** - Return path to story directory
3. **`getStoryFilePath(storyId: string)`** - Return path to `story.json`
4. **`getPageFilePath(storyId: string, pageId: number)`** - Return path to `page_N.json`
5. **`atomicWriteFile(filePath: string, data: string)`** - Write to temp file, then rename
6. **`readJsonFile<T>(filePath: string)`** - Read and parse JSON, return `null` for ENOENT
7. **`writeJsonFile<T>(filePath: string, data: T)`** - Serialize and atomically write JSON
8. **`fileExists(filePath: string)`** - Async check if file exists
9. **`directoryExists(dirPath: string)`** - Async check if directory exists
10. **`ensureDirectory(dirPath: string)`** - Async create directory recursively
11. **`listDirectories(parentDir: string)`** - List subdirectory names
12. **`listFiles(dirPath: string, pattern?: RegExp)`** - List files matching optional pattern
13. **`deleteDirectory(dirPath: string)`** - Recursively delete directory

### Key Requirements

- Atomic writes must use unique temp file names (timestamp + random suffix)
- Atomic writes must clean up temp files on failure
- All file operations must use `utf-8` encoding
- JSON serialization must use 2-space indentation
- `readJsonFile` must return `null` (not throw) for missing files
- `listDirectories` and `listFiles` must return empty array (not throw) for missing directories

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/persistence/file-utils.test.ts`:

1. **Path helpers**
   - `getStoryDir('abc-123')` returns path containing `stories/abc-123`
   - `getStoryFilePath('abc-123')` ends with `story.json`
   - `getPageFilePath('abc-123', 5)` ends with `page_5.json`

2. **Atomic write**
   - File content is written correctly
   - No `.tmp.` files remain after successful write
   - Temp files are cleaned up on write failure

3. **JSON round-trip**
   - `writeJsonFile` followed by `readJsonFile` returns equivalent object
   - `readJsonFile` returns `null` for non-existent file
   - `readJsonFile` throws for malformed JSON

4. **Directory operations**
   - `ensureDirectory` creates nested directories
   - `directoryExists` returns `true` for existing directory
   - `directoryExists` returns `false` for non-existent path
   - `listDirectories` returns empty array for non-existent parent
   - `listFiles` filters by regex pattern correctly
   - `deleteDirectory` removes directory and contents

### Invariants That Must Remain True

1. **No partial writes** - Atomic write either succeeds completely or leaves no file
2. **No temp file pollution** - No `.tmp.` files left in any directory after operations
3. **Consistent encoding** - All files use UTF-8
4. **Deterministic paths** - Same inputs always produce same paths
5. **Error isolation** - ENOENT errors return `null` or empty array, not thrown exceptions

## Test Setup Requirements

Tests must use a temporary directory (e.g., `test/temp/`) that is:
- Created during test setup (`beforeAll` or `beforeEach`)
- Cleaned up during teardown (`afterAll` or `afterEach`)
- Not the actual `stories/` directory

## Dependencies

- Node.js `fs/promises` API
- Node.js `path` module
- Node.js `fs` (synchronous `existsSync`, `mkdirSync` for `ensureStoriesDir`)

## Estimated Scope

- ~150 lines of implementation code
- ~150 lines of test code

## Outcome

- **Planned**: Add `src/persistence/file-utils.ts` and corresponding unit tests.
- **Actual**: Added `src/persistence/file-utils.ts` and `test/unit/persistence/file-utils.test.ts` with path helpers, atomic write behavior, JSON helpers, and directory/file utilities fully covered by unit tests.
- **Scope correction applied before coding**: Updated ticket assumptions to reflect that `src/persistence/` already existed, `stories/.gitkeep` was already tracked, and tests had to use isolated temp directories rather than runtime `stories/`.
