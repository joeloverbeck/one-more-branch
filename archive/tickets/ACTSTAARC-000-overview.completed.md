# ACTSTAARC-000: Active State Architecture Migration - Overview

**Status**: ✅ COMPLETED
**Type**: Epic / Parent Ticket
**Created**: 2026-02-08
**Completed**: 2026-02-08

---

## Summary

This epic tracks the migration from the event-log state system (`stateChanges`/`accumulatedState`) to the new active state system (`activeStateChanges`/`accumulatedActiveState`). The new system tracks "truths that are true right now" instead of a history of events.

---

## Child Tickets

### Phase 1: Core Types (Foundation)

| Ticket | Title | Depends On | Priority |
|--------|-------|------------|----------|
| ACTSTAARC-001 | Define TaggedStateEntry Type and Prefix Parser | - | HIGH |
| ACTSTAARC-002 | Define ActiveState and ActiveStateChanges Types | 001 | HIGH |
| ACTSTAARC-003 | Implement applyActiveStateChanges Function | 001, 002 | HIGH |

### Phase 2: Model Updates

| Ticket | Title | Depends On | Priority |
|--------|-------|------------|----------|
| ACTSTAARC-004 | Add Active State Fields to Page Model | 001, 002, 003 | HIGH |

### Phase 3: LLM Integration

| Ticket | Title | Depends On | Priority |
|--------|-------|------------|----------|
| ACTSTAARC-005 | Update LLM Response Schema for Active State | 001, 002 | HIGH |
| ACTSTAARC-006 | Update ContinuationContext for Active State | 002, 005 | HIGH |
| ACTSTAARC-007 | Update Continuation Prompt for Active State | 006 | HIGH |
| ACTSTAARC-008 | Update System Prompt for Active State Output | 005 | HIGH |
| ACTSTAARC-010 | Update Few-Shot Examples for Active State | 008 | MEDIUM |
| ACTSTAARC-015 | Update Opening Prompt for Active State | 005, 008 | MEDIUM |

### Phase 4: Engine & Persistence

| Ticket | Title | Depends On | Priority |
|--------|-------|------------|----------|
| ACTSTAARC-009 | Update Story Engine for Active State | 004, 005, 006 | HIGH |
| ACTSTAARC-011 | Update Persistence Layer for Active State | 004 | HIGH |

### Phase 5: Migration & Cleanup

| Ticket | Title | Depends On | Priority |
|--------|-------|------------|----------|
| ACTSTAARC-012 | Implement Old Story Migration | 011 | MEDIUM |
| ACTSTAARC-013 | Update Test Fixtures and Mocks | 004, 005, 006 | MEDIUM |
| ACTSTAARC-014 | Remove Old State Types | All others | MEDIUM |

---

## Dependency Graph

```
ACTSTAARC-001 (Tagged Entry Types)
    │
    ├──► ACTSTAARC-002 (ActiveState Types)
    │        │
    │        ├──► ACTSTAARC-003 (Apply Function)
    │        │        │
    │        │        └──► ACTSTAARC-004 (Page Model)
    │        │                 │
    │        │                 ├──► ACTSTAARC-009 (Engine)
    │        │                 ├──► ACTSTAARC-011 (Persistence)
    │        │                 │        │
    │        │                 │        └──► ACTSTAARC-012 (Migration)
    │        │                 │
    │        │                 └──► ACTSTAARC-013 (Test Fixtures)
    │        │
    │        └──► ACTSTAARC-005 (LLM Schema)
    │                 │
    │                 ├──► ACTSTAARC-006 (Context Types)
    │                 │        │
    │                 │        ├──► ACTSTAARC-007 (Continuation Prompt)
    │                 │        │
    │                 │        └──► ACTSTAARC-009 (Engine)
    │                 │
    │                 ├──► ACTSTAARC-008 (System Prompt)
    │                 │        │
    │                 │        ├──► ACTSTAARC-010 (Few-Shot)
    │                 │        │
    │                 │        └──► ACTSTAARC-015 (Opening Prompt)
    │                 │
    │                 └──► ACTSTAARC-015 (Opening Prompt)
    │
    └──► ACTSTAARC-014 (Deprecation) ◄── All other tickets
```

---

## Recommended Execution Order

### Batch 1: Foundation (can be done in parallel internally)
1. ACTSTAARC-001 → ACTSTAARC-002 → ACTSTAARC-003

### Batch 2: Core Changes (can be parallelized)
2. ACTSTAARC-004 (Page Model)
3. ACTSTAARC-005 (LLM Schema)

### Batch 3: Context & Prompts (can be parallelized after Batch 2)
4. ACTSTAARC-006 (Context) → ACTSTAARC-007 (Continuation Prompt)
5. ACTSTAARC-008 (System Prompt)
6. ACTSTAARC-013 (Test Fixtures) - can start in parallel

### Batch 4: Engine & Persistence
7. ACTSTAARC-009 (Engine)
8. ACTSTAARC-011 (Persistence)

### Batch 5: Remaining Prompts & Examples
9. ACTSTAARC-010 (Few-Shot Examples)
10. ACTSTAARC-015 (Opening Prompt)

### Batch 6: Migration & Cleanup
11. ACTSTAARC-012 (Migration)
12. ACTSTAARC-014 (Deprecation) - LAST

---

## Success Criteria

### All Tickets Complete When:
- [x] All new types implemented and tested (001-004)
- [x] LLM outputs new format correctly (005, 008, 010, 015)
- [x] Prompts use active state context (006, 007)
- [x] Engine accumulates state correctly (009)
- [x] Pages persist and load with new format (011)
- [x] Old stories migrated to old-stories/ (012)
- [x] All test fixtures updated (013)
- [x] Old types completely removed (014)

### Key Invariants Preserved:
- Page immutability
- Branch isolation
- State accumulation correctness
- No data loss for existing stories (archived to old-stories/)

---

## Rollback Plan

If issues are found after deployment:

1. **Partial Rollback**: Old stories remain in `old-stories/`, can be moved back
2. **Format Detection**: Code can detect old vs new format via serializer

---

## Outcome

**Completed**: 2026-02-08

### What Was Changed
- Replaced event-log state system with active state system
- Implemented `currentLocation`, `activeThreats`, `activeConstraints`, `openThreads` fields
- Created prefix tag system (THREAT_, CONSTRAINT_, THREAD_) for reliable removal matching
- Extended scene context to show last 2 scenes
- Updated all prompts (system, continuation, opening, few-shot examples)
- Updated persistence layer for new format
- Removed legacy state types and functions:
  - `src/engine/state-manager.ts` (deleted)
  - `src/models/state/general-state.ts` (deleted)
  - `src/persistence/page-state-service.ts` (deleted)

### Verification
- All tests pass with new active state format
- Build and typecheck pass
- No references to old state types remain in source
