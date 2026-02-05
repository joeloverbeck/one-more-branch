import { lockManager, withLock } from '@/persistence/lock-manager';

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
}

function createDeferred(): Deferred {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });

  return { promise, resolve };
}

function testKey(name: string): string {
  return `lock-manager:${name}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

describe('lock-manager', () => {
  it('acquires and releases a lock for a key', async () => {
    const key = testKey('acquire-release');

    expect(lockManager.isLocked(key)).toBe(false);
    expect(lockManager.getQueueLength(key)).toBe(0);

    const release = await lockManager.acquire(key);

    expect(lockManager.isLocked(key)).toBe(true);
    expect(lockManager.getQueueLength(key)).toBe(1);

    release();

    expect(lockManager.isLocked(key)).toBe(false);
    expect(lockManager.getQueueLength(key)).toBe(0);
  });

  it('withLock returns the function result and releases afterward', async () => {
    const key = testKey('with-lock-return');

    const result = await withLock(key, async () => {
      expect(lockManager.isLocked(key)).toBe(true);
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(lockManager.isLocked(key)).toBe(false);
    expect(lockManager.getQueueLength(key)).toBe(0);
  });

  it('withLock releases the lock when the function throws', async () => {
    const key = testKey('with-lock-throws');

    await expect(
      withLock(key, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(lockManager.isLocked(key)).toBe(false);
    expect(lockManager.getQueueLength(key)).toBe(0);
  });

  it('serializes concurrent operations for the same key in FIFO order', async () => {
    const key = testKey('same-key-fifo');
    const allowFirstToFinish = createDeferred();
    const secondStarted = createDeferred();
    const order: string[] = [];

    const first = withLock(key, async () => {
      order.push('first:start');
      await allowFirstToFinish.promise;
      order.push('first:end');
    });

    const second = withLock(key, async () => {
      order.push('second:start');
      secondStarted.resolve();
      order.push('second:end');
    });

    await Promise.resolve();
    expect(order).toEqual(['first:start']);
    expect(lockManager.getQueueLength(key)).toBe(2);

    allowFirstToFinish.resolve();
    await secondStarted.promise;
    await Promise.all([first, second]);

    expect(order).toEqual(['first:start', 'first:end', 'second:start', 'second:end']);
    expect(lockManager.isLocked(key)).toBe(false);
    expect(lockManager.getQueueLength(key)).toBe(0);
  });

  it('allows different keys to run in parallel', async () => {
    const keyA = testKey('parallel-a');
    const keyB = testKey('parallel-b');
    const releaseA = createDeferred();
    const releaseB = createDeferred();
    let inFlight = 0;
    let observedParallel = false;

    const operationA = withLock(keyA, async () => {
      inFlight += 1;
      if (inFlight === 2) {
        observedParallel = true;
      }
      await releaseA.promise;
      inFlight -= 1;
    });

    const operationB = withLock(keyB, async () => {
      inFlight += 1;
      if (inFlight === 2) {
        observedParallel = true;
      }
      await releaseB.promise;
      inFlight -= 1;
    });

    await Promise.resolve();

    releaseA.resolve();
    releaseB.resolve();
    await Promise.all([operationA, operationB]);

    expect(observedParallel).toBe(true);
    expect(lockManager.isLocked(keyA)).toBe(false);
    expect(lockManager.isLocked(keyB)).toBe(false);
  });

  it('tracks queue length as total queued entries and cleans up after all releases', async () => {
    const key = testKey('queue-length');

    const releaseFirst = await lockManager.acquire(key);
    const secondLock = lockManager.acquire(key);
    const thirdLock = lockManager.acquire(key);

    expect(lockManager.getQueueLength(key)).toBe(3);

    releaseFirst();
    const releaseSecond = await secondLock;

    expect(lockManager.getQueueLength(key)).toBe(2);

    releaseSecond();
    const releaseThird = await thirdLock;

    expect(lockManager.getQueueLength(key)).toBe(1);

    releaseThird();

    expect(lockManager.getQueueLength(key)).toBe(0);
    expect(lockManager.isLocked(key)).toBe(false);
  });
});
