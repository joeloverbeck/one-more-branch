# STRREWSYS-011: Handle Deviation Detection in Page Service

## Summary
Update page-service to detect deviation from continuation generation results and trigger structure rewriting when needed. This is the main integration point for the rewriting system.

## Dependencies
- STRREWSYS-005 (deviation types)
- STRREWSYS-006 (ContinuationGenerationResult)
- STRREWSYS-008 (deviation parsing)
- STRREWSYS-012 (structure-manager updates)
- STRREWSYS-013 (structure-rewriter)

## Files to Touch

### Modified Files
- `src/engine/page-service.ts`
- `test/unit/engine/page-service.test.ts`

## Out of Scope
- Do NOT modify generateFirstPage (opening pages can't have deviation)
- Do NOT implement structure-rewriter here (handled in STRREWSYS-013)
- Do NOT modify UI or routes
- Do NOT handle multiple rewrites in same generation (one at a time)

## Implementation Details

### `src/engine/page-service.ts` Changes

Update imports:
```typescript
import {
  isDeviation,
  DeviationResult,
  BeatDeviation,
} from '../models/story-arc';
import {
  ContinuationGenerationResult,
  StructureRewriteContext,
} from '../llm/types';
import {
  StructureRewriter,
  createStructureRewriter,
  buildRewriteContext,
} from './structure-rewriter';
import {
  applyStructureProgressionWithDeviation,
  StructureProgressionWithDeviationResult,
} from './structure-manager';
import {
  addStructureVersion,
  getLatestStructureVersion,
} from '../models/story';
```

Update `generateNextPage`:
```typescript
export async function generateNextPage(
  story: Story,
  parentPage: Page,
  choiceIndex: number,
  apiKey: string,
): Promise<{ page: Page; updatedStory: Story }> {
  const choice = parentPage.choices[choiceIndex];
  if (!choice) {
    throw new EngineError(
      `Invalid choice index ${choiceIndex} on page ${parentPage.id}`,
      'INVALID_CHOICE',
    );
  }

  const maxPageId = await storage.getMaxPageId(story.id);
  const parentAccumulatedState = getParentAccumulatedState(parentPage);
  const parentAccumulatedInventory = getParentAccumulatedInventory(parentPage);
  const parentAccumulatedHealth = getParentAccumulatedHealth(parentPage);
  const parentAccumulatedCharacterState = getParentAccumulatedCharacterState(parentPage);
  const parentStructureState = parentPage.accumulatedStructureState;

  // Get current structure version
  const currentStructureVersion = getLatestStructureVersion(story);

  const result = await generateContinuationPage(
    {
      characterConcept: story.characterConcept,
      worldbuilding: story.worldbuilding,
      tone: story.tone,
      globalCanon: story.globalCanon,
      globalCharacterCanon: story.globalCharacterCanon,
      structure: story.structure ?? undefined,
      accumulatedStructureState: parentStructureState,
      previousNarrative: parentPage.narrativeText,
      selectedChoice: choice.text,
      accumulatedState: parentAccumulatedState.changes,
      accumulatedInventory: parentAccumulatedInventory,
      accumulatedHealth: parentAccumulatedHealth,
      accumulatedCharacterState: parentAccumulatedCharacterState,
    },
    { apiKey },
  );

  // Handle deviation if detected
  let workingStory = story;
  let workingStructureVersion = currentStructureVersion;

  if (story.structure && isDeviation(result.deviation)) {
    const rewriteResult = await handleDeviation(
      story,
      currentStructureVersion,
      parentStructureState,
      result.deviation,
      generatePageId(maxPageId),
      apiKey,
    );
    workingStory = rewriteResult.updatedStory;
    workingStructureVersion = rewriteResult.newStructureVersion;
  }

  // Apply structure progression with potentially new structure
  const beatConcluded = result.beatConcluded ?? false;
  const beatResolution = result.beatResolution ?? '';

  const newStructureState = workingStory.structure
    ? applyStructureProgression(
        workingStory.structure,
        parentStructureState,
        beatConcluded,
        beatResolution,
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
    parentAccumulatedStructureState: newStructureState,
    structureVersionId: workingStructureVersion?.id ?? null,  // NEW
  });

  const updatedStory = updateStoryWithAllCanon(
    workingStory,
    result.newCanonFacts,
    result.newCharacterCanonFacts,
  );

  return { page, updatedStory };
}

/**
 * Handles deviation detection by triggering structure rewrite.
 */
async function handleDeviation(
  story: Story,
  currentVersion: VersionedStoryStructure | null,
  structureState: AccumulatedStructureState,
  deviation: BeatDeviation,
  pageId: PageId,
  apiKey: string,
): Promise<{
  updatedStory: Story;
  newStructureVersion: VersionedStoryStructure;
}> {
  if (!currentVersion) {
    throw new EngineError(
      'Deviation detected but no structure version exists',
      'MISSING_STRUCTURE_VERSION',
    );
  }

  const rewriteContext = buildRewriteContext(
    story,
    currentVersion,
    structureState,
    deviation,
  );

  const rewriter = createStructureRewriter();
  const rewriteResult = await rewriter.rewriteStructure(rewriteContext, apiKey);

  const newVersion = createRewrittenVersionedStructure(
    currentVersion,
    rewriteResult.structure,
    rewriteResult.preservedBeatIds,
    deviation.reason,
    pageId,
  );

  const updatedStory = addStructureVersion(story, newVersion);

  return {
    updatedStory,
    newStructureVersion: newVersion,
  };
}
```

### `test/unit/engine/page-service.test.ts` Updates

```typescript
describe('generateNextPage with deviation handling', () => {
  describe('when no deviation detected', () => {
    it('should proceed normally without structure rewrite');
    it('should use existing structure version for page');
  });

  describe('when deviation detected', () => {
    it('should trigger structure rewrite');
    it('should add new structure version to story');
    it('should reference new structure version in page');
    it('should preserve completed beats in new structure');
    it('should continue with new structure for state progression');
  });

  describe('when deviation detected but no structure', () => {
    it('should ignore deviation gracefully');
  });

  describe('error handling', () => {
    it('should throw if deviation detected without structure version');
    it('should propagate rewrite errors');
  });
});
```

## Acceptance Criteria

### Tests That Must Pass
- `test/unit/engine/page-service.test.ts`
- Run with: `npm test -- test/unit/engine/page-service.test.ts`

### Invariants That Must Remain True
1. **I1: Completed Beats Never Modified** - Preserved through rewrite
2. **I2: Version Chain Integrity** - New version links to previous
3. **I3: Page References Valid Version** - structureVersionId set correctly
4. **I4: Deviation Targets Pending Beats** - Only pending/active beats invalidated
5. **Existing functionality preserved** - Pages without deviation work as before
6. **Existing tests pass** - `npm run test:unit` passes

## Technical Notes
- Deviation handling is async - may add latency to page generation
- Story is updated with new version before page creation
- Page references the new structure version after rewrite
- If rewrite fails, the error propagates (no silent fallback)
- Only one rewrite per page generation (no cascading rewrites)
