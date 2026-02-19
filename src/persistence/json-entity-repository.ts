import * as path from 'path';
import { withLock } from './lock-manager.js';
import { deleteFile, fileExists, listFiles, readJsonFile, writeJsonFile } from './file-utils.js';

export interface JsonEntityRepositoryOptions<TEntity extends { readonly id: string; readonly updatedAt: string }> {
  readonly lockPrefix: string;
  readonly entityLabel: string;
  readonly notFoundLabel: string;
  readonly ensureDir: () => void;
  readonly getDir: () => string;
  readonly getFilePath: (id: string) => string;
  readonly isEntity: (value: unknown) => value is TEntity;
}

function createEntityAsserter<TEntity>(
  isEntity: (value: unknown) => value is TEntity,
  entityLabel: string
): (value: unknown, sourcePath: string) => TEntity {
  return (value: unknown, sourcePath: string): TEntity => {
    if (!isEntity(value)) {
      throw new Error(`Invalid ${entityLabel} payload at ${sourcePath}`);
    }

    return value;
  };
}

export interface JsonEntityRepository<TEntity extends { readonly id: string; readonly updatedAt: string }> {
  readonly save: (entity: TEntity) => Promise<void>;
  readonly load: (id: string) => Promise<TEntity | null>;
  readonly update: (id: string, updater: (existing: TEntity) => TEntity) => Promise<TEntity>;
  readonly remove: (id: string) => Promise<void>;
  readonly list: () => Promise<TEntity[]>;
  readonly exists: (id: string) => Promise<boolean>;
  readonly assertEntity: (value: unknown, sourcePath: string) => TEntity;
}

export function createJsonEntityRepository<
  TEntity extends { readonly id: string; readonly updatedAt: string },
>(options: JsonEntityRepositoryOptions<TEntity>): JsonEntityRepository<TEntity> {
  const assertEntity = createEntityAsserter(options.isEntity, options.entityLabel);

  return {
    assertEntity,

    save: async (entity: TEntity): Promise<void> => {
      await withLock(`${options.lockPrefix}${entity.id}`, async () => {
        options.ensureDir();
        const filePath = options.getFilePath(entity.id);
        const validated = assertEntity(entity, filePath);
        await writeJsonFile(filePath, validated);
      });
    },

    load: async (id: string): Promise<TEntity | null> => {
      const filePath = options.getFilePath(id);
      const entity = await readJsonFile<unknown>(filePath);
      if (entity === null) {
        return null;
      }

      return assertEntity(entity, filePath);
    },

    update: async (id: string, updater: (existing: TEntity) => TEntity): Promise<TEntity> => {
      return withLock(`${options.lockPrefix}${id}`, async () => {
        const filePath = options.getFilePath(id);
        const existing = await readJsonFile<unknown>(filePath);

        if (!existing) {
          throw new Error(`${options.notFoundLabel} not found: ${id}`);
        }

        const validatedExisting = assertEntity(existing, filePath);
        const updated = updater(validatedExisting);
        const validatedUpdated = assertEntity(updated, filePath);
        await writeJsonFile(filePath, validatedUpdated);
        return validatedUpdated;
      });
    },

    remove: async (id: string): Promise<void> => {
      await withLock(`${options.lockPrefix}${id}`, async () => {
        const filePath = options.getFilePath(id);
        await deleteFile(filePath);
      });
    },

    list: async (): Promise<TEntity[]> => {
      const dir = options.getDir();
      const files = await listFiles(dir, /\.json$/);

      const entities: TEntity[] = [];
      for (const file of files) {
        const filePath = path.join(dir, file);
        const entity = await readJsonFile<unknown>(filePath);
        if (entity) {
          entities.push(assertEntity(entity, filePath));
        }
      }

      entities.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      return entities;
    },

    exists: async (id: string): Promise<boolean> => {
      const filePath = options.getFilePath(id);
      return fileExists(filePath);
    },
  };
}

export interface JsonBatchSaverOptions<TBatch extends { readonly id: string }> {
  readonly lockKeyPrefix: string;
  readonly entityLabel: string;
  readonly ensureDir: () => void;
  readonly getFilePath: (id: string) => string;
  readonly isBatch: (value: unknown) => value is TBatch;
}

export function createJsonBatchSaver<TBatch extends { readonly id: string }>(
  options: JsonBatchSaverOptions<TBatch>
): (batch: TBatch) => Promise<void> {
  const assertBatch = createEntityAsserter(options.isBatch, options.entityLabel);

  return async (batch: TBatch): Promise<void> => {
    await withLock(`${options.lockKeyPrefix}${batch.id}`, async () => {
      options.ensureDir();
      const filePath = options.getFilePath(batch.id);
      const validated = assertBatch(batch, filePath);
      await writeJsonFile(filePath, validated);
    });
  };
}
