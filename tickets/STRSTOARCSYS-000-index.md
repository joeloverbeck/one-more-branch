# STRSTOARCSYS: Structured Story Arc System - Ticket Index

## Overview

This ticket set implements a hierarchical 3-act story structure system with beats to replace the simple `storyArc: string | null` field. The system guides LLM storytelling through explicit narrative milestones while maintaining flexibility for player-driven branching.

## Dependency Graph

```
STRSTOARCSYS-001 (Data Models)
    ├── STRSTOARCSYS-002 (Story Model) ──┐
    ├── STRSTOARCSYS-003 (Page Model)    ├── STRSTOARCSYS-010 (Story Persistence)
    │                                     └── STRSTOARCSYS-011 (Page Persistence)
    │
    ├── STRSTOARCSYS-007 (Structure Manager)
    │       │
    │       ├── STRSTOARCSYS-008 (Story Service) ──┐
    │       └── STRSTOARCSYS-009 (Page Service)    │
    │               │                               │
    └───────────────┴───────────────────────────────┴── STRSTOARCSYS-015 (Integration Tests)
                                                              │
STRSTOARCSYS-004 (Structure Prompt) ─────┐                    │
STRSTOARCSYS-012 (Schemas) ──────────────┼── STRSTOARCSYS-013 (Structure Generator)
                                         │         │
STRSTOARCSYS-005 (Opening Prompt) ───────┤         │
STRSTOARCSYS-006 (Continuation Prompt) ──┤         │
STRSTOARCSYS-014 (Examples) ─────────────┘         │
                                                   │
STRSTOARCSYS-017 (Test Mocks) ─────────────────────┴── STRSTOARCSYS-016 (E2E Tests)
```

## Recommended Implementation Order

### Phase 1: Foundation (Parallel)
1. **STRSTOARCSYS-001** - Story Arc Data Models
2. **STRSTOARCSYS-004** - Structure Generation Prompt
3. **STRSTOARCSYS-012** - Update LLM Schemas

### Phase 2: Models (Sequential)
4. **STRSTOARCSYS-002** - Update Story Model (depends on 001)
5. **STRSTOARCSYS-003** - Update Page Model (depends on 001)

### Phase 3: Engine (Sequential)
6. **STRSTOARCSYS-007** - Structure Manager (depends on 001)
7. **STRSTOARCSYS-013** - Structure Generator (depends on 004, 012)

### Phase 4: Prompts (Parallel)
8. **STRSTOARCSYS-005** - Update Opening Prompt (depends on 001)
9. **STRSTOARCSYS-006** - Update Continuation Prompt (depends on 001)
10. **STRSTOARCSYS-014** - Update Examples (depends on 012)

### Phase 5: Persistence (Parallel)
11. **STRSTOARCSYS-010** - Story Persistence (depends on 002)
12. **STRSTOARCSYS-011** - Page Persistence (depends on 003)

### Phase 6: Integration (Sequential)
13. **STRSTOARCSYS-008** - Update Story Service (depends on 002, 007, 013)
14. **STRSTOARCSYS-009** - Update Page Service (depends on 003, 005, 006, 007)

### Phase 7: Tests
15. **STRSTOARCSYS-017** - Update Test Mocks (after all model changes)
16. **STRSTOARCSYS-015** - Integration Tests
17. **STRSTOARCSYS-016** - E2E Tests

## Ticket List

| ID | Title | Scope | Dependencies |
|----|-------|-------|--------------|
| 001 | Story Arc Data Models | ~150 LOC | None |
| 002 | Update Story Model | ~50 LOC | 001 |
| 003 | Update Page Model | ~30 LOC | 001 |
| 004 | Structure Generation Prompt | ~100 LOC | None |
| 005 | Update Opening Prompt | ~60 LOC | 001 |
| 006 | Update Continuation Prompt | ~120 LOC | 001 |
| 007 | Structure Manager | ~150 LOC | 001 |
| 008 | Update Story Service | ~40 LOC | 002, 007, 013 |
| 009 | Update Page Service | ~60 LOC | 003, 005, 006, 007 |
| 010 | Story Persistence | ~80 LOC | 002 |
| 011 | Page Persistence | ~60 LOC | 003 |
| 012 | Update LLM Schemas | ~100 LOC | None |
| 013 | Structure Generator | ~120 LOC | 004, 012 |
| 014 | Update Examples | ~150 LOC | 012 |
| 015 | Integration Tests | ~400 LOC | All impl |
| 016 | E2E Tests | ~200 LOC | All impl |
| 017 | Update Test Mocks | ~250 LOC | Model changes |

## Breaking Changes Summary

This implementation is a **clean break** with no migration path:

1. `Story.storyArc` field removed → `Story.structure`
2. `Page` gains required `accumulatedStructureState` field
3. `GenerationResult.storyArc` removed → `beatConcluded`, `beatResolution`
4. `ContinuationContext.storyArc` removed → `structure`, `accumulatedStructureState`
5. Existing story files will not load (clean break per spec)
6. Existing page files will not load (clean break per spec)

## Key Invariants

From the specification:

1. **INV-1**: Index bounds for act/beat indices
2. **INV-2**: Beat index within current act bounds
3. **INV-3**: Beat status consistency (concluded/active/pending)
4. **INV-4**: Concluded beats must have resolution
5. **INV-5**: 2-4 beats per act
6. **INV-6**: Exactly 3 acts
7. **INV-7**: Unique beat IDs
8. **INV-8**: Beat progressions reference valid beat IDs

## Files Summary

### New Files (10)
- `src/models/story-arc.ts`
- `src/llm/prompts/structure-prompt.ts`
- `src/llm/schemas/structure-schema.ts`
- `src/llm/structure-generator.ts`
- `src/engine/structure-manager.ts`
- `test/unit/models/story-arc.test.ts`
- `test/unit/engine/structure-manager.test.ts`
- `test/integration/engine/structure-flow.test.ts`
- `test/integration/persistence/story-structure.test.ts`
- `test/e2e/structured-story-flow.test.ts`

### Modified Files (16)
- `src/models/story.ts`
- `src/models/page.ts`
- `src/models/index.ts`
- `src/llm/prompts/opening-prompt.ts`
- `src/llm/prompts/continuation-prompt.ts`
- `src/llm/schemas/openrouter-schema.ts`
- `src/llm/schemas/validation-schema.ts`
- `src/llm/schemas/response-transformer.ts`
- `src/llm/types.ts`
- `src/llm/examples.ts`
- `src/llm/index.ts`
- `src/engine/story-service.ts`
- `src/engine/page-service.ts`
- `src/engine/index.ts`
- `src/persistence/story-repository.ts`
- `src/persistence/page-repository.ts`
