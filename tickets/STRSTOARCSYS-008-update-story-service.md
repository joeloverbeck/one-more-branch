# STRSTOARCSYS-008: Update Story Service

## Summary
Modify `startNewStory()` to generate the story structure BEFORE generating the first page. Wire up the structure generation flow.

## Files to Touch
- `src/engine/story-service.ts`

## Out of Scope
- DO NOT modify `page-service.ts` (that's STRSTOARCSYS-009)
- DO NOT modify data models directly
- DO NOT modify prompts
- DO NOT modify persistence layer
- DO NOT create the structure generator function (assume it exists from STRSTOARCSYS-013)

## Implementation Details

### Update Imports

```typescript
import { StoryStructure, updateStoryStructure } from '../models';
import { generateStoryStructure } from '../llm';
import { createStoryStructure } from './structure-manager';
```

### Modify `startNewStory()`

Current flow:
1. Create story with `storyArc: null`
2. Save story
3. Generate first page
4. Update story (with storyArc from page generation)
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

### Remove storyArc Handling

- Remove any code comparing/updating `storyArc`
- The first page generation no longer updates story arc

## Acceptance Criteria

### Tests That Must Pass

Update `test/unit/engine/story-service.test.ts`:

1. `startNewStory` successful flow
   - Calls `generateStoryStructure` before `generateFirstPage`
   - Passes structure context to first page generation
   - Returns story with `structure` set (not null)
   - Returns story with valid StoryStructure object

2. `startNewStory` structure generation order
   - Structure is generated BEFORE first page
   - Story is updated with structure BEFORE first page generation
   - First page receives story with structure

3. `startNewStory` error handling
   - If structure generation fails, story is cleaned up (deleted)
   - Original error is propagated

4. Integration with page service
   - `generateFirstPage` receives story with `structure` set
   - First page has valid `accumulatedStructureState`

5. Removed functionality
   - No `storyArc` comparison or update
   - Story uses `structure` field, not `storyArc`

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
- STRSTOARCSYS-013 (generateStoryStructure function)

## Breaking Changes
- `startNewStory` now makes an additional API call (structure generation)
- Return type unchanged, but `story.structure` will be set
- Tests mocking `generateFirstPage` may need to account for structure

## Estimated Scope
~40 lines of code changes + ~100 lines of test updates
