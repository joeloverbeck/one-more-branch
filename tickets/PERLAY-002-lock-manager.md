# PERLAY-002: Lock Manager Module

## Summary

Implement an in-memory lock manager for serializing write operations to the same story. This prevents data corruption from concurrent writes.

## Files to Create

- `src/persistence/lock-manager.ts`

## Files to Touch

- None (new module, no modifications to existing files)

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify `src/persistence/file-utils.ts`
- **DO NOT** implement distributed locking (Redis, etc.) - this is single-process only
- **DO NOT** create the repository files
- **DO NOT** implement read locks (only write locks needed)

## Implementation Details

### Types

```typescript
type LockRelease = () => void;

interface LockEntry {
  promise: Promise<void>;
  resolve: () => void;
}
```

### LockManager Class

Singleton class with:
- Private `locks: Map<string, LockEntry[]>` - queued locks per key
- `acquire(key: string): Promise<LockRelease>` - acquire lock, return release function
- `isLocked(key: string): boolean` - check if key has active locks
- `getQueueLength(key: string): number` - get number of pending locks

### withLock Helper

```typescript
export async function withLock<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T>
```

Utility function that:
1. Acquires lock
2. Executes function
3. Releases lock (even on error)
4. Returns function result

### Key Behaviors

1. **FIFO ordering** - Locks are granted in request order
2. **Automatic cleanup** - Released locks remove themselves from queue
3. **Error safety** - Errors in locked functions still release the lock
4. **Singleton pattern** - Export single `lockManager` instance

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/persistence/lock-manager.test.ts`:

1. **Basic acquire/release**
   - `isLocked` returns `false` initially
   - After `acquire`, `isLocked` returns `true`
   - After release, `isLocked` returns `false`

2. **withLock helper**
   - Function executes with lock held
   - Lock is released after function completes
   - Lock is released even when function throws
   - Function return value is propagated

3. **Concurrent access serialization**
   - Two concurrent `withLock` calls on same key execute sequentially
   - Order is preserved (first caller completes before second starts)
   - Different keys can run in parallel

4. **Queue management**
   - `getQueueLength` reflects number of waiting locks
   - Queue empties when all locks released
   - Multiple locks on same key queue correctly

### Invariants That Must Remain True

1. **No deadlocks** - Single key locking cannot deadlock
2. **FIFO guarantee** - Locks acquired in order received
3. **Release guarantee** - Lock always released after `withLock` completes
4. **Isolation** - Different keys don't block each other
5. **No memory leaks** - Empty queues are deleted from map

## Test Patterns

```typescript
// Test concurrent serialization
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
```

## Dependencies

- None (pure TypeScript, no external dependencies)

## Estimated Scope

- ~80 lines of implementation code
- ~100 lines of test code
