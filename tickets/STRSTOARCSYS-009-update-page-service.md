# STRSTOARCSYS-009: Update Page Service

## Summary
Modify page generation functions to handle structure state inheritance and progression. Pass structure to prompts and apply beat advancement based on LLM evaluation.

## Files to Touch
- `src/engine/page-service.ts`

## Out of Scope
- DO NOT modify `story-service.ts` (that's STRSTOARCSYS-008)
- DO NOT modify data models directly
- DO NOT modify prompts
- DO NOT modify persistence layer
- DO NOT modify structure-manager

## Implementation Details

### Update Imports

```typescript
import {
  AccumulatedStructureState,
  createEmptyAccumulatedStructureState,
} from '../models/story-arc';
import {
  applyStructureProgression,
  createInitialStructureState,
} from './structure-manager';
```

### Modify `generateFirstPage()`

```typescript
export async function generateFirstPage(
  story: Story,
  apiKey: string,
): Promise<{ page: Page; updatedStory: Story }> {
  const result = await generateOpeningPage(
    {
      characterConcept: story.characterConcept,
      worldbuilding: story.worldbuilding,
      tone: story.tone,
      structure: story.structure ?? undefined,  // NEW: pass structure
    },
    { apiKey },
  );

  // NEW: Create initial structure state
  const initialStructureState = story.structure
    ? createInitialStructureState(story.structure)
    : createEmptyAccumulatedStructureState();

  const page = createPage({
    id: parsePageId(1),
    narrativeText: result.narrative,
    choices: result.choices.map(choiceText => createChoice(choiceText)),
    stateChanges: createStateChanges(result.stateChangesAdded, result.stateChangesRemoved),
    inventoryChanges: createInventoryChanges(result.inventoryAdded, result.inventoryRemoved),
    healthChanges: createHealthChanges(result.healthAdded, result.healthRemoved),
    characterStateChanges: createCharacterStateChanges(
      result.characterStateChangesAdded,
      result.characterStateChangesRemoved,
    ),
    isEnding: result.isEnding,
    parentPageId: null,
    parentChoiceIndex: null,
    parentAccumulatedStructureState: initialStructureState,  // NEW
  });

  let updatedStory = updateStoryWithAllCanon(story, result.newCanonFacts, result.newCharacterCanonFacts);

  // REMOVED: storyArc handling
  // const nextStoryArc = result.storyArc?.trim();
  // if (nextStoryArc && nextStoryArc !== updatedStory.storyArc) {
  //   updatedStory = updateStoryArc(updatedStory, nextStoryArc);
  // }

  return { page, updatedStory };
}
```

### Modify `generateNextPage()`

```typescript
export async function generateNextPage(
  story: Story,
  parentPage: Page,
  choiceIndex: number,
  apiKey: string,
): Promise<{ page: Page; updatedStory: Story }> {
  // ... existing choice validation ...

  const maxPageId = await storage.getMaxPageId(story.id);
  const parentAccumulatedState = getParentAccumulatedState(parentPage);
  const parentAccumulatedInventory = getParentAccumulatedInventory(parentPage);
  const parentAccumulatedHealth = getParentAccumulatedHealth(parentPage);
  const parentAccumulatedCharacterState = getParentAccumulatedCharacterState(parentPage);

  // NEW: Get parent's structure state
  const parentStructureState = parentPage.accumulatedStructureState;

  const result = await generateContinuationPage(
    {
      characterConcept: story.characterConcept,
      worldbuilding: story.worldbuilding,
      tone: story.tone,
      globalCanon: story.globalCanon,
      globalCharacterCanon: story.globalCharacterCanon,
      structure: story.structure ?? undefined,           // NEW
      accumulatedStructureState: parentStructureState,   // NEW
      previousNarrative: parentPage.narrativeText,
      selectedChoice: choice.text,
      accumulatedState: parentAccumulatedState.changes,
      accumulatedInventory: parentAccumulatedInventory,
      accumulatedHealth: parentAccumulatedHealth,
      accumulatedCharacterState: parentAccumulatedCharacterState,
    },
    { apiKey },
  );

  // NEW: Apply structure progression based on LLM evaluation
  const newStructureState = story.structure
    ? applyStructureProgression(
        story.structure,
        parentStructureState,
        result.beatConcluded,
        result.beatResolution,
      )
    : parentStructureState;

  const page = createPage({
    id: generatePageId(maxPageId),
    narrativeText: result.narrative,
    choices: result.choices.map(choiceText => createChoice(choiceText)),
    stateChanges: createStateChanges(result.stateChangesAdded, result.stateChangesRemoved),
    inventoryChanges: createInventoryChanges(result.inventoryAdded, result.inventoryRemoved),
    healthChanges: createHealthChanges(result.healthAdded, result.healthRemoved),
    characterStateChanges: createCharacterStateChanges(
      result.characterStateChangesAdded,
      result.characterStateChangesRemoved,
    ),
    isEnding: result.isEnding,
    parentPageId: parentPage.id,
    parentChoiceIndex: choiceIndex,
    parentAccumulatedState,
    parentAccumulatedInventory,
    parentAccumulatedHealth,
    parentAccumulatedCharacterState,
    parentAccumulatedStructureState: newStructureState,  // NEW
  });

  let updatedStory = updateStoryWithAllCanon(story, result.newCanonFacts, result.newCharacterCanonFacts);

  // REMOVED: storyArc handling

  return { page, updatedStory };
}
```

### Remove storyArc Handling

Remove all code related to:
- `result.storyArc`
- `updateStoryArc()`
- Comparison of story arcs

## Acceptance Criteria

### Tests That Must Pass

Update `test/unit/engine/page-service.test.ts`:

1. `generateFirstPage` with structure
   - Passes `structure` to `generateOpeningPage` context
   - Creates initial structure state using `createInitialStructureState`
   - Page has valid `accumulatedStructureState`

2. `generateFirstPage` without structure
   - Works when `story.structure` is null
   - Uses empty structure state

3. `generateNextPage` structure context
   - Passes `structure` and `accumulatedStructureState` to continuation context
   - Gets parent's structure state from parent page

4. `generateNextPage` beat advancement
   - When `result.beatConcluded: true`, calls `applyStructureProgression`
   - When `result.beatConcluded: false`, inherits parent state unchanged
   - New page has correctly advanced structure state

5. `generateNextPage` branch isolation
   - Different branches can have different structure progression
   - Beat concluded in one branch doesn't affect other branches

6. Removed functionality
   - No `storyArc` handling in either function
   - No `updateStoryArc` calls

### Invariants That Must Remain True
- Page 1's structure state is initial state from `createInitialStructureState`
- Subsequent pages inherit parent's structure state
- If `beatConcluded`, inherited state is advanced before storing
- All existing page functionality (choices, state, inventory, etc.) unchanged
- TypeScript strict mode passes
- Existing tests pass (with mock updates)

## Dependencies
- STRSTOARCSYS-003 (Page model with accumulatedStructureState)
- STRSTOARCSYS-005 (Opening prompt with structure)
- STRSTOARCSYS-006 (Continuation prompt with structure)
- STRSTOARCSYS-007 (Structure manager functions)

## Breaking Changes
- `GenerationResult` now has `beatConcluded`/`beatResolution` (from schema changes)
- Tests mocking generation results need these fields
- `storyArc` handling removed

## Estimated Scope
~60 lines of code changes + ~150 lines of test updates
