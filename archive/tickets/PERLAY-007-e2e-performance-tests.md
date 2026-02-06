# PERLAY-007: E2E and Performance Tests

## Status

- [x] Completed

## Summary

Create targeted end-to-end and performance tests for persistence workflows that are not already covered by existing unit/integration tests.

## Files to Create

- `test/e2e/persistence/data-integrity.test.ts`
- `test/performance/persistence/concurrent-writes.test.ts`

## Files to Touch

- None

## Dependencies (Must Be Completed First)

- **PERLAY-001** through **PERLAY-006**: All persistence implementation and integration tests

## Reassessed Assumptions and Scope

1. `Storage.init()` is synchronous (`void`) in current code.
2. `Storage` already exposes `loadAllPages`.
3. Integration coverage already exists for most repository workflows:
   - `test/integration/persistence/story-repository.test.ts`
   - `test/integration/persistence/page-repository.test.ts`
4. FIFO queue semantics are already directly tested in:
   - `test/unit/persistence/lock-manager.test.ts`
5. This ticket should add thin E2E/performance coverage that validates cross-component behavior and contention safety without duplicating existing unit/integration assertions.

## Out of Scope

- **DO NOT** modify persistence source implementation unless tests reveal a required fix
- **DO NOT** test with external services (Redis, etc.)
- **DO NOT** test multi-process scenarios (single-process only)

## Implementation Details

### E2E Data Integrity Tests

`test/e2e/persistence/data-integrity.test.ts`:

Full workflow simulating real application usage:

1. **Complete story creation workflow**
   - Initialize storage
   - Create story
   - Add first page with choices
   - Add child pages
   - Link choices to child pages
   - Verify all data persists and links are correct

2. **Story branching integrity**
   - Create story with page 1 having 3 choices
   - Create pages 2, 3, 4 as children of page 1
   - Verify accumulated state different for each branch
   - Verify choice links correct

3. **Reload from disk**
   - Create story with pages
   - "Restart" by creating new Storage instance
   - Load story and all pages
   - Verify complete data integrity

4. **Delete cascade**
   - Create story with multiple pages
   - Delete story
   - Verify story and all pages gone
   - Verify directory removed

### Performance Tests

`test/performance/persistence/concurrent-writes.test.ts`:

Stress test concurrent operations:

1. **Concurrent page saves (same story)**
   - Create story with page 1
   - Spawn 10 concurrent page save operations
   - All pages saved correctly
   - No data corruption

2. **Concurrent story saves (different stories)**
   - Spawn 10 concurrent story creation operations
   - All stories created correctly
   - No interference between stories

3. **Read-write concurrency**
   - Start writing pages
   - Concurrently read pages
   - No read errors
   - Written data eventually visible

4. **Lock contention handling**
   - Many writes to same story
   - All complete eventually
   - No deadlocks
   - Final persisted state is consistent with serialized writes

## Acceptance Criteria

### Tests That Must Pass

**E2E Data Integrity** (4 test cases):
1. Complete story creation workflow with linking
2. Story branching with different accumulated states
3. Reload from disk maintains integrity
4. Delete cascade removes all data

**Performance/Concurrency** (4 test cases):
1. 10 concurrent page saves to same story - no corruption
2. 10 concurrent story saves - no interference
3. Concurrent reads and writes - no errors
4. Lock contention - no deadlocks, serialized consistency

### Invariants That Must Remain True

1. **No data corruption** - All concurrent operations complete correctly
2. **Lock safety** - Concurrent writes for the same key are serialized safely
3. **Complete cleanup** - Delete removes all associated data
4. **Reload consistency** - Fresh load matches original data
5. **Branching isolation** - Different branches have correct accumulated state

### Performance Requirements

- Concurrent save test should complete within 30 seconds
- No operations should timeout
- No memory leaks from lock queuing

## Test Data Conventions

- E2E tests use `E2E TEST:` prefix
- Performance tests use `PERF TEST:` prefix
- All tests clean up after themselves
- Extended timeout (30s) for performance tests

## Estimated Scope

- ~120-180 lines test code (`test/e2e/persistence/data-integrity.test.ts`)
- ~140-220 lines test code (`test/performance/persistence/concurrent-writes.test.ts`)
- No production API changes expected

## Outcome

- Added `test/e2e/persistence/data-integrity.test.ts` with 4 end-to-end persistence workflow tests.
- Added `test/performance/persistence/concurrent-writes.test.ts` with 4 single-process concurrency/performance tests.
- Implemented per-suite temporary directory isolation (`mkdtemp` + `process.chdir`) and explicit cleanup of story data and temp folders in `afterEach`/`afterAll`.
- Kept production code unchanged.
