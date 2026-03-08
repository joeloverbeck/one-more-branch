# CHABUIPIP-04: Retire SavedCast and Rename castsDir

**Status**: NOT STARTED
**Dependencies**: CHABUIPIP-01, CHABUIPIP-02, CHABUIPIP-03
**Estimated diff size**: ~80 lines (deletions + renames)

## Summary

Delete `saved-cast.ts`, remove `CastPipelineStage` and `CAST_PIPELINE_STAGE_NAMES` from `character-pipeline-types.ts`, and rename `castsDir` to `characterWebsDir` in schemas.ts. Update all imports that referenced the deleted code.

## File List

- `src/models/saved-cast.ts` (DELETE)
- `src/models/character-pipeline-types.ts` (MODIFY — remove `CastPipelineStage`, `CAST_PIPELINE_STAGE_NAMES`)
- `src/config/schemas.ts` (MODIFY — rename `castsDir` to `characterWebsDir`)
- `src/persistence/file-utils.ts` (MODIFY — rename `getCastsDir`/`ensureCastsDir`/`getCastFilePath` to `getCharacterWebsDir`/`ensureCharacterWebsDir`/`getCharacterWebFilePath`)
- Any files importing from `saved-cast.ts` (UPDATE imports)
- `test/unit/models/saved-cast.test.ts` (DELETE if exists)

## Out of Scope

- Do NOT create new repository files (CHABUIPIP-05)
- Do NOT create any service, route, or LLM code
- Do NOT modify any prompt builders
- Do NOT touch `character-enums.ts`

## Detailed Changes

1. **Delete** `src/models/saved-cast.ts`
   - `CastPipelineInputs` was already moved to `character-pipeline-types.ts` in CHABUIPIP-01

2. **In `character-pipeline-types.ts`**:
   - Remove `CastPipelineStage` type (replaced by `CharacterDevStage` from CHABUIPIP-01)
   - Remove `CAST_PIPELINE_STAGE_NAMES` constant
   - Keep all other types (CastRoleAssignment, CharacterKernel, etc.)

3. **In `schemas.ts`**:
   - Rename `castsDir` to `characterWebsDir` in the Zod schema and defaults

4. **In `file-utils.ts`**:
   - Rename `getCastsDir()` → `getCharacterWebsDir()`
   - Rename `ensureCastsDir()` → `ensureCharacterWebsDir()`
   - Rename `getCastFilePath(id)` → `getCharacterWebFilePath(id)`

5. **Update all imports**: grep for `saved-cast`, `CastPipelineStage`, `CAST_PIPELINE_STAGE_NAMES`, `castsDir`, `getCastsDir`, `ensureCastsDir`, `getCastFilePath` and update references.

## Pre-Implementation Check

Before starting, grep the codebase:
```bash
grep -r "saved-cast\|SavedCast\|CastPipelineStage\|CAST_PIPELINE_STAGE_NAMES\|castsDir\|getCastsDir\|ensureCastsDir\|getCastFilePath" src/ test/
```
Update ALL references found.

## Acceptance Criteria

### Tests that must pass

- All existing tests pass (with import updates)
- `npm run typecheck` passes with no references to deleted types
- `npm run lint` passes

### Invariants

- `CastPipelineInputs` is still exported from `character-pipeline-types.ts` (moved in CHABUIPIP-01)
- All other types in `character-pipeline-types.ts` remain unchanged
- No runtime code references `SavedCast`, `CastPipelineStage`, or `CAST_PIPELINE_STAGE_NAMES`
- `schemas.ts` uses `characterWebsDir` with default value `'character-webs'`
- File-utils functions use the new `characterWebs` naming
