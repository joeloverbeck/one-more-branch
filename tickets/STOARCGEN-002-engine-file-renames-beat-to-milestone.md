# STOARCGEN-002: Engine File Renames — beat-*.ts to milestone-*.ts

**Status**: TODO
**Depends on**: STOARCGEN-001
**Blocks**: STOARCGEN-003, STOARCGEN-007

## Summary

Rename the three `beat-*.ts` engine files to `milestone-*.ts` and update all internal references to use the new model type names from STOARCGEN-001.

## Files to Touch

### Renames (old path → new path)
- `src/engine/beat-utils.ts` → `src/engine/milestone-utils.ts`
- `src/engine/beat-conclusion.ts` → `src/engine/milestone-conclusion.ts`
- `src/engine/beat-alignment.ts` → `src/engine/milestone-alignment.ts`

### Import Updates
- `src/engine/index.ts` — Update re-exports to reference new file names

## Detailed Changes

### `beat-utils.ts` → `milestone-utils.ts`
- Rename all functions: `getCurrentBeat` refs → `getCurrentMilestone`, `getBeatOrThrow` → `getMilestoneOrThrow`, `parseBeatIndices` → `parseMilestoneIndices`, etc.
- Update all imports from `story-arc` to use new type names
- Update all internal variable names (`beat` → `milestone`, `beatId` → `milestoneId`, etc.)

### `beat-conclusion.ts` → `milestone-conclusion.ts`
- Same pattern: update imports, type references, variable names
- Function names: any exported functions referencing "beat" rename to "milestone"

### `beat-alignment.ts` → `milestone-alignment.ts`
- Same pattern: update imports, type references, variable names

### `src/engine/index.ts`
- Update barrel exports from `./beat-utils` → `./milestone-utils`, etc.

## Out of Scope

- Other engine files that consume these modules (STOARCGEN-003)
- Test files for these modules (STOARCGEN-007)
- Any logic changes — this is purely a rename + file move
- New fields or new functionality

## Acceptance Criteria

### Tests that must pass
- `npm run typecheck` passes (within this ticket's scope)
- The old file paths must not exist after completion

### Invariants that must remain true
- All exported functions behave identically to their pre-rename counterparts
- No runtime behavior changes
- `src/engine/index.ts` exports all the same symbols (under new names)
