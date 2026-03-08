# CHABUIPIP-03: Create SavedDevelopedCharacter Data Model

**Status**: NOT STARTED
**Dependencies**: CHABUIPIP-01
**Estimated diff size**: ~120 lines

## Summary

Create the `SavedDevelopedCharacter` interface, `CharacterWebContext` interface, type guard, and helper functions (`isCharacterStageComplete`, `canGenerateCharacterStage`, `isCharacterFullyComplete`).

## File List

- `src/models/saved-developed-character.ts` (CREATE)
- `test/unit/models/saved-developed-character.test.ts` (CREATE)

## Out of Scope

- Do NOT create persistence/repository code (CHABUIPIP-06)
- Do NOT create any service, route, or LLM code
- Do NOT modify `saved-cast.ts` or `character-pipeline-types.ts`
- Do NOT modify any existing models

## Detailed Changes

### New file `src/models/saved-developed-character.ts`:

```typescript
interface CharacterWebContext {
  readonly assignment: CastRoleAssignment;
  readonly relationshipArchetypes: readonly RelationshipArchetype[];
  readonly castDynamicsSummary: string;
}

interface SavedDevelopedCharacter {
  readonly id: string;
  readonly characterName: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly sourceWebId: string;
  readonly sourceWebName: string;
  readonly webContext: CharacterWebContext;
  readonly characterKernel: CharacterKernel | null;
  readonly tridimensionalProfile: TridimensionalProfile | null;
  readonly agencyModel: AgencyModel | null;
  readonly deepRelationships: DeepRelationshipResult | null;
  readonly textualPresentation: TextualPresentation | null;
  readonly completedStages: readonly CharacterDevStage[];
}
```

Export:
- `CharacterWebContext` interface
- `SavedDevelopedCharacter` interface
- `isSavedDevelopedCharacter(value: unknown): value is SavedDevelopedCharacter`
- `isCharacterStageComplete(char: SavedDevelopedCharacter, stage: CharacterDevStage): boolean`
- `canGenerateCharacterStage(char: SavedDevelopedCharacter, stage: CharacterDevStage): boolean`
  - Stage 1: always true
  - Stage N (2-5): true only if stage N-1 is complete
- `isCharacterFullyComplete(char: SavedDevelopedCharacter): boolean`
  - True when `completedStages` contains all 5 stages

## Acceptance Criteria

### Tests that must pass

- `test/unit/models/saved-developed-character.test.ts`:
  - `isSavedDevelopedCharacter` returns true for valid object with all nullable fields null
  - `isSavedDevelopedCharacter` returns true for valid object with all stages populated
  - `isSavedDevelopedCharacter` returns false for missing required fields
  - `isCharacterStageComplete` returns true when stage is in completedStages
  - `isCharacterStageComplete` returns false when stage is not in completedStages
  - `canGenerateCharacterStage` returns true for stage 1 always
  - `canGenerateCharacterStage` returns true for stage 2 when stage 1 complete
  - `canGenerateCharacterStage` returns false for stage 2 when stage 1 not complete
  - `canGenerateCharacterStage` returns false for stage 5 when stage 4 not complete
  - `isCharacterFullyComplete` returns true when all 5 stages complete
  - `isCharacterFullyComplete` returns false when any stage missing

### Invariants

- `npm run typecheck` passes
- `npm run lint` passes
- No existing tests are modified
- All fields use `readonly` (immutability pattern)
- Stage nullable fields are `| null`, not optional (explicit presence)
