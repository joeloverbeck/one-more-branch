# STRSTOARCSYS-008: Update Story Service

## Status
Completed on 2026-02-07.

## Summary
Modify `startNewStory()` to generate the story structure BEFORE generating the first page. Wire up the structure generation flow with the smallest viable dependency surface.

## Reassessed Assumptions
- `Story.structure` and `updateStoryStructure()` already exist in the current codebase.
- `startNewStory()` still uses the old flow (save story -> generate first page) and does not generate structure.
- `generateStoryStructure()` is **not currently implemented/exported** in `src/llm`, so this ticket must include a minimal unblocker for that dependency.
- `page-service.ts` still has legacy `storyArc` handling; that remains out of scope for this ticket (handled by STRSTOARCSYS-009).

## Files to Touch
- `src/engine/story-service.ts`
- `src/llm/structure-generator.ts` (NEW, minimal unblocker for missing dependency)
- `src/llm/index.ts` (export unblocker)
- `test/unit/engine/story-service.test.ts`

## Out of Scope
- DO NOT modify `page-service.ts` (that's STRSTOARCSYS-009)
- DO NOT modify data models directly
- DO NOT modify prompts
- DO NOT modify persistence layer
- DO NOT migrate remaining legacy `storyArc` usage in llm/page flow beyond what is required for `startNewStory()` wiring

## Implementation Details

### Update Imports

```typescript
import { updateStoryStructure } from '../models';
import { generateStoryStructure } from '../llm';
import { createStoryStructure } from './structure-manager';
```

### Modify `startNewStory()`

Current flow:
1. Create story with `structure: null`
2. Save story
3. Generate first page
4. Optionally update story if first-page generation added canon
5. Save page

New flow:
1. Create story with `structure: null`
2. Save story
3. **NEW**: Generate story structure
4. **NEW**: Transform result to StoryStructure
5. **NEW**: Update story with structure
6. Generate first page (passing structure)
7. Save page
8. Return story and page

```typescript
export async function startNewStory(options: StartStoryOptions): Promise<StartStoryResult> {
  // ... validation ...

  const story = createStory({
    title,
    characterConcept,
    worldbuilding: options.worldbuilding,
    tone: options.tone,
  });

  try {
    await storage.saveStory(story);

    // NEW: Generate structure before first page
    const structureResult = await generateStoryStructure(
      {
        characterConcept: story.characterConcept,
        worldbuilding: story.worldbuilding,
        tone: story.tone,
      },
      options.apiKey,
    );

    const structure = createStoryStructure(structureResult);
    let updatedStory = updateStoryStructure(story, structure);
    await storage.updateStory(updatedStory);

    // Generate first page with structure context
    const { page, updatedStory: finalStory } = await generateFirstPage(
      updatedStory,
      options.apiKey,
    );

    await storage.savePage(finalStory.id, page);

    if (finalStory !== updatedStory) {
      await storage.updateStory(finalStory);
    }

    return { story: finalStory, page };
  } catch (error) {
    // ... cleanup on error ...
    throw error;
  }
}
```

### Error Handling

If structure generation fails:
- Clean up the created story (delete it)
- Propagate the error with appropriate context

### Minimal Dependency Unblocker
- Add a minimal `generateStoryStructure(context, apiKey)` implementation in `src/llm/structure-generator.ts`.
- Export it from `src/llm/index.ts`.
- Keep this implementation narrow to support `startNewStory()` wiring only (full STRSTOARCSYS-013 hardening remains separate).

## Acceptance Criteria

### Tests That Must Pass

Update `test/unit/engine/story-service.test.ts`:

1. `startNewStory` successful flow
   - Calls `generateStoryStructure` before `generateFirstPage`
   - Calls `storage.updateStory` with `structure` before first page generation
   - Passes a story with non-null `structure` to first page generation
   - Returns story with `structure` set (not null)
   - Returns story with valid structure object

2. `startNewStory` structure generation order
   - Structure is generated BEFORE first page
   - Story is updated with structure BEFORE first page generation
   - First page receives story with structure

3. `startNewStory` error handling
   - If structure generation fails, story is cleaned up (deleted)
   - Original error is propagated

4. Dependency unblocker
   - `generateStoryStructure` is exported from `src/llm/index.ts`
   - `story-service` can import and call it directly

### Invariants That Must Remain True
- Story is always saved before expensive operations
- On any failure, created resources are cleaned up
- Story returned has non-null `structure` after successful creation
- All existing validation (title, characterConcept, apiKey) still works
- TypeScript strict mode passes
- Error handling for cleanup still works

## Dependencies
- STRSTOARCSYS-002 (Story model with structure field)
- STRSTOARCSYS-007 (createStoryStructure function)
- STRSTOARCSYS-013 (full structure generator hardening; this ticket includes only the minimal unblocker needed now)

## Breaking Changes
- `startNewStory` now makes an additional API call (structure generation)
- Return type unchanged, but `story.structure` will be set
- Tests mocking `generateFirstPage` may need to account for structure

## Estimated Scope
~60-120 lines of code changes + targeted unit test updates

## Outcome
- Implemented as planned in `src/engine/story-service.ts`: structure is now generated and persisted before first-page generation.
- Added a minimal unblocker in `src/llm/structure-generator.ts` and `src/llm/index.ts` because the assumed STRSTOARCSYS-013 export was missing in the current repo state.
- Updated `test/unit/engine/story-service.test.ts` with ordering and failure-path coverage for structure generation.
- Kept out-of-scope boundaries: no `page-service`, prompt, schema, or persistence rewrites in this ticket.
