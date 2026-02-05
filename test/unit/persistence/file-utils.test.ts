import * as fsPromises from 'fs/promises';
import * as path from 'path';
import {
  atomicWriteFile,
  deleteDirectory,
  directoryExists,
  ensureDirectory,
  ensureStoriesDir,
  fileExists,
  getPageFilePath,
  getStoryDir,
  getStoryFilePath,
  listDirectories,
  listFiles,
  readJsonFile,
  STORIES_DIR,
  writeJsonFile,
} from '@/persistence/file-utils';

describe('file-utils', () => {
  const tempRoot = path.join(process.cwd(), 'test', 'temp', 'file-utils');

  beforeEach(async () => {
    await fsPromises.rm(tempRoot, { recursive: true, force: true });
    await fsPromises.mkdir(tempRoot, { recursive: true });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fsPromises.rm(tempRoot, { recursive: true, force: true });
  });

  it('builds deterministic story and page paths', () => {
    expect(getStoryDir('abc-123')).toBe(path.join(STORIES_DIR, 'abc-123'));
    expect(getStoryFilePath('abc-123')).toBe(path.join(STORIES_DIR, 'abc-123', 'story.json'));
    expect(getPageFilePath('abc-123', 5)).toBe(path.join(STORIES_DIR, 'abc-123', 'page_5.json'));
  });

  it('ensures the stories directory exists', async () => {
    ensureStoriesDir();
    await expect(directoryExists(STORIES_DIR)).resolves.toBe(true);
  });

  it('writes files atomically and leaves no temp files on success', async () => {
    const filePath = path.join(tempRoot, 'atomic-success.txt');

    await atomicWriteFile(filePath, 'hello');

    await expect(fsPromises.readFile(filePath, 'utf-8')).resolves.toBe('hello');
    const entries = await fsPromises.readdir(tempRoot);
    expect(entries.some((entry) => entry.includes('.tmp.'))).toBe(false);
  });

  it('cleans up temp files when atomic rename fails', async () => {
    const destinationDir = path.join(tempRoot, 'atomic-failure-destination');
    await fsPromises.mkdir(destinationDir, { recursive: true });

    await expect(atomicWriteFile(destinationDir, 'data')).rejects.toBeTruthy();
    await expect(directoryExists(destinationDir)).resolves.toBe(true);

    const entries = await fsPromises.readdir(tempRoot);
    expect(entries.some((entry) => entry.includes('.tmp.'))).toBe(false);
  });

  it('round-trips JSON and uses 2-space indentation', async () => {
    const filePath = path.join(tempRoot, 'data.json');
    const payload = { a: 1, nested: { value: true } };

    await writeJsonFile(filePath, payload);

    await expect(readJsonFile<typeof payload>(filePath)).resolves.toEqual(payload);
    const raw = await fsPromises.readFile(filePath, 'utf-8');
    expect(raw).toContain('\n  "a": 1');
  });

  it('returns null for missing JSON files and throws for malformed JSON', async () => {
    const missingPath = path.join(tempRoot, 'missing.json');
    await expect(readJsonFile<{ x: number }>(missingPath)).resolves.toBeNull();

    const malformedPath = path.join(tempRoot, 'malformed.json');
    await fsPromises.writeFile(malformedPath, '{bad json}', 'utf-8');
    await expect(readJsonFile(malformedPath)).rejects.toThrow();
  });

  it('handles directory operations and missing paths', async () => {
    const nestedDir = path.join(tempRoot, 'one', 'two');
    await ensureDirectory(nestedDir);
    await expect(directoryExists(nestedDir)).resolves.toBe(true);
    await expect(directoryExists(path.join(tempRoot, 'does-not-exist'))).resolves.toBe(false);

    await fsPromises.writeFile(path.join(nestedDir, 'page_1.json'), '{}', 'utf-8');
    await fsPromises.writeFile(path.join(nestedDir, 'note.txt'), 'x', 'utf-8');

    await expect(fileExists(path.join(nestedDir, 'page_1.json'))).resolves.toBe(true);
    await expect(fileExists(path.join(nestedDir, 'missing.json'))).resolves.toBe(false);

    await expect(listDirectories(path.join(tempRoot, 'does-not-exist'))).resolves.toEqual([]);
    await expect(listFiles(path.join(tempRoot, 'does-not-exist'))).resolves.toEqual([]);
    await expect(listFiles(nestedDir, /^page_\d+\.json$/)).resolves.toEqual(['page_1.json']);

    await deleteDirectory(path.join(tempRoot, 'one'));
    await expect(directoryExists(path.join(tempRoot, 'one'))).resolves.toBe(false);
  });
});
