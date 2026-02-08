# ACTSTAARC-009: Update Story Engine for Active State

**Status**: ✅ COMPLETED
**Priority**: HIGH (core engine change)
**Depends On**: ACTSTAARC-004, ACTSTAARC-005, ACTSTAARC-006
**Estimated Scope**: Large

---

## Summary

Update the story engine to:
1. Build `ContinuationContext` with new active state and grandparent narrative
2. Map `GenerationResult` to `ActiveStateChanges` when creating pages
3. Propagate accumulated active state through page hierarchy

---

## Files to Touch

### Modify
- `src/engine/story-engine.ts` - Main engine orchestration
- `src/engine/page-builder.ts` - Page creation from generation results (if exists)
- `src/engine/context-builder.ts` - Context building for prompts (if exists)

---

## Out of Scope (DO NOT CHANGE)

- `src/llm/**` - LLM changes in previous tickets
- `src/models/page.ts` - Model changes in ACTSTAARC-004
- `src/persistence/**` - Persistence changes in ACTSTAARC-011
- `src/server/**` - Server unchanged
- Test fixtures - Updated separately

---

## Implementation Details

### Context Building for Continuation

When building `ContinuationContext`, populate the new fields:

```typescript
function buildContinuationContext(
  story: Story,
  parentPage: Page,
  grandparentPage: Page | null,
  selectedChoice: string
): ContinuationContext {
  return {
    // Existing fields...
    characterConcept: story.characterConcept,
    worldbuilding: story.worldbuilding,
    tone: story.tone,
    globalCanon: story.globalCanon,
    globalCharacterCanon: story.globalCharacterCanon,
    storyArc: story.storyArc,
    structure: story.structure,
    accumulatedStructureState: parentPage.accumulatedStructureState,
    previousNarrative: parentPage.narrativeText,
    selectedChoice,
    accumulatedInventory: parentPage.accumulatedInventory,
    accumulatedHealth: parentPage.accumulatedHealth,
    accumulatedCharacterState: parentPage.accumulatedCharacterState,
    parentProtagonistAffect: parentPage.protagonistAffect,

    // Old state (deprecated but still populated)
    accumulatedState: parentPage.accumulatedState.changes,

    // NEW: Active state from parent
    activeState: parentPage.accumulatedActiveState,

    // NEW: Grandparent narrative
    grandparentNarrative: grandparentPage?.narrativeText ?? null,
  };
}
```

### Grandparent Page Lookup

The engine needs to fetch the grandparent page (parent of parent):

```typescript
async function getGrandparentPage(
  storyId: string,
  parentPage: Page
): Promise<Page | null> {
  if (parentPage.parentPageId === null) {
    return null;  // Parent is page 1, no grandparent
  }
  return loadPage(storyId, parentPage.parentPageId);
}
```

### Mapping GenerationResult to ActiveStateChanges

When creating a page from LLM output:

```typescript
function mapToActiveStateChanges(result: GenerationResult): ActiveStateChanges {
  return {
    newLocation: result.currentLocation || null,
    threatsAdded: result.threatsAdded,
    threatsRemoved: result.threatsRemoved,
    constraintsAdded: result.constraintsAdded,
    constraintsRemoved: result.constraintsRemoved,
    threadsAdded: result.threadsAdded,
    threadsResolved: result.threadsResolved,
  };
}
```

---

## Acceptance Criteria

### Invariants That Must Remain True

1. **Opening Page**: Page 1 has no parent, grandparent is always null
2. **Page 2**: Has parent (page 1), grandparent is null
3. **Page 3+**: Has parent and potentially grandparent
4. **State Accumulation**: Child page's accumulated state = parent's accumulated + child's changes
5. **Old State Still Works**: Old `accumulatedState` still populated (deprecated)
6. **Immutability**: All state objects are immutable
7. **Empty Default**: Missing active state defaults to empty, not undefined

---

## Definition of Done

- [x] Context builder includes `activeState` from parent page
- [x] Context builder includes `grandparentNarrative` (or null)
- [x] Page creation maps `GenerationResult` to `ActiveStateChanges`
- [x] Active state accumulates through page hierarchy
- [x] Old state fields still populated (backward compat)
- [x] All engine integration tests pass
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes

---

## Outcome

**Completion Date**: 2026-02-08

### What Was Changed

1. **src/engine/page-builder.ts**:
   - Added `mapToActiveStateChanges()` helper function to convert `GenerationResult` fields to `ActiveStateChanges`
   - Updated `buildFirstPage()` to use `createEmptyStateChanges()` and `activeStateChanges: mapToActiveStateChanges(result)`
   - Updated `buildContinuationPage()` to use new active state fields
   - Added `parentAccumulatedActiveState: ActiveState` to `ContinuationPageBuildContext` interface

2. **src/engine/parent-state-collector.ts**:
   - Added `accumulatedActiveState: ActiveState` to `CollectedParentState` interface
   - Updated `collectParentState()` to include `accumulatedActiveState: parentPage.accumulatedActiveState`

3. **src/engine/page-service.ts**:
   - Added grandparent page fetch: loads parent's parent for extended scene context
   - Passes `activeState: parentState.accumulatedActiveState` to `generateContinuationPage()`
   - Passes `grandparentNarrative: grandparentPage?.narrativeText ?? null` to context
   - Passes `parentAccumulatedActiveState` to `buildContinuationPage()` call

4. **Test files updated** (10+ files):
   - Updated mock `GenerationResult` objects to use new active state fields
   - Removed deprecated `stateChangesAdded`/`stateChangesRemoved` from mocks
   - Added `currentLocation`, `threatsAdded`, `threatsRemoved`, `constraintsAdded`, `constraintsRemoved`, `threadsAdded`, `threadsResolved`
   - Added `protagonistAffect` with new schema

### Verification

- `npm run typecheck` ✅ passes
- `npm run lint` ✅ passes
- `npm test` ✅ 1313 tests pass
