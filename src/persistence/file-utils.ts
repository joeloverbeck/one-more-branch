import { existsSync, mkdirSync } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getConfig } from '../config/index.js';

/**
 * Returns the stories directory path from configuration.
 */
export function getStoriesDir(): string {
  return path.join(process.cwd(), getConfig().storage.storiesDir);
}

export function ensureStoriesDir(): void {
  const storiesDir = getStoriesDir();
  if (!existsSync(storiesDir)) {
    mkdirSync(storiesDir, { recursive: true });
  }
}

export function getStoryDir(storyId: string): string {
  return path.join(getStoriesDir(), storyId);
}

export function getStoryFilePath(storyId: string): string {
  return path.join(getStoryDir(storyId), 'story.json');
}

export function getPageFilePath(storyId: string, pageId: number): string {
  return path.join(getStoryDir(storyId), `page_${pageId}.json`);
}

export async function atomicWriteFile(filePath: string, data: string): Promise<void> {
  const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;

  try {
    await fs.writeFile(tempPath, data, 'utf-8');
    await fs.rename(tempPath, filePath);
  } catch (error) {
    try {
      await fs.unlink(tempPath);
    } catch {
      // Best-effort cleanup only.
    }
    throw error;
  }
}

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

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await atomicWriteFile(filePath, content);
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function listDirectories(parentDir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(parentDir, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function listFiles(dirPath: string, pattern?: RegExp): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    let files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);

    if (pattern) {
      files = files.filter((file) => pattern.test(file));
    }

    return files;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function deleteDirectory(dirPath: string): Promise<void> {
  await fs.rm(dirPath, { recursive: true, force: true });
}

export function getConceptsDir(): string {
  return path.join(process.cwd(), getConfig().storage.conceptsDir);
}

export function ensureConceptsDir(): void {
  const conceptsDir = getConceptsDir();
  if (!existsSync(conceptsDir)) {
    mkdirSync(conceptsDir, { recursive: true });
  }
}

export function getConceptFilePath(conceptId: string): string {
  return path.join(getConceptsDir(), `${conceptId}.json`);
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}
