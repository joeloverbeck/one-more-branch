# CHABUIPIP-19: Story Creation Integration with Character Webs

**Status**: NOT STARTED
**Dependencies**: CHABUIPIP-15, CHABUIPIP-16, CHABUIPIP-18
**Estimated diff size**: ~100 lines

## Summary

Integrate the character web system into story creation. When a `webId` is provided, story creation uses pre-built characters from the web (via converter) and runs worldbuilding-only decomposition instead of full entity decomposition.

## File List

- `src/models/story.ts` (MODIFY — add optional `webId` field)
- `src/engine/types.ts` (MODIFY — add optional `webId` to `StartStoryOptions`)
- `src/engine/story-service.ts` (MODIFY — branching logic in `buildPreparedStory`)
- `src/server/routes/stories.ts` (MODIFY — accept `webId` in story creation request)
- `test/unit/engine/story-service.test.ts` or `test/integration/engine/story-service.test.ts` (MODIFY — add web-based story creation tests)

## Out of Scope

- Do NOT modify the character web service
- Do NOT modify the entity decomposer (already done in CHABUIPIP-18)
- Do NOT modify the character web converter
- Do NOT modify any prompt builders for story pages
- Do NOT modify any existing story creation tests (unless they break from the Story type change)
- Do NOT modify the page generation pipeline
- Do NOT create new EJS views for this (new-story.ejs changes are in CHABUIPIP-20)

## Detailed Changes

### `src/models/story.ts`:

Add optional field to Story interface:
```typescript
readonly webId?: string;
```

### `src/engine/types.ts`:

Add optional field to `StartStoryOptions`:
```typescript
readonly webId?: string;
```

### `src/engine/story-service.ts`:

In `buildPreparedStory()`, add branching logic:

**When `webId` is provided:**
1. Load SavedCharacterWeb by webId (via characterWebService)
2. Convert to `DecomposedCharacter[]` via `characterWebService.toDecomposedCharacters(webId)`
3. Run `decomposeWorldbuildingOnly()` (worldbuilding-only decomposition)
4. Set `story.decomposedCharacters` from converter output
5. Set `story.decomposedWorld` from worldbuilding-only decomposition
6. Skip full `decomposeEntities()` call
7. Store `webId` on story
8. Continue with spine -> structure -> first page as normal

**When `webId` is NOT provided:**
- Unchanged flow — full entity decomposition (characters + world)

Notes:
- Story creation should rely on `characterWebService` to honor the persisted protagonist invariant. `story-service` should not reconstruct protagonist identity itself.
- The returned `DecomposedCharacter[]` must keep the protagonist at index `0` because existing downstream code assumes that ordering.

### `src/server/routes/stories.ts`:

Accept optional `webId` in story creation POST body. Pass to `StartStoryOptions`.

## Acceptance Criteria

### Tests that must pass

- New tests:
  - Story creation with `webId` calls `toDecomposedCharacters` instead of `decomposeEntities`
  - Story creation with `webId` calls `decomposeWorldbuildingOnly` instead of full decomposition
  - Story creation with `webId` stores `webId` on the story
  - Story creation with `webId` preserves protagonist-first character ordering from `characterWebService`
  - Story creation without `webId` follows unchanged flow
  - Story creation with non-existent `webId` returns appropriate error

### Invariants

- `npm run typecheck` passes
- `npm run lint` passes
- **Backwards compatibility**: Stories created without `webId` work exactly as before
- All existing story creation tests pass unchanged
- `webId` is optional on both Story and StartStoryOptions
- The page generation pipeline is NOT modified — only the entity decomposition step changes
- Spine, structure, and page generation proceed identically regardless of web usage
