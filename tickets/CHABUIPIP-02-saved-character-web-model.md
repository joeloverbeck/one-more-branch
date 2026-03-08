# CHABUIPIP-02: Create SavedCharacterWeb Data Model

**Status**: NOT STARTED
**Dependencies**: CHABUIPIP-01
**Estimated diff size**: ~80 lines

## Summary

Create the `SavedCharacterWeb` interface and its type guard. This is the new artifact that replaces `SavedCast` conceptually — it stores cast role assignments + lightweight relationship archetypes + dynamics summary.

## File List

- `src/models/saved-character-web.ts` (CREATE)
- `test/unit/models/saved-character-web.test.ts` (CREATE)

## Out of Scope

- Do NOT create persistence/repository code (CHABUIPIP-05)
- Do NOT create any service or route code
- Do NOT modify `saved-cast.ts` or delete it
- Do NOT modify `character-pipeline-types.ts` (done in CHABUIPIP-01)
- Do NOT create any LLM prompts or schemas

## Detailed Changes

### New file `src/models/saved-character-web.ts`:

```typescript
interface SavedCharacterWeb {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly sourceKernelId?: string;
  readonly sourceConceptId?: string;
  readonly inputs: CastPipelineInputs;
  readonly assignments: readonly CastRoleAssignment[];
  readonly relationshipArchetypes: readonly RelationshipArchetype[];
  readonly castDynamicsSummary: string;
}
```

Export:
- `SavedCharacterWeb` interface
- `isSavedCharacterWeb(value: unknown): value is SavedCharacterWeb` type guard

The type guard must validate:
- All required string fields present and of type string
- `inputs` is an object
- `assignments` is an array
- `relationshipArchetypes` is an array
- `castDynamicsSummary` is a string

## Acceptance Criteria

### Tests that must pass

- `test/unit/models/saved-character-web.test.ts`:
  - `isSavedCharacterWeb` returns true for a valid SavedCharacterWeb object
  - `isSavedCharacterWeb` returns false when `id` is missing
  - `isSavedCharacterWeb` returns false when `assignments` is missing
  - `isSavedCharacterWeb` returns false when `relationshipArchetypes` is missing
  - `isSavedCharacterWeb` returns false when `castDynamicsSummary` is missing
  - `isSavedCharacterWeb` returns false for null/undefined/non-object inputs

### Invariants

- `npm run typecheck` passes
- `npm run lint` passes
- No existing tests are modified
- Interface uses `readonly` on all fields (immutability pattern)
