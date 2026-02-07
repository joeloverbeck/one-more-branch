# STRREWSYS-000: Structure Rewriting System - Overview

## Summary

This ticket series implements a structure rewriting system for the "One More Branch" interactive storytelling application. When player choices cause the narrative to deviate from planned story beats, the system detects this and regenerates the remaining structure while preserving completed beats.

## Problem Statement

The current story arc system generates a complete 3-act structure upfront with 2-4 beats per act. However, player choices can cause narrative drift that invalidates remaining beats. For example:

- **Beat 2.1**: "Protagonist infiltrates the enemy fortress"
- **Player choice**: "Betray the resistance and join the enemy"
- **Beat 2.2**: "Rescue captured allies from fortress dungeon" ← **Now invalid**

The system needs to detect such deviations and regenerate remaining structure.

## Tickets in This Series

| Ticket | Title | Dependencies | Estimated Complexity |
|--------|-------|--------------|---------------------|
| STRREWSYS-001 | Create Structure Version Types | None | Low |
| STRREWSYS-002 | Create Unit Tests for Structure Version Types | 001 | Low |
| STRREWSYS-003 | Add Structure Versioning to Story Model | 001 | Medium |
| STRREWSYS-004 | Add Structure Version Reference to Page Model | 001 | Low |
| STRREWSYS-005 | Create Deviation Detection Types | None | Low |
| STRREWSYS-006 | Add Deviation Field to LLM Types | 005 | Low |
| STRREWSYS-007 | Add Deviation Detection to Continuation Prompt | None | Medium |
| STRREWSYS-008 | Parse Deviation Detection from LLM Response | 005, 006, 007 | Medium |
| STRREWSYS-009 | Persist Structure Versions in Story Repository | 001, 003, 004 | Medium |
| STRREWSYS-011 | Handle Deviation Detection in Page Service | 005, 006, 008, 012, 013 | High |
| STRREWSYS-012 | Update Structure Manager for Deviation Support | 005, 006 | Medium |
| STRREWSYS-013 | Implement Structure Rewriter Core | 006, 012, 014 | High |
| STRREWSYS-014 | Create Structure Rewrite Prompt | 006 | Medium |
| STRREWSYS-015 | Create Integration Tests | 001-014 | Medium |
| STRREWSYS-016 | Create E2E Tests | 001-015 | Medium |
| STRREWSYS-017 | Create Performance Tests | 001-016 | Low |

## Recommended Implementation Order

### Phase 1: Foundation Types (Can be parallel)
1. **STRREWSYS-001** - Structure version types
2. **STRREWSYS-005** - Deviation detection types
3. **STRREWSYS-002** - Tests for version types (after 001)

### Phase 2: Model Updates (Requires Phase 1)
4. **STRREWSYS-003** - Story model with versions
5. **STRREWSYS-004** - Page model with version reference
6. **STRREWSYS-006** - LLM types with deviation

### Phase 3: Prompt and Parsing (Partially parallel)
7. **STRREWSYS-007** - Continuation prompt updates
8. **STRREWSYS-014** - Structure rewrite prompt
9. **STRREWSYS-008** - Deviation response parsing (after 007)

### Phase 4: Persistence (Requires Phase 2)
10. **STRREWSYS-009** - Persist structure versions

### Phase 5: Core Logic (Requires Phases 2-4)
11. **STRREWSYS-012** - Structure manager helpers
12. **STRREWSYS-013** - Structure rewriter core (after 012, 014)
13. **STRREWSYS-011** - Page service integration (after 008, 012, 013)

### Phase 6: Testing (Requires Phase 5)
14. **STRREWSYS-015** - Integration tests
15. **STRREWSYS-016** - E2E tests
16. **STRREWSYS-017** - Performance tests

## Key Invariants

These invariants MUST be maintained throughout all tickets:

1. **I1: Completed Beats Are Never Modified** - Concluded beats retain exact resolutions
2. **I2: Structure Versions Form a Linear Chain** - Each version points to valid previous
3. **I3: Page Structure Version Exists** - Every page references a valid version or null
4. **I4: Deviation Only Detected for Pending/Active Beats** - Never for concluded beats
5. **I5: Three-Act Structure Maintained** - Always exactly 3 acts
6. **I6: Beat Count Per Act** - Each act has 2-4 beats
7. **I7: Hierarchical Beat IDs** - Format "X.Y" (act.beat)
8. **I8: Immutable Structure Versions** - Never mutate after creation

## Files Changed Summary

### New Files (5)
- `src/models/structure-version.ts`
- `src/llm/deviation-detector.ts`
- `src/llm/prompts/structure-rewrite-prompt.ts`
- `src/engine/structure-rewriter.ts`
- Test files (7+)

### Modified Files (12)
- `src/models/story.ts`
- `src/models/story-arc.ts`
- `src/models/page.ts`
- `src/models/index.ts`
- `src/llm/types.ts`
- `src/llm/prompts/continuation-prompt.ts`
- `src/llm/prompts/index.ts`
- `src/llm/index.ts`
- `src/engine/structure-manager.ts`
- `src/engine/page-service.ts`
- `src/engine/index.ts`
- `src/persistence/story-repository.ts`
- `src/persistence/page-serializer.ts`
- `src/persistence/page-repository.ts`

## Success Criteria

1. All unit tests pass
2. All integration tests pass
3. All E2E tests pass
4. All performance thresholds met
5. Existing stories are not migrated; system prioritizes clean architecture over backward compatibility
6. New stories with deviation handle rewrites correctly

## Non-Goals (Future Considerations)

These are explicitly NOT in scope for this system:

- User-triggered structure review/editing UI
- Structure diff visualization
- Rollback to previous structure versions
- Partial beat editing
- Structure suggestion mode (vs auto-apply)
- Multi-branch structure divergence
