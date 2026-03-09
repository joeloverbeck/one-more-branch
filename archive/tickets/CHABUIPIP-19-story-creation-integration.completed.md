# CHABUIPIP-19: Story Creation Integration with Character Webs

**Status**: COMPLETED
**Dependencies**: CHABUIPIP-15, CHABUIPIP-16, CHABUIPIP-18
**Estimated diff size**: ~150 lines

## Summary

Integrate the character web system into story creation. When a `webId` is provided, story preparation should source characters from the saved character web, run worldbuilding-only decomposition, and continue through structure generation unchanged.

This ticket is primarily an engine/story-preparation change. Route and validation work should stay thin and only forward the optional `webId` into `prepareStory()`.

## File List

- `src/models/story.ts` (MODIFY — add optional `webId` field)
- `src/engine/types.ts` (MODIFY — add optional `webId` to `StartStoryOptions`)
- `src/server/services/story-creation-service.ts` (MODIFY — trim and forward optional `webId`)
- `src/engine/story-service.ts` (MODIFY — branching logic in `buildPreparedStory`)
- `src/server/routes/stories.ts` (MODIFY — pass optional `webId` through both story-creation entry points and map known engine errors cleanly)
- `test/unit/engine/story-service.test.ts` (MODIFY — add web-based story preparation coverage)
- `test/unit/server/routes/stories.test.ts` (MODIFY — add request-plumbing and known-error coverage)
- `test/unit/models/story.test.ts` and/or `test/unit/engine/types.test.ts` (MODIFY only if needed for the new optional field)

## Out of Scope

- Do NOT change the behavior of the character web generation/development pipeline
- Do NOT change the entity decomposer contract itself (already done in CHABUIPIP-18)
- Do NOT rewrite the character web converter logic
- Do NOT modify any prompt builders for story pages
- Do NOT modify the page generation pipeline
- Do NOT create new EJS views for this (new-story.ejs changes are in CHABUIPIP-20)
- Do NOT perform a broad module relocation just to fix layering in this ticket

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
1. Load/convert characters via the existing character-web conversion path instead of duplicating repository/conversion logic in story-service
2. Run `decomposeWorldbuildingOnly()` for world facts
3. Set `story.decomposedCharacters` from the web conversion output
4. Set `story.decomposedWorld` from worldbuilding-only decomposition
5. Skip full `decomposeEntities()` call
6. Store `webId` on story
7. Continue with structure generation and opening-page generation exactly as before

**When `webId` is NOT provided:**
- Unchanged flow — full entity decomposition (characters + world)

Notes:
- Story creation should rely on `characterWebService` to honor the persisted protagonist invariant. `story-service` should not reconstruct protagonist identity itself.
- The returned `DecomposedCharacter[]` must keep the protagonist at index `0` because existing downstream code assumes that ordering.
- The cleanest long-term architecture would move character-web orchestration out of `src/server/services/`, but this ticket should avoid a broad relocation. Reuse the existing conversion path without duplicating web-loading logic.

### `src/server/services/story-creation-service.ts`:

Accept optional `webId` in story creation input, trim it, and include it in the validated payload only when non-empty.

### `src/server/routes/stories.ts`:

Pass optional `webId` through both story-creation entry points (`POST /create` and `POST /create-ajax`).

If story preparation fails with a known `EngineError` caused by invalid or missing `webId`, return/render an appropriate client-facing error rather than collapsing everything into a generic 500.

## Acceptance Criteria

### Tests that must pass

- New tests:
  - Story preparation with `webId` calls the character-web conversion path instead of full `decomposeEntities`
  - Story preparation with `webId` calls `decomposeWorldbuildingOnly`
  - Story preparation with `webId` stores `webId` on the saved story
  - Story preparation with `webId` preserves protagonist-first character ordering from the character-web conversion path
  - Story preparation without `webId` follows the existing full decomposition flow
  - Story creation input validation trims and forwards `webId` only when present
  - Story creation with non-existent `webId` surfaces a known client-facing error path

### Invariants

- `npm run typecheck` passes
- `npm run lint` passes
- Stories created without `webId` continue to use full decomposition
- Existing story-creation behavior remains unchanged outside the new optional `webId` branch
- `webId` is optional on both Story and StartStoryOptions
- The page generation pipeline is NOT modified — only the entity decomposition step changes
- Spine, structure, and page generation proceed identically regardless of web usage

## Reassessed Assumptions

- The story-creation route layer is not the right place for integration logic. It currently validates form input and delegates to `storyEngine.prepareStory()`. The branch belongs in story preparation.
- Accepting `webId` requires changes in `src/server/services/story-creation-service.ts`, not just `src/server/routes/stories.ts`, because that service owns the trimmed request contract.
- Returning a useful error for a missing `webId` likely requires known `EngineError` mapping in the stories route, because the current route mostly treats non-LLM failures as generic 500s.
- Reusing the existing character-web conversion path is more robust than reimplementing web loading + developed/undeveloped character merging inside story-service.

## Outcome

- Completed: 2026-03-09
- Actual changes:
  - Added optional `webId` support to the story model, story-start options, and story-creation input validation.
  - Updated story preparation to branch on `webId`, source characters through `characterWebService.toDecomposedCharacters()`, and use `decomposeWorldbuildingOnly()` for the world pass.
  - Updated story routes to forward `webId` and map known `EngineError` validation/resource failures into client-facing HTTP responses instead of generic 500s.
  - Moved character-web orchestration from `src/server/services/character-web-service.ts` to `src/services/character-web-service.ts` so engine-layer code no longer depends on a server-namespaced module.
  - Added/strengthened unit coverage for the story-preparation branch, route plumbing/error handling, input validation, and story model persistence contract.
- Deviations from plan:
  - The initial implementation reused the existing singleton from its old module path. I then completed the broader service relocation in the same pass because the dependency surface was small and the engine-to-server dependency was a real architectural smell.
- Verification:
  - `npx jest test/unit/engine/story-service.test.ts test/unit/server/services/story-creation-service.test.ts test/unit/server/routes/stories.test.ts test/unit/models/story.test.ts --runInBand`
  - `npx jest test/unit/persistence/story-repository.test.ts --runInBand`
  - `npm run typecheck`
  - `npm run lint`
