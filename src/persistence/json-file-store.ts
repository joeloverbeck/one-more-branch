import { fileExists, readJsonFile, writeJsonFile } from './file-utils.js';
import { withLock } from './lock-manager.js';

export interface JsonFileStoreOptions<TId> {
  readonly getFilePath: (id: TId) => string;
  readonly getLockKey: (id: TId) => string;
  readonly ensureWriteTarget?: (id: TId) => Promise<void> | void;
}

export interface JsonFileStore<TId, TPersisted> {
  readonly runWithLock: <TResult>(id: TId, fn: () => Promise<TResult>) => Promise<TResult>;
  readonly write: (id: TId, payload: TPersisted) => Promise<void>;
  readonly read: (id: TId) => Promise<TPersisted | null>;
  readonly exists: (id: TId) => Promise<boolean>;
}

export function createJsonFileStore<TId, TPersisted>(
  options: JsonFileStoreOptions<TId>
): JsonFileStore<TId, TPersisted> {
  async function runWithLock<TResult>(id: TId, fn: () => Promise<TResult>): Promise<TResult> {
    return withLock(options.getLockKey(id), fn);
  }

  async function write(id: TId, payload: TPersisted): Promise<void> {
    await runWithLock(id, async () => {
      if (options.ensureWriteTarget) {
        await options.ensureWriteTarget(id);
      }
      await writeJsonFile(options.getFilePath(id), payload);
    });
  }

  async function read(id: TId): Promise<TPersisted | null> {
    return readJsonFile<TPersisted>(options.getFilePath(id));
  }

  async function exists(id: TId): Promise<boolean> {
    return fileExists(options.getFilePath(id));
  }

  return {
    runWithLock,
    write,
    read,
    exists,
  };
}
