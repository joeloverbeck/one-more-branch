# Spec 03: Persistence Layer

## Overview

Implement file-based storage for stories and pages using JSON files. The system uses a granular structure with separate files per page within story directories.

## Goals

1. Implement atomic file operations to prevent data corruption
2. Create CRUD operations for stories and pages
3. Enable story discovery by scanning the `stories/` directory
4. Support concurrent read operations safely
5. Provide locking mechanisms for write operations

## Dependencies

- **Spec 01**: Project Foundation (Node.js/TypeScript environment)
- **Spec 02**: Data Models (Story, Page, Choice types)

## Implementation Details

### Storage Structure

```
stories/
├── {storyId-1}/
│   ├── story.json           # Story metadata and global canon
│   ├── page_1.json          # Page 1 data
│   ├── page_2.json          # Page 2 data
│   └── page_N.json          # Page N data
├── {storyId-2}/
│   ├── story.json
│   ├── page_1.json
│   └── ...
└── ...
```

### File Formats

**story.json**:
```json
{
  "id": "uuid-v4",
  "characterConcept": "string",
  "worldbuilding": "string",
  "tone": "string",
  "globalCanon": ["fact1", "fact2"],
  "storyArc": "string or null",
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp"
}
```

**page_N.json**:
```json
{
  "id": 1,
  "narrativeText": "string",
  "choices": [
    {"text": "Choice A", "nextPageId": null},
    {"text": "Choice B", "nextPageId": 2}
  ],
  "stateChanges": ["event1", "event2"],
  "accumulatedState": {"changes": ["all", "accumulated", "events"]},
  "isEnding": false,
  "parentPageId": null,
  "parentChoiceIndex": null
}
```

### Code Structure

```
src/persistence/
├── index.ts              # Re-exports
├── storage.ts            # Core storage operations
├── story-repository.ts   # Story CRUD operations
├── page-repository.ts    # Page CRUD operations
├── file-utils.ts         # File system utilities
└── lock-manager.ts       # Concurrency control
```

## Files to Create

### `src/persistence/file-utils.ts`

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * Base directory for all story data
 */
export const STORIES_DIR = path.join(process.cwd(), 'stories');

/**
 * Ensure the stories directory exists
 */
export function ensureStoriesDir(): void {
  if (!existsSync(STORIES_DIR)) {
    mkdirSync(STORIES_DIR, { recursive: true });
  }
}

/**
 * Get the directory path for a specific story
 */
export function getStoryDir(storyId: string): string {
  return path.join(STORIES_DIR, storyId);
}

/**
 * Get the path to a story's metadata file
 */
export function getStoryFilePath(storyId: string): string {
  return path.join(getStoryDir(storyId), 'story.json');
}

/**
 * Get the path to a specific page file
 */
export function getPageFilePath(storyId: string, pageId: number): string {
  return path.join(getStoryDir(storyId), `page_${pageId}.json`);
}

/**
 * Atomically write a file (write to temp, then rename)
 * This prevents partial writes on crash
 */
export async function atomicWriteFile(filePath: string, data: string): Promise<void> {
  const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;

  try {
    await fs.writeFile(tempPath, data, 'utf-8');
    await fs.rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file if rename failed
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Read and parse a JSON file
 */
export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Write an object as JSON to a file
 */
export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await atomicWriteFile(filePath, content);
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a directory exists
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Create a directory (and parents if needed)
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * List all subdirectories in a directory
 */
export async function listDirectories(parentDir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(parentDir, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * List all files matching a pattern in a directory
 */
export async function listFiles(
  dirPath: string,
  pattern?: RegExp
): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    let files = entries.filter(e => e.isFile()).map(e => e.name);

    if (pattern) {
      files = files.filter(f => pattern.test(f));
    }

    return files;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Delete a directory and all its contents
 */
export async function deleteDirectory(dirPath: string): Promise<void> {
  await fs.rm(dirPath, { recursive: true, force: true });
}
```

### `src/persistence/lock-manager.ts`

```typescript
/**
 * Simple in-memory lock manager for preventing concurrent writes
 * to the same story
 */

type LockRelease = () => void;

interface LockEntry {
  promise: Promise<void>;
  resolve: () => void;
}

class LockManager {
  private locks = new Map<string, LockEntry[]>();

  /**
   * Acquire a lock for a given key (storyId)
   * Returns a release function that must be called when done
   */
  async acquire(key: string): Promise<LockRelease> {
    const queue = this.locks.get(key) ?? [];

    // Create a new lock entry
    let resolve!: () => void;
    const promise = new Promise<void>(r => {
      resolve = r;
    });

    const entry: LockEntry = { promise, resolve };

    // If there are locks ahead of us, wait for the last one
    if (queue.length > 0) {
      const lastLock = queue[queue.length - 1];
      queue.push(entry);
      this.locks.set(key, queue);
      await lastLock?.promise;
    } else {
      queue.push(entry);
      this.locks.set(key, queue);
    }

    // Return release function
    return () => {
      const currentQueue = this.locks.get(key);
      if (currentQueue) {
        const index = currentQueue.indexOf(entry);
        if (index !== -1) {
          currentQueue.splice(index, 1);
          if (currentQueue.length === 0) {
            this.locks.delete(key);
          }
        }
      }
      resolve();
    };
  }

  /**
   * Check if a key currently has any locks
   */
  isLocked(key: string): boolean {
    const queue = this.locks.get(key);
    return queue !== undefined && queue.length > 0;
  }

  /**
   * Get the number of pending locks for a key
   */
  getQueueLength(key: string): number {
    return this.locks.get(key)?.length ?? 0;
  }
}

// Singleton instance
export const lockManager = new LockManager();

/**
 * Execute a function while holding a lock
 * Automatically releases the lock when done (even on error)
 */
export async function withLock<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  const release = await lockManager.acquire(key);
  try {
    return await fn();
  } finally {
    release();
  }
}
```

### `src/persistence/story-repository.ts`

```typescript
import {
  Story,
  StoryId,
  StoryMetadata,
  isStory,
  parseStoryId,
} from '../models/index.js';
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

/**
 * JSON shape for story file (dates as strings)
 */
interface StoryFileData {
  id: string;
  characterConcept: string;
  worldbuilding: string;
  tone: string;
  globalCanon: string[];
  storyArc: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Convert Story to file format
 */
function storyToFileData(story: Story): StoryFileData {
  return {
    id: story.id,
    characterConcept: story.characterConcept,
    worldbuilding: story.worldbuilding,
    tone: story.tone,
    globalCanon: [...story.globalCanon],
    storyArc: story.storyArc,
    createdAt: story.createdAt.toISOString(),
    updatedAt: story.updatedAt.toISOString(),
  };
}

/**
 * Convert file data to Story
 */
function fileDataToStory(data: StoryFileData): Story {
  return {
    id: parseStoryId(data.id),
    characterConcept: data.characterConcept,
    worldbuilding: data.worldbuilding,
    tone: data.tone,
    globalCanon: data.globalCanon,
    storyArc: data.storyArc,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

/**
 * Save a new story (creates directory and story.json)
 */
export async function saveStory(story: Story): Promise<void> {
  ensureStoriesDir();

  await withLock(story.id, async () => {
    const storyDir = getStoryDir(story.id);
    await ensureDirectory(storyDir);

    const filePath = getStoryFilePath(story.id);
    await writeJsonFile(filePath, storyToFileData(story));
  });
}

/**
 * Update an existing story
 */
export async function updateStory(story: Story): Promise<void> {
  await withLock(story.id, async () => {
    const filePath = getStoryFilePath(story.id);

    // Verify story exists
    const exists = await directoryExists(getStoryDir(story.id));
    if (!exists) {
      throw new Error(`Story ${story.id} does not exist`);
    }

    await writeJsonFile(filePath, storyToFileData(story));
  });
}

/**
 * Load a story by ID
 */
export async function loadStory(storyId: StoryId): Promise<Story | null> {
  const filePath = getStoryFilePath(storyId);
  const data = await readJsonFile<StoryFileData>(filePath);

  if (!data) {
    return null;
  }

  return fileDataToStory(data);
}

/**
 * Check if a story exists
 */
export async function storyExists(storyId: StoryId): Promise<boolean> {
  const storyDir = getStoryDir(storyId);
  return directoryExists(storyDir);
}

/**
 * Delete a story and all its pages
 */
export async function deleteStory(storyId: StoryId): Promise<void> {
  await withLock(storyId, async () => {
    const storyDir = getStoryDir(storyId);
    await deleteDirectory(storyDir);
  });
}

/**
 * List all stories (returns metadata only)
 */
export async function listStories(): Promise<StoryMetadata[]> {
  ensureStoriesDir();

  const storyIds = await listDirectories(STORIES_DIR);
  const metadata: StoryMetadata[] = [];

  for (const storyId of storyIds) {
    const story = await loadStory(storyId as StoryId);
    if (story) {
      // Count pages
      const storyDir = getStoryDir(storyId);
      const pageFiles = await listFiles(storyDir, /^page_\d+\.json$/);

      // Check if any page is an ending (would need to read pages)
      // For now, we'll just report page count
      metadata.push({
        id: story.id,
        characterConcept: story.characterConcept,
        tone: story.tone,
        createdAt: story.createdAt,
        pageCount: pageFiles.length,
        hasEnding: false, // Would need to scan pages for this
      });
    }
  }

  // Sort by creation date (newest first)
  metadata.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return metadata;
}

/**
 * Get page count for a story
 */
export async function getPageCount(storyId: StoryId): Promise<number> {
  const storyDir = getStoryDir(storyId);
  const pageFiles = await listFiles(storyDir, /^page_\d+\.json$/);
  return pageFiles.length;
}
```

### `src/persistence/page-repository.ts`

```typescript
import {
  Page,
  PageId,
  StoryId,
  isPage,
  parsePageId,
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

/**
 * JSON shape for page file
 */
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

/**
 * Convert Page to file format
 */
function pageToFileData(page: Page): PageFileData {
  return {
    id: page.id,
    narrativeText: page.narrativeText,
    choices: page.choices.map(c => ({
      text: c.text,
      nextPageId: c.nextPageId,
    })),
    stateChanges: [...page.stateChanges],
    accumulatedState: {
      changes: [...page.accumulatedState.changes],
    },
    isEnding: page.isEnding,
    parentPageId: page.parentPageId,
    parentChoiceIndex: page.parentChoiceIndex,
  };
}

/**
 * Convert file data to Page
 */
function fileDataToPage(data: PageFileData): Page {
  return {
    id: data.id as PageId,
    narrativeText: data.narrativeText,
    choices: data.choices.map(c => ({
      text: c.text,
      nextPageId: c.nextPageId === null ? null : (c.nextPageId as PageId),
    })),
    stateChanges: data.stateChanges,
    accumulatedState: {
      changes: data.accumulatedState.changes,
    },
    isEnding: data.isEnding,
    parentPageId: data.parentPageId === null ? null : (data.parentPageId as PageId),
    parentChoiceIndex: data.parentChoiceIndex,
  };
}

/**
 * Save a page
 */
export async function savePage(storyId: StoryId, page: Page): Promise<void> {
  await withLock(storyId, async () => {
    const filePath = getPageFilePath(storyId, page.id);
    await writeJsonFile(filePath, pageToFileData(page));
  });
}

/**
 * Update a page (primarily for updating choice links)
 */
export async function updatePage(storyId: StoryId, page: Page): Promise<void> {
  await savePage(storyId, page);
}

/**
 * Load a page by ID
 */
export async function loadPage(
  storyId: StoryId,
  pageId: PageId
): Promise<Page | null> {
  const filePath = getPageFilePath(storyId, pageId);
  const data = await readJsonFile<PageFileData>(filePath);

  if (!data) {
    return null;
  }

  return fileDataToPage(data);
}

/**
 * Check if a page exists
 */
export async function pageExists(
  storyId: StoryId,
  pageId: PageId
): Promise<boolean> {
  const filePath = getPageFilePath(storyId, pageId);
  return fileExists(filePath);
}

/**
 * Load all pages for a story
 */
export async function loadAllPages(
  storyId: StoryId
): Promise<Map<PageId, Page>> {
  const storyDir = getStoryDir(storyId);
  const pageFiles = await listFiles(storyDir, /^page_(\d+)\.json$/);

  const pages = new Map<PageId, Page>();

  for (const fileName of pageFiles) {
    const match = fileName.match(/^page_(\d+)\.json$/);
    if (match?.[1]) {
      const pageId = parseInt(match[1], 10) as PageId;
      const page = await loadPage(storyId, pageId);
      if (page) {
        pages.set(pageId, page);
      }
    }
  }

  return pages;
}

/**
 * Get the highest page ID in a story
 */
export async function getMaxPageId(storyId: StoryId): Promise<number> {
  const storyDir = getStoryDir(storyId);
  const pageFiles = await listFiles(storyDir, /^page_(\d+)\.json$/);

  let maxId = 0;
  for (const fileName of pageFiles) {
    const match = fileName.match(/^page_(\d+)\.json$/);
    if (match?.[1]) {
      const id = parseInt(match[1], 10);
      if (id > maxId) {
        maxId = id;
      }
    }
  }

  return maxId;
}

/**
 * Update a single choice's nextPageId on a page
 */
export async function updateChoiceLink(
  storyId: StoryId,
  pageId: PageId,
  choiceIndex: number,
  nextPageId: PageId
): Promise<void> {
  await withLock(storyId, async () => {
    const page = await loadPage(storyId, pageId);
    if (!page) {
      throw new Error(`Page ${pageId} not found in story ${storyId}`);
    }

    if (choiceIndex < 0 || choiceIndex >= page.choices.length) {
      throw new Error(`Invalid choice index ${choiceIndex} for page ${pageId}`);
    }

    const choice = page.choices[choiceIndex];
    if (!choice) {
      throw new Error(`Choice at index ${choiceIndex} not found`);
    }

    // Create updated page with new choice link
    const updatedChoices = [...page.choices];
    updatedChoices[choiceIndex] = {
      ...choice,
      nextPageId,
    };

    const updatedPage: Page = {
      ...page,
      choices: updatedChoices,
    };

    const filePath = getPageFilePath(storyId, pageId);
    await writeJsonFile(filePath, pageToFileData(updatedPage));
  });
}

/**
 * Find all ending pages in a story
 */
export async function findEndingPages(storyId: StoryId): Promise<PageId[]> {
  const pages = await loadAllPages(storyId);
  const endings: PageId[] = [];

  for (const [pageId, page] of pages) {
    if (page.isEnding) {
      endings.push(pageId);
    }
  }

  return endings;
}

/**
 * Compute accumulated state for a page by traversing from root
 * Useful for validation or recalculation
 */
export async function computeAccumulatedState(
  storyId: StoryId,
  pageId: PageId
): Promise<AccumulatedState> {
  const pages = await loadAllPages(storyId);
  const changes: string[] = [];

  // Build path from root to target page
  const path: Page[] = [];
  let current = pages.get(pageId);

  while (current) {
    path.unshift(current);
    if (current.parentPageId === null) {
      break;
    }
    current = pages.get(current.parentPageId);
  }

  // Accumulate state changes along the path
  for (const page of path) {
    changes.push(...page.stateChanges);
  }

  return { changes };
}
```

### `src/persistence/storage.ts`

```typescript
import { Story, StoryId, Page, PageId, StoryMetadata } from '../models/index.js';
import {
  saveStory,
  updateStory,
  loadStory,
  storyExists,
  deleteStory,
  listStories,
  getPageCount,
} from './story-repository.js';
import {
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
import { ensureStoriesDir } from './file-utils.js';

/**
 * Main storage interface - facade over story and page repositories
 */
export class Storage {
  /**
   * Initialize storage (ensure directories exist)
   */
  init(): void {
    ensureStoriesDir();
  }

  // Story operations
  async saveStory(story: Story): Promise<void> {
    return saveStory(story);
  }

  async updateStory(story: Story): Promise<void> {
    return updateStory(story);
  }

  async loadStory(storyId: StoryId): Promise<Story | null> {
    return loadStory(storyId);
  }

  async storyExists(storyId: StoryId): Promise<boolean> {
    return storyExists(storyId);
  }

  async deleteStory(storyId: StoryId): Promise<void> {
    return deleteStory(storyId);
  }

  async listStories(): Promise<StoryMetadata[]> {
    return listStories();
  }

  async getPageCount(storyId: StoryId): Promise<number> {
    return getPageCount(storyId);
  }

  // Page operations
  async savePage(storyId: StoryId, page: Page): Promise<void> {
    return savePage(storyId, page);
  }

  async updatePage(storyId: StoryId, page: Page): Promise<void> {
    return updatePage(storyId, page);
  }

  async loadPage(storyId: StoryId, pageId: PageId): Promise<Page | null> {
    return loadPage(storyId, pageId);
  }

  async pageExists(storyId: StoryId, pageId: PageId): Promise<boolean> {
    return pageExists(storyId, pageId);
  }

  async loadAllPages(storyId: StoryId): Promise<Map<PageId, Page>> {
    return loadAllPages(storyId);
  }

  async getMaxPageId(storyId: StoryId): Promise<number> {
    return getMaxPageId(storyId);
  }

  async updateChoiceLink(
    storyId: StoryId,
    pageId: PageId,
    choiceIndex: number,
    nextPageId: PageId
  ): Promise<void> {
    return updateChoiceLink(storyId, pageId, choiceIndex, nextPageId);
  }

  async findEndingPages(storyId: StoryId): Promise<PageId[]> {
    return findEndingPages(storyId);
  }

  async computeAccumulatedState(
    storyId: StoryId,
    pageId: PageId
  ): Promise<{ changes: string[] }> {
    return computeAccumulatedState(storyId, pageId);
  }
}

// Singleton instance
export const storage = new Storage();
```

### `src/persistence/index.ts`

```typescript
export { Storage, storage } from './storage.js';

export {
  STORIES_DIR,
  ensureStoriesDir,
  getStoryDir,
  getStoryFilePath,
  getPageFilePath,
} from './file-utils.js';

export { lockManager, withLock } from './lock-manager.js';

export {
  saveStory,
  updateStory,
  loadStory,
  storyExists,
  deleteStory,
  listStories,
  getPageCount,
} from './story-repository.js';

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

## Invariants

1. **Atomic Writes**: All file writes use temp-file-then-rename pattern
2. **No Partial Data**: A story directory either has all required files or none
3. **No Dead Links**: If `choice.nextPageId` points to a page, that page file exists
4. **Lock Ordering**: Only one write operation per story at a time
5. **Directory Structure**: Each story has its own directory under `stories/`
6. **File Naming**: Story metadata is `story.json`, pages are `page_N.json`
7. **JSON Validity**: All files contain valid, parseable JSON
8. **ID Consistency**: File names match internal IDs (`page_5.json` contains `id: 5`)

## Test Cases

### Unit Tests

**File**: `test/unit/persistence/file-utils.test.ts`

```typescript
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  getStoryDir,
  getStoryFilePath,
  getPageFilePath,
  atomicWriteFile,
  readJsonFile,
  writeJsonFile,
} from '@/persistence/file-utils';

// Use a temp directory for tests
const TEST_DIR = path.join(process.cwd(), 'test-temp');

beforeAll(async () => {
  await fs.mkdir(TEST_DIR, { recursive: true });
});

afterAll(async () => {
  await fs.rm(TEST_DIR, { recursive: true, force: true });
});

describe('File Utilities', () => {
  describe('getStoryDir', () => {
    it('should return correct path', () => {
      const dir = getStoryDir('abc-123');
      expect(dir).toContain('stories');
      expect(dir).toContain('abc-123');
    });
  });

  describe('getStoryFilePath', () => {
    it('should return path to story.json', () => {
      const filePath = getStoryFilePath('abc-123');
      expect(filePath).toEndWith('story.json');
    });
  });

  describe('getPageFilePath', () => {
    it('should return path to page_N.json', () => {
      const filePath = getPageFilePath('abc-123', 5);
      expect(filePath).toEndWith('page_5.json');
    });
  });

  describe('atomicWriteFile', () => {
    it('should write file atomically', async () => {
      const testFile = path.join(TEST_DIR, 'atomic-test.txt');
      await atomicWriteFile(testFile, 'test content');

      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('test content');
    });

    it('should not leave temp files on success', async () => {
      const testFile = path.join(TEST_DIR, 'atomic-test2.txt');
      await atomicWriteFile(testFile, 'test');

      const files = await fs.readdir(TEST_DIR);
      const tempFiles = files.filter(f => f.includes('.tmp.'));
      expect(tempFiles.length).toBe(0);
    });
  });

  describe('readJsonFile/writeJsonFile', () => {
    it('should round-trip JSON data', async () => {
      const testFile = path.join(TEST_DIR, 'json-test.json');
      const data = { name: 'test', count: 42, items: [1, 2, 3] };

      await writeJsonFile(testFile, data);
      const loaded = await readJsonFile(testFile);

      expect(loaded).toEqual(data);
    });

    it('should return null for non-existent file', async () => {
      const result = await readJsonFile(path.join(TEST_DIR, 'does-not-exist.json'));
      expect(result).toBeNull();
    });
  });
});
```

**File**: `test/unit/persistence/lock-manager.test.ts`

```typescript
import { lockManager, withLock } from '@/persistence/lock-manager';

describe('Lock Manager', () => {
  describe('acquire/release', () => {
    it('should acquire and release lock', async () => {
      expect(lockManager.isLocked('test-key')).toBe(false);

      const release = await lockManager.acquire('test-key');
      expect(lockManager.isLocked('test-key')).toBe(true);

      release();
      expect(lockManager.isLocked('test-key')).toBe(false);
    });
  });

  describe('withLock', () => {
    it('should execute function with lock held', async () => {
      const result = await withLock('test-key', async () => {
        expect(lockManager.isLocked('test-key')).toBe(true);
        return 'done';
      });

      expect(result).toBe('done');
      expect(lockManager.isLocked('test-key')).toBe(false);
    });

    it('should release lock on error', async () => {
      await expect(
        withLock('test-key', async () => {
          throw new Error('test error');
        })
      ).rejects.toThrow('test error');

      expect(lockManager.isLocked('test-key')).toBe(false);
    });
  });

  describe('concurrent access', () => {
    it('should serialize concurrent operations', async () => {
      const order: number[] = [];

      const p1 = withLock('shared-key', async () => {
        order.push(1);
        await new Promise(r => setTimeout(r, 50));
        order.push(2);
      });

      const p2 = withLock('shared-key', async () => {
        order.push(3);
        order.push(4);
      });

      await Promise.all([p1, p2]);

      // p1 should complete before p2 starts
      expect(order).toEqual([1, 2, 3, 4]);
    });
  });
});
```

### Integration Tests

**File**: `test/integration/persistence/story-repository.test.ts`

```typescript
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  saveStory,
  loadStory,
  listStories,
  deleteStory,
  storyExists,
} from '@/persistence/story-repository';
import { createStory } from '@/models/story';
import { STORIES_DIR, ensureStoriesDir } from '@/persistence/file-utils';

// Override stories dir for tests
const ORIGINAL_STORIES_DIR = STORIES_DIR;

beforeAll(async () => {
  ensureStoriesDir();
});

afterEach(async () => {
  // Clean up test stories
  const stories = await listStories();
  for (const story of stories) {
    if (story.characterConcept.startsWith('TEST:')) {
      await deleteStory(story.id);
    }
  }
});

describe('Story Repository', () => {
  describe('saveStory/loadStory', () => {
    it('should save and load story correctly', async () => {
      const story = createStory({
        characterConcept: 'TEST: A brave adventurer',
        worldbuilding: 'A magical realm',
        tone: 'epic fantasy',
      });

      await saveStory(story);
      const loaded = await loadStory(story.id);

      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe(story.id);
      expect(loaded?.characterConcept).toBe(story.characterConcept);
      expect(loaded?.worldbuilding).toBe(story.worldbuilding);
      expect(loaded?.tone).toBe(story.tone);
    });
  });

  describe('storyExists', () => {
    it('should return true for existing story', async () => {
      const story = createStory({ characterConcept: 'TEST: Hero' });
      await saveStory(story);

      expect(await storyExists(story.id)).toBe(true);
    });

    it('should return false for non-existent story', async () => {
      expect(await storyExists('non-existent-id' as any)).toBe(false);
    });
  });

  describe('listStories', () => {
    it('should list all saved stories', async () => {
      const story1 = createStory({ characterConcept: 'TEST: Hero 1' });
      const story2 = createStory({ characterConcept: 'TEST: Hero 2' });

      await saveStory(story1);
      await saveStory(story2);

      const stories = await listStories();
      const testStories = stories.filter(s => s.characterConcept.startsWith('TEST:'));

      expect(testStories.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('deleteStory', () => {
    it('should delete story and its directory', async () => {
      const story = createStory({ characterConcept: 'TEST: To Delete' });
      await saveStory(story);

      expect(await storyExists(story.id)).toBe(true);

      await deleteStory(story.id);

      expect(await storyExists(story.id)).toBe(false);
    });
  });
});
```

**File**: `test/integration/persistence/page-repository.test.ts`

```typescript
import {
  savePage,
  loadPage,
  loadAllPages,
  updateChoiceLink,
  getMaxPageId,
} from '@/persistence/page-repository';
import { saveStory, deleteStory } from '@/persistence/story-repository';
import { createStory } from '@/models/story';
import { createPage } from '@/models/page';
import { createChoice } from '@/models/choice';
import { PageId, StoryId } from '@/models/id';

let testStoryId: StoryId;

beforeAll(async () => {
  const story = createStory({ characterConcept: 'TEST: Page Repo Test' });
  await saveStory(story);
  testStoryId = story.id;
});

afterAll(async () => {
  await deleteStory(testStoryId);
});

describe('Page Repository', () => {
  describe('savePage/loadPage', () => {
    it('should save and load page correctly', async () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'The adventure begins in a dark forest...',
        choices: [
          createChoice('Go deeper into the forest'),
          createChoice('Turn back'),
        ],
        stateChanges: ['Entered the forest'],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      await savePage(testStoryId, page);
      const loaded = await loadPage(testStoryId, 1 as PageId);

      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe(1);
      expect(loaded?.narrativeText).toBe(page.narrativeText);
      expect(loaded?.choices.length).toBe(2);
      expect(loaded?.stateChanges).toEqual(['Entered the forest']);
    });
  });

  describe('updateChoiceLink', () => {
    it('should update choice nextPageId', async () => {
      // First save page 2
      const page2 = createPage({
        id: 2 as PageId,
        narrativeText: 'You venture deeper...',
        choices: [createChoice('Continue'), createChoice('Rest')],
        stateChanges: [],
        isEnding: false,
        parentPageId: 1 as PageId,
        parentChoiceIndex: 0,
      });
      await savePage(testStoryId, page2);

      // Update page 1's first choice to point to page 2
      await updateChoiceLink(testStoryId, 1 as PageId, 0, 2 as PageId);

      // Verify the link was updated
      const loaded = await loadPage(testStoryId, 1 as PageId);
      expect(loaded?.choices[0]?.nextPageId).toBe(2);
    });
  });

  describe('loadAllPages', () => {
    it('should load all pages for a story', async () => {
      const pages = await loadAllPages(testStoryId);

      expect(pages.size).toBeGreaterThanOrEqual(2);
      expect(pages.has(1 as PageId)).toBe(true);
      expect(pages.has(2 as PageId)).toBe(true);
    });
  });

  describe('getMaxPageId', () => {
    it('should return highest page ID', async () => {
      const maxId = await getMaxPageId(testStoryId);
      expect(maxId).toBeGreaterThanOrEqual(2);
    });
  });
});
```

### E2E Tests

**File**: `test/e2e/persistence/data-integrity.test.ts`

```typescript
import { storage } from '@/persistence/storage';
import { createStory } from '@/models/story';
import { createPage } from '@/models/page';
import { createChoice } from '@/models/choice';
import { PageId } from '@/models/id';

describe('Data Integrity E2E', () => {
  it('should maintain story integrity across operations', async () => {
    storage.init();

    // Create story
    const story = createStory({
      characterConcept: 'E2E TEST: Integrity check character',
      worldbuilding: 'A test world',
      tone: 'test tone',
    });
    await storage.saveStory(story);

    // Add pages
    const page1 = createPage({
      id: 1 as PageId,
      narrativeText: 'Page 1 narrative',
      choices: [createChoice('Option A'), createChoice('Option B')],
      stateChanges: [],
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
    });
    await storage.savePage(story.id, page1);

    const page2 = createPage({
      id: 2 as PageId,
      narrativeText: 'Page 2 narrative',
      choices: [createChoice('Continue'), createChoice('Stop')],
      stateChanges: ['Player chose A'],
      isEnding: false,
      parentPageId: 1 as PageId,
      parentChoiceIndex: 0,
      parentAccumulatedState: page1.accumulatedState,
    });
    await storage.savePage(story.id, page2);

    // Link pages
    await storage.updateChoiceLink(story.id, 1 as PageId, 0, 2 as PageId);

    // Verify integrity
    const loadedStory = await storage.loadStory(story.id);
    expect(loadedStory).not.toBeNull();

    const loadedPage1 = await storage.loadPage(story.id, 1 as PageId);
    expect(loadedPage1?.choices[0]?.nextPageId).toBe(2);

    const loadedPage2 = await storage.loadPage(story.id, 2 as PageId);
    expect(loadedPage2?.accumulatedState.changes).toEqual(['Player chose A']);

    // Cleanup
    await storage.deleteStory(story.id);
    expect(await storage.storyExists(story.id)).toBe(false);
  });
});
```

### Performance Tests

**File**: `test/performance/persistence/concurrent-writes.test.ts`

```typescript
import { storage } from '@/persistence/storage';
import { createStory } from '@/models/story';
import { createPage } from '@/models/page';
import { createChoice } from '@/models/choice';
import { PageId } from '@/models/id';

describe('Concurrent Write Performance', () => {
  it('should handle concurrent page saves without corruption', async () => {
    storage.init();

    const story = createStory({
      characterConcept: 'PERF TEST: Concurrent writes',
    });
    await storage.saveStory(story);

    // Create page 1 first
    const page1 = createPage({
      id: 1 as PageId,
      narrativeText: 'Start',
      choices: [
        createChoice('A'),
        createChoice('B'),
        createChoice('C'),
        createChoice('D'),
      ],
      stateChanges: [],
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
    });
    await storage.savePage(story.id, page1);

    // Simulate concurrent saves of different pages
    const concurrentSaves = Array.from({ length: 10 }, async (_, i) => {
      const page = createPage({
        id: (i + 2) as PageId,
        narrativeText: `Page ${i + 2} content`,
        choices: [createChoice('Continue'), createChoice('Back')],
        stateChanges: [`Event ${i + 2}`],
        isEnding: false,
        parentPageId: 1 as PageId,
        parentChoiceIndex: i % 4,
      });
      return storage.savePage(story.id, page);
    });

    await Promise.all(concurrentSaves);

    // Verify all pages were saved correctly
    const pages = await storage.loadAllPages(story.id);
    expect(pages.size).toBe(11); // page 1 + 10 new pages

    // Verify each page has correct content
    for (let i = 2; i <= 11; i++) {
      const page = pages.get(i as PageId);
      expect(page).toBeDefined();
      expect(page?.narrativeText).toBe(`Page ${i} content`);
      expect(page?.stateChanges).toEqual([`Event ${i}`]);
    }

    // Cleanup
    await storage.deleteStory(story.id);
  }, 30000);
});
```

## Acceptance Criteria

- [ ] Stories can be created, loaded, updated, and deleted
- [ ] Pages can be saved and loaded within a story
- [ ] Choice links can be updated without rewriting entire page
- [ ] All stories can be listed with metadata
- [ ] Concurrent writes to the same story are serialized
- [ ] Files use atomic write pattern (temp then rename)
- [ ] No data corruption on concurrent access
- [ ] Deleting a story removes all associated pages
- [ ] File structure matches specification (`stories/<id>/story.json`, `page_N.json`)
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass

## Implementation Notes

1. Use branded types for StoryId and PageId for type safety
2. Dates are serialized as ISO 8601 strings in JSON
3. Lock manager uses in-memory locks (works for single-process; would need Redis for multi-process)
4. Atomic writes prevent partial data on crash
5. Test cleanup should not affect other stories (use TEST: prefix)
6. The `stories/` directory is gitignored and created at runtime
