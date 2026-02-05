export type LockRelease = () => void;

interface LockEntry {
  promise: Promise<void>;
  resolve: () => void;
}

class LockManager {
  private locks = new Map<string, LockEntry[]>();

  async acquire(key: string): Promise<LockRelease> {
    const queue = this.locks.get(key) ?? [];

    let resolveEntry: () => void = () => undefined;
    const entryPromise = new Promise<void>((resolve) => {
      resolveEntry = resolve;
    });

    const entry: LockEntry = {
      promise: entryPromise,
      resolve: resolveEntry,
    };

    const previousEntry = queue[queue.length - 1];
    queue.push(entry);
    this.locks.set(key, queue);

    if (previousEntry) {
      await previousEntry.promise;
    }

    let released = false;

    return () => {
      if (released) {
        return;
      }

      released = true;

      const currentQueue = this.locks.get(key);
      if (currentQueue) {
        const index = currentQueue.indexOf(entry);
        if (index >= 0) {
          currentQueue.splice(index, 1);
        }

        if (currentQueue.length === 0) {
          this.locks.delete(key);
        }
      }

      entry.resolve();
    };
  }

  isLocked(key: string): boolean {
    return this.getQueueLength(key) > 0;
  }

  getQueueLength(key: string): number {
    return this.locks.get(key)?.length ?? 0;
  }
}

export const lockManager = new LockManager();

export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const release = await lockManager.acquire(key);

  try {
    return await fn();
  } finally {
    release();
  }
}
