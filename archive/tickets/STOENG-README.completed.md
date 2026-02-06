# Story Engine Tickets

Implementation tickets for **Spec 05: Story Engine Core**.

## Ticket Overview

| Ticket | Description | Depends On | Est. Size |
|--------|-------------|------------|-----------|
| [STOENG-001](./STOENG-001-types.md) | Engine Types and Error Classes | None | ~120 LOC |
| [STOENG-002](./STOENG-002-state-manager.md) | State Accumulation Logic | STOENG-001 | ~100 LOC |
| [STOENG-003](./STOENG-003-canon-manager.md) | Canon Management Logic | STOENG-001 | ~150 LOC |
| [STOENG-004](./STOENG-004-page-service.md) | Page Generation Operations | STOENG-001-003 | ~200 LOC |
| [STOENG-005](./STOENG-005-story-service.md) | Story Lifecycle Operations | STOENG-001, 004 | ~180 LOC |
| [STOENG-006](./STOENG-006-story-engine.md) | Main Engine Class | STOENG-001, 004, 005 | ~200 LOC |
| [STOENG-007](./STOENG-007-barrel-export.md) | Barrel Export | All above | ~50 LOC |
| [STOENG-008](./STOENG-008-integration-tests.md) | Integration Tests | STOENG-007 | ~300 LOC tests |
| [STOENG-009](./STOENG-009-e2e-tests.md) | E2E Tests | STOENG-007 | ~100 LOC tests |
| [STOENG-010](./STOENG-010-spec-update.md) | Update Implementation Tracker | All above | ~5 LOC |

## Dependency Graph

```
STOENG-001 (types)
    │
    ├──► STOENG-002 (state-manager)
    │         │
    ├──► STOENG-003 (canon-manager)
    │         │
    │         └─────────┴──► STOENG-004 (page-service)
    │                              │
    │                              ▼
    └──────────────────────► STOENG-005 (story-service)
                                   │
                                   ▼
                            STOENG-006 (story-engine)
                                   │
                                   ▼
                            STOENG-007 (barrel export)
                                   │
                          ┌────────┴────────┐
                          ▼                 ▼
                   STOENG-008         STOENG-009
                 (integration)          (e2e)
                          │                 │
                          └────────┬────────┘
                                   ▼
                            STOENG-010 (spec update)
```

## Implementation Order

### Phase 1: Foundation (can be parallel after 001)
1. **STOENG-001** - Types (no dependencies)
2. **STOENG-002** - State Manager (depends on types)
3. **STOENG-003** - Canon Manager (depends on types)

### Phase 2: Services
4. **STOENG-004** - Page Service (depends on 001-003)
5. **STOENG-005** - Story Service (depends on 001, 004)

### Phase 3: Orchestration
6. **STOENG-006** - Story Engine (depends on 001, 004, 005)
7. **STOENG-007** - Barrel Export (depends on all modules)

### Phase 4: Testing
8. **STOENG-008** - Integration Tests (depends on 007)
9. **STOENG-009** - E2E Tests (depends on 007)

### Phase 5: Completion
10. **STOENG-010** - Spec Update (after all above complete)

**Note**: Tickets 002 and 003 can be implemented in parallel after ticket 001 is complete.

## Files Created

After all tickets are complete, `src/engine/` will contain:

```
src/engine/
├── index.ts          # Barrel exports
├── story-engine.ts   # Main engine class
├── story-service.ts  # Story-level operations
├── page-service.ts   # Page-level operations
├── state-manager.ts  # State accumulation logic
├── canon-manager.ts  # Canon management logic
└── types.ts          # Type definitions
```

## Test Files Created

```
test/unit/engine/
├── types.test.ts
├── state-manager.test.ts
├── canon-manager.test.ts
├── page-service.test.ts
├── story-service.test.ts
├── story-engine.test.ts
└── index.test.ts

test/integration/engine/
├── story-engine.test.ts
└── replay.test.ts

test/e2e/engine/
└── full-playthrough.test.ts
```

## Running Tests

```bash
# All engine unit tests
npm run test:unit -- --testPathPattern=engine

# All engine integration tests (requires OPENROUTER_TEST_KEY)
npm run test:integration -- --testPathPattern=engine

# All engine E2E tests (requires OPENROUTER_TEST_KEY)
npm run test:e2e -- --testPathPattern=engine

# Individual test files
npm run test:unit -- --testPathPattern=state-manager
npm run test:unit -- --testPathPattern=canon-manager
npm run test:unit -- --testPathPattern=story-engine
```

## Key Invariants

The engine must maintain these invariants across all tickets:

1. **Page Immutability**: Once generated, page content never changes
2. **Deterministic Replay**: Same choice always returns identical page
3. **State Accumulation**: Child pages include all ancestor state changes
4. **Canon Monotonicity**: Global canon only grows, never shrinks
5. **Acyclic Graph**: No page links create cycles
6. **Branch Isolation**: State changes don't leak across branches
7. **Ending Consistency**: Ending pages have 0 choices, non-endings have 2+
8. **Page 1 Root**: Every story has exactly one page 1 with no parent
9. **API Key Security**: Never persisted, only passed per-operation
