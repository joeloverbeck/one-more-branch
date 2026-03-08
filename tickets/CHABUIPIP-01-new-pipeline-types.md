# CHABUIPIP-01: Add New Types to character-pipeline-types.ts

**Status**: NOT STARTED
**Dependencies**: None
**Estimated diff size**: ~60 lines

## Summary

Add `RelationshipArchetype`, `DeepRelationshipResult`, `CharacterDevStage`, and `CHARACTER_DEV_STAGE_NAMES` to the existing `character-pipeline-types.ts`. Extract `CastPipelineInputs` from `saved-cast.ts` into this file (preparing for SavedCast retirement in CHABUIPIP-04).

## File List

- `src/models/character-pipeline-types.ts` (MODIFY — add new types + move `CastPipelineInputs` here)
- `src/models/saved-cast.ts` (MODIFY — re-export `CastPipelineInputs` from new location for backwards compat)
- `test/unit/models/character-pipeline-types.test.ts` (CREATE — type guard tests)

## Out of Scope

- Do NOT delete `saved-cast.ts` (that's CHABUIPIP-04)
- Do NOT modify `character-enums.ts` (enums are already complete)
- Do NOT create any persistence, service, or route code
- Do NOT modify any prompt builders or schemas
- Do NOT remove `CastPipelineStage` or `CAST_PIPELINE_STAGE_NAMES` yet (CHABUIPIP-04)

## Detailed Changes

### In `character-pipeline-types.ts`:

1. Add `CastPipelineInputs` interface (moved from `saved-cast.ts`):
   ```typescript
   interface CastPipelineInputs {
     readonly kernelSummary?: string;
     readonly conceptSummary?: string;
     readonly userNotes?: string;
   }
   ```

2. Add `RelationshipArchetype` interface:
   ```typescript
   interface RelationshipArchetype {
     readonly fromCharacter: string;
     readonly toCharacter: string;
     readonly relationshipType: PipelineRelationshipType;
     readonly valence: RelationshipValence;
     readonly essentialTension: string;
   }
   ```

3. Add `DeepRelationshipResult` interface:
   ```typescript
   interface DeepRelationshipResult {
     readonly relationships: readonly CastRelationship[];
     readonly secrets: readonly string[];
     readonly personalDilemmas: readonly string[];
   }
   ```

4. Add `CharacterDevStage` type and `CHARACTER_DEV_STAGE_NAMES`:
   ```typescript
   type CharacterDevStage = 1 | 2 | 3 | 4 | 5;
   const CHARACTER_DEV_STAGE_NAMES: Record<CharacterDevStage, string>;
   ```

5. Add `isRelationshipArchetype()` type guard.

### In `saved-cast.ts`:

- Remove local `CastPipelineInputs` definition
- Re-export from `character-pipeline-types.ts` for backwards compatibility

## Acceptance Criteria

### Tests that must pass

- `test/unit/models/character-pipeline-types.test.ts`:
  - `isRelationshipArchetype` returns true for valid RelationshipArchetype objects
  - `isRelationshipArchetype` returns false for objects missing required fields
  - `CHARACTER_DEV_STAGE_NAMES` maps all 5 stages to correct names
  - `CharacterDevStage` type only accepts 1-5
  - `DeepRelationshipResult` contains relationships, secrets, personalDilemmas arrays

### Invariants

- All existing exports from `character-pipeline-types.ts` remain unchanged
- All existing exports from `saved-cast.ts` remain unchanged (re-export maintains API)
- `npm run typecheck` passes
- `npm run lint` passes
- All existing tests pass unchanged
