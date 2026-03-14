# STOARCGEN-003: Engine Consumers Rename — beat to milestone

**Status**: TODO
**Depends on**: STOARCGEN-001, STOARCGEN-002
**Blocks**: STOARCGEN-007

## Summary

Update all remaining engine files that import/reference `beat` types, functions, or variable names to use `milestone` equivalents. These files are consumers of the models and utility files renamed in STOARCGEN-001 and STOARCGEN-002.

## Files to Touch

- `src/engine/structure-state.ts` — Rename all beat refs in state machine logic
- `src/engine/structure-factory.ts` — Rename beat refs in structure creation
- `src/engine/structure-types.ts` — Rename `beatAdvanced` → `milestoneAdvanced` in `StructureProgressionResult`
- `src/engine/deviation-processing.ts` — Rename beat refs in deviation detection
- `src/engine/spine-deviation-processing.ts` — Rename beat refs
- `src/engine/structure-rewriter.ts` — Rename beat refs in rewrite logic
- `src/engine/structure-rewrite-support.ts` — Rename beat refs
- `src/engine/pacing-response.ts` — Rename beat refs
- `src/engine/page-builder.ts` — `pageBeatIndex` → `pageMilestoneIndex`, beat refs
- `src/engine/post-generation-processor.ts` — Rename beat refs
- `src/engine/analyst-evaluation.ts` — Rename beat refs
- `src/engine/deviation-handler.ts` — Rename beat refs in deviation detection
- `src/engine/npc-agenda-pipeline.ts` — Rename beat refs (if any)
- `src/engine/page-service.ts` — Rename beat refs
- `src/engine/story-service.ts` — Rename beat refs
- `src/engine/index.ts` — Verify all re-exports use new names

## Detailed Changes

### `structure-types.ts`
| Old | New |
|-----|-----|
| `beatAdvanced` | `milestoneAdvanced` |

### `structure-state.ts`
- All `beat` variable names → `milestone`
- All `BeatProgression` refs → `MilestoneProgression`
- Function parameter names referencing beats

### `page-builder.ts`
| Old | New |
|-----|-----|
| `pageBeatIndex` | `pageMilestoneIndex` |
| All beat variable/field refs | milestone equivalents |

### All other files
- Update imports from `story-arc` and `beat-utils`/`beat-conclusion`/`beat-alignment` to use new names
- Update internal variable names (`beat` → `milestone`, `beatId` → `milestoneId`)
- Update log messages and error strings referencing "beat"

## Out of Scope

- LLM layer files (STOARCGEN-004)
- Persistence files (STOARCGEN-005)
- UI/server files (STOARCGEN-006)
- Test files (STOARCGEN-007)
- New fields or logic changes
- The 3-call pipeline (STOARCGEN-009 through STOARCGEN-012)

## Acceptance Criteria

### Tests that must pass
- `npm run typecheck` passes (within engine layer scope)

### Invariants that must remain true
- `StructureProgressionResult` has same runtime shape (renamed fields only)
- Page builder produces pages with `pageMilestoneIndex` instead of `pageBeatIndex`
- State machine logic (advance, conclude, deviation) behaves identically
- No runtime behavior changes
