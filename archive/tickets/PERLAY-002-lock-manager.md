# PERLAY-002: Lock Manager Module

## Status

- [ ] In progress
- [x] Completed

## Summary

Implement an in-memory lock manager for serializing write operations to the same story. This prevents data corruption from concurrent writes.

## Files to Create

- `src/persistence/lock-manager.ts`

## Files to Touch

- `test/unit/persistence/lock-manager.test.ts` (new)
- Optional: test config or import wiring only if required to execute the new unit tests (no API changes)

## Assumption Reassessment

### Confirmed

- `specs/03-persistence-layer.md` requires a lock manager module for per-story write serialization.
- This ticket should introduce only in-process locking (single Node.js process), not distributed locking.
- A singleton lock manager plus `withLock` helper is the intended public API for this step.

### Corrected

- The repository currently has only `src/persistence/file-utils.ts`; `story-repository.ts`, `page-repository.ts`, `storage.ts`, and `src/persistence/index.ts` do not exist yet.
- Therefore this ticket cannot rely on repository-level integration tests and should be satisfied with focused unit tests for `lock-manager.ts`.
- `getQueueLength(key)` must be interpreted and tested as the number of lock entries currently queued for the key (active holder + waiters), matching the lock queue data structure used in this module.

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify `src/persistence/file-utils.ts`
- **DO NOT** implement distributed locking (Redis, etc.) - this is single-process only
- **DO NOT** create story/page repositories or storage facade in this ticket
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
- `getQueueLength(key: string): number` - get number of queued lock entries for the key

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
   - `getQueueLength` reflects total queued lock entries for the key
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

## Outcome

- **Planned**: Add `src/persistence/lock-manager.ts` with singleton lock manager and `withLock`, plus unit tests for lock behavior.
- **Actual**: Added `src/persistence/lock-manager.ts` and `test/unit/persistence/lock-manager.test.ts` with coverage for acquire/release, `withLock` return and error safety, FIFO serialization on same key, isolation across different keys, and queue length cleanup behavior.
- **Scope differences vs original**:
  - Corrected test expectation wording so `getQueueLength` reflects total queued entries for a key (active + waiting), matching the module’s queue model.
  - No additional wiring files were needed; implementation stayed isolated to the new module and its unit tests.
