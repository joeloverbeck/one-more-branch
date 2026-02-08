# ACTSTAARC-009: Update Story Engine for Active State

**Status**: PENDING
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

### Page Creation with Active State

```typescript
async function createPageFromResult(
  pageId: number,
  result: GenerationResult,
  parentPage: Page | null,
  parentChoiceIndex: number | null
): Promise<Page> {
  return createPage({
    id: pageId,
    narrativeText: result.narrative,
    choices: result.choices.map(text => ({ text, nextPageId: null })),
    isEnding: result.isEnding,
    parentPageId: parentPage?.id ?? null,
    parentChoiceIndex,

    // Old state (deprecated)
    stateChanges: {
      added: [],  // No longer used
      removed: [],
    },
    parentAccumulatedState: parentPage?.accumulatedState,

    // New active state
    activeStateChanges: mapToActiveStateChanges(result),
    parentAccumulatedActiveState: parentPage?.accumulatedActiveState,

    // Other fields...
    inventoryChanges: {
      added: result.inventoryAdded,
      removed: result.inventoryRemoved,
    },
    parentAccumulatedInventory: parentPage?.accumulatedInventory,
    // ... etc
  });
}
```

### Opening Page Special Case

For page 1 (opening), there's no parent or grandparent:

```typescript
async function createOpeningPage(
  result: GenerationResult
): Promise<Page> {
  return createPage({
    id: 1,
    narrativeText: result.narrative,
    choices: result.choices.map(text => ({ text, nextPageId: null })),
    isEnding: result.isEnding,
    parentPageId: null,
    parentChoiceIndex: null,

    // Opening page has initial active state from LLM
    activeStateChanges: mapToActiveStateChanges(result),
    // No parent state - defaults to empty
  });
}
```

---

## Acceptance Criteria

### Tests That Must Pass

Update/create `test/integration/engine/story-engine.test.ts`:

```typescript
describe('Story engine with active state', () => {
  it('creates opening page with initial active state', async () => {
    const mockResult: GenerationResult = {
      narrative: 'Opening narrative...',
      choices: ['Choice A', 'Choice B'],
      currentLocation: 'Town square at dusk',
      threatsAdded: ['THREAT_BANDITS: Bandits spotted on the road'],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: ['THREAD_LETTER: The mysterious letter remains unread'],
      threadsResolved: [],
      // ... other fields
    };

    const page = await createOpeningPage(mockResult);

    expect(page.accumulatedActiveState.currentLocation).toBe('Town square at dusk');
    expect(page.accumulatedActiveState.activeThreats).toHaveLength(1);
    expect(page.accumulatedActiveState.activeThreats[0].prefix).toBe('THREAT_BANDITS');
    expect(page.accumulatedActiveState.openThreads).toHaveLength(1);
  });

  it('accumulates active state from parent page', async () => {
    const parentPage = createMockPage({
      accumulatedActiveState: {
        currentLocation: 'Forest path',
        activeThreats: [{ prefix: 'THREAT_WOLVES', description: 'Wolves', raw: 'THREAT_WOLVES: Wolves' }],
        activeConstraints: [],
        openThreads: [],
      },
    });

    const result: GenerationResult = {
      // ...
      currentLocation: 'Cave entrance',
      threatsAdded: ['THREAT_CAVE: Cave is unstable'],
      threatsRemoved: ['THREAT_WOLVES'],
      // ...
    };

    const page = await createPageFromResult(2, result, parentPage, 0);

    expect(page.accumulatedActiveState.currentLocation).toBe('Cave entrance');
    expect(page.accumulatedActiveState.activeThreats).toHaveLength(1);
    expect(page.accumulatedActiveState.activeThreats[0].prefix).toBe('THREAT_CAVE');
  });

  it('builds context with grandparent narrative', async () => {
    const grandparentPage = createMockPage({ narrativeText: 'Grandparent scene...' });
    const parentPage = createMockPage({
      narrativeText: 'Parent scene...',
      parentPageId: grandparentPage.id,
    });

    const context = await buildContinuationContext(
      mockStory,
      parentPage,
      grandparentPage,
      'Selected choice'
    );

    expect(context.grandparentNarrative).toBe('Grandparent scene...');
    expect(context.previousNarrative).toBe('Parent scene...');
  });

  it('sets grandparentNarrative to null for page 2', async () => {
    const parentPage = createMockPage({
      id: 1,
      parentPageId: null,  // Page 1 has no parent
    });

    const context = await buildContinuationContext(
      mockStory,
      parentPage,
      null,
      'Selected choice'
    );

    expect(context.grandparentNarrative).toBeNull();
  });

  it('populates activeState in context from parent', async () => {
    const parentPage = createMockPage({
      accumulatedActiveState: {
        currentLocation: 'Library',
        activeThreats: [],
        activeConstraints: [
          { prefix: 'CONSTRAINT_QUIET', description: 'Must be quiet', raw: 'CONSTRAINT_QUIET: Must be quiet' },
        ],
        openThreads: [],
      },
    });

    const context = await buildContinuationContext(
      mockStory,
      parentPage,
      null,
      'Selected choice'
    );

    expect(context.activeState.currentLocation).toBe('Library');
    expect(context.activeState.activeConstraints).toHaveLength(1);
  });
});
```

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

- [ ] Context builder includes `activeState` from parent page
- [ ] Context builder includes `grandparentNarrative` (or null)
- [ ] Page creation maps `GenerationResult` to `ActiveStateChanges`
- [ ] Active state accumulates through page hierarchy
- [ ] Old state fields still populated (backward compat)
- [ ] All engine integration tests pass
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
