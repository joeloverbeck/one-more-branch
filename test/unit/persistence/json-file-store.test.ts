import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { createJsonFileStore } from '@/persistence/json-file-store';

describe('json-file-store', () => {
  const tempRoot = path.join(process.cwd(), 'test', 'temp', 'json-file-store');

  beforeEach(async () => {
    await fsPromises.rm(tempRoot, { recursive: true, force: true });
    await fsPromises.mkdir(tempRoot, { recursive: true });
  });

  afterEach(async () => {
    await fsPromises.rm(tempRoot, { recursive: true, force: true });
  });

  function createStore(): ReturnType<typeof createJsonFileStore<string, { readonly value: string }>> {
    return createJsonFileStore<string, { readonly value: string }>({
      getFilePath: (id) => path.join(tempRoot, `${id}.json`),
      getLockKey: (id) => `json-store:${id}`,
      ensureWriteTarget: async () => {
        await fsPromises.mkdir(tempRoot, { recursive: true });
      },
    });
  }

  it('writes and reads payloads by id', async () => {
    const store = createStore();

    await store.write('alpha', { value: 'hello' });

    await expect(store.read('alpha')).resolves.toEqual({ value: 'hello' });
  });

  it('returns null when payload does not exist', async () => {
    const store = createStore();

    await expect(store.read('missing')).resolves.toBeNull();
  });

  it('reports file existence', async () => {
    const store = createStore();

    await expect(store.exists('beta')).resolves.toBe(false);
    await store.write('beta', { value: 'exists' });
    await expect(store.exists('beta')).resolves.toBe(true);
  });

  it('serializes concurrent writes to the same lock key', async () => {
    const store = createStore();

    const order: string[] = [];
    await Promise.all([
      store.runWithLock('shared', async () => {
        order.push('first:start');
        await new Promise((resolve) => setTimeout(resolve, 20));
        order.push('first:end');
      }),
      store.runWithLock('shared', async () => {
        order.push('second:start');
        await Promise.resolve();
        order.push('second:end');
      }),
    ]);

    expect(order).toEqual(['first:start', 'first:end', 'second:start', 'second:end']);
  });
});
