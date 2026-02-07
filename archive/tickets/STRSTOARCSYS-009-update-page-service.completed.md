# STRSTOARCSYS-009: Update Page Service

## Status
Completed (2026-02-07)

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

## Assumption Reassessment (Current Code vs Ticket)

### Confirmed
- `Page` already supports `accumulatedStructureState` and `parentAccumulatedStructureState` (`STRSTOARCSYS-003` landed).
- Structure progression helpers exist in `src/engine/structure-manager.ts` (`STRSTOARCSYS-007` landed).
- `startNewStory()` already generates and stores `story.structure` (`STRSTOARCSYS-008` landed).

### Discrepancies Corrected
1. **Legacy storyArc handling in page-service is different than described**
   - Ticket text assumes removal of `result.storyArc` update logic in `page-service`.
   - Actual `page-service` currently does not update story arc at all; it still passes `storyArc: null` to `generateContinuationPage()`.
   - **Scope correction**: remove legacy `storyArc` context usage from `page-service` and replace with structure context/state.

2. **Generation result shape is in transition**
   - Ticket assumes `beatConcluded` / `beatResolution` are fully available from upstream schema/type work.
   - Current repository still contains legacy `GenerationResult.storyArc` typing in parts of LLM code.
   - **Scope correction**: `page-service` should read beat progression fields defensively (default: no advancement) so this ticket can land independently without broad schema/type rewrites.

3. **Test expectations need to match branch reality**
   - Existing `page-service` tests currently assert pre-structure continuation context.
   - **Scope correction**: update `test/unit/engine/page-service.test.ts` to verify structure context propagation and structure progression behavior, including no-structure fallback.

## Revised Scope
- Update only `src/engine/page-service.ts` and `test/unit/engine/page-service.test.ts`.
- In `generateFirstPage()`:
  - Pass `story.structure` to opening context.
  - Initialize page-1 structure state with `createInitialStructureState()` when structure exists; otherwise use empty state.
- In `generateNextPage()`:
  - Remove legacy `storyArc: null` continuation context field.
  - Pass `structure` and parent `accumulatedStructureState` to continuation context.
  - Apply `applyStructureProgression()` using LLM beat evaluation if provided; default to inherited state when not provided.
- Preserve public APIs and all non-structure behavior.

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
- `storyArc: null` continuation context in `page-service`

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
   - No legacy `storyArc` continuation context in page-service

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
- None in page-service public API
- Internal behavior now consumes structure progression signals when present
- Tests may include beat progression fields in mocked continuation outputs

## Estimated Scope
~30-60 lines of code changes + targeted unit test updates

## Outcome
- Updated `src/engine/page-service.ts` to:
  - pass `structure` into opening/continuation prompt contexts,
  - initialize page-1 structure state via `createInitialStructureState()` (or empty state when no structure),
  - inherit parent structure state and apply `applyStructureProgression()` when continuation output indicates beat conclusion,
  - remove legacy `storyArc: null` continuation context usage.
- Updated `test/unit/engine/page-service.test.ts` with structure-specific coverage:
  - first page with structure,
  - first page without structure,
  - continuation context includes structure state,
  - beat advancement on concluded beats,
  - unchanged state when beat is not concluded,
  - branch-isolated progression behavior.
- Added a minimal compatibility update in `src/llm/types.ts`:
  - `ContinuationContext.storyArc` is now optional so page-service can remove legacy storyArc wiring without breaking typecheck.

### Actual vs Originally Planned
- **Completed as planned**: page-service structure propagation and progression behavior, plus unit test coverage for branch-isolated structure progression.
- **Adjusted**: no `updateStoryArc()` cleanup was needed in page-service because that logic was already absent; the only remaining legacy piece was `storyArc: null` prompt context.
- **Added minimal compatibility work**: made `ContinuationContext.storyArc` optional due in-progress upstream schema/type migration in this branch.
