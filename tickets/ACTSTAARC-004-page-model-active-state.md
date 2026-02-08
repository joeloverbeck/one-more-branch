# ACTSTAARC-004: Add Active State Fields to Page Model

**Status**: PENDING
**Priority**: HIGH (blocking engine and persistence changes)
**Depends On**: ACTSTAARC-001, ACTSTAARC-002, ACTSTAARC-003
**Estimated Scope**: Medium

---

## Summary

Extend the `Page` interface and `createPage` function to include the new active state fields (`activeStateChanges`, `accumulatedActiveState`) alongside the existing (soon-to-be-deprecated) `stateChanges` and `accumulatedState` fields.

This ticket maintains backward compatibility during the transition period.

---

## Files to Touch

### Modify
- `src/models/page.ts` - Add new fields to Page interface and createPage function

---

## Out of Scope (DO NOT CHANGE)

- `src/models/state/general-state.ts` - Old types remain (deprecated in separate ticket)
- `src/llm/types.ts` - LLM types changed in ACTSTAARC-006
- `src/engine/**` - Engine changes in ACTSTAARC-008
- `src/persistence/**` - Persistence changes in ACTSTAARC-009
- Prompt files - Changed in ACTSTAARC-007
- Test fixtures - Updated in ACTSTAARC-011

---

## Implementation Details

### Page Interface Changes

Add new fields (keep old ones for now):

```typescript
export interface Page {
  // ... existing fields ...

  // Old state (will be deprecated)
  readonly stateChanges: StateChanges;
  readonly accumulatedState: AccumulatedState;

  // New active state
  readonly activeStateChanges: ActiveStateChanges;
  readonly accumulatedActiveState: ActiveState;

  // ... rest of fields ...
}
```

### CreatePageData Interface Changes

```typescript
export interface CreatePageData {
  // ... existing fields ...

  // Old state (optional for backward compat)
  stateChanges?: StateChanges;
  parentAccumulatedState?: AccumulatedState;

  // New active state (optional during transition)
  activeStateChanges?: ActiveStateChanges;
  parentAccumulatedActiveState?: ActiveState;

  // ... rest of fields ...
}
```

### createPage Function Changes

```typescript
export function createPage(data: CreatePageData): Page {
  // ... existing validation ...

  // Handle old state (for backward compat)
  const parentState = data.parentAccumulatedState ?? createEmptyAccumulatedState();
  const stateChanges = data.stateChanges ?? createEmptyStateChanges();

  // Handle new active state
  const parentActiveState = data.parentAccumulatedActiveState ?? createEmptyActiveState();
  const activeStateChanges = data.activeStateChanges ?? createEmptyActiveStateChanges();

  return {
    // ... existing fields ...
    stateChanges,
    accumulatedState: applyStateChanges(parentState, stateChanges),
    activeStateChanges,
    accumulatedActiveState: applyActiveStateChanges(parentActiveState, activeStateChanges),
    // ... rest of fields ...
  };
}
```

### isPage Type Guard Update

```typescript
export function isPage(value: unknown): value is Page {
  // ... existing checks ...

  // Add checks for new fields (optional during transition)
  const hasActiveState =
    obj['activeStateChanges'] === undefined || isActiveStateChanges(obj['activeStateChanges']);
  const hasAccumulatedActive =
    obj['accumulatedActiveState'] === undefined || isActiveState(obj['accumulatedActiveState']);

  return (
    // ... existing checks ...
    hasActiveState &&
    hasAccumulatedActive
  );
}
```

---

## Acceptance Criteria

### Tests That Must Pass

Update `test/unit/models/page.test.ts`:

```typescript
describe('createPage with active state', () => {
  it('creates page with empty active state when not provided', () => {
    const page = createPage({
      id: 1,
      narrativeText: 'Test narrative',
      choices: [
        { text: 'Choice A', nextPageId: null },
        { text: 'Choice B', nextPageId: null },
      ],
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
    });

    expect(page.activeStateChanges).toBeDefined();
    expect(page.activeStateChanges.newLocation).toBeNull();
    expect(page.accumulatedActiveState).toBeDefined();
    expect(page.accumulatedActiveState.currentLocation).toBe('');
  });

  it('applies active state changes from parent', () => {
    const parentActiveState: ActiveState = {
      currentLocation: 'Starting Room',
      activeThreats: [{ prefix: 'THREAT_X', description: 'X', raw: 'THREAT_X: X' }],
      activeConstraints: [],
      openThreads: [],
    };

    const page = createPage({
      id: 2,
      narrativeText: 'Continuation',
      choices: [
        { text: 'Choice A', nextPageId: null },
        { text: 'Choice B', nextPageId: null },
      ],
      isEnding: false,
      parentPageId: 1,
      parentChoiceIndex: 0,
      parentAccumulatedActiveState: parentActiveState,
      activeStateChanges: {
        newLocation: 'New Room',
        threatsAdded: [],
        threatsRemoved: ['THREAT_X'],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
      },
    });

    expect(page.accumulatedActiveState.currentLocation).toBe('New Room');
    expect(page.accumulatedActiveState.activeThreats).toHaveLength(0);
  });

  it('preserves old state fields for backward compatibility', () => {
    const page = createPage({
      id: 1,
      narrativeText: 'Test',
      choices: [
        { text: 'A', nextPageId: null },
        { text: 'B', nextPageId: null },
      ],
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
      stateChanges: { added: ['test'], removed: [] },
    });

    expect(page.stateChanges.added).toEqual(['test']);
    expect(page.accumulatedState.changes).toEqual(['test']);
  });

  it('handles both old and new state simultaneously', () => {
    const page = createPage({
      id: 1,
      narrativeText: 'Test',
      choices: [
        { text: 'A', nextPageId: null },
        { text: 'B', nextPageId: null },
      ],
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
      stateChanges: { added: ['old format'], removed: [] },
      activeStateChanges: {
        newLocation: 'Location',
        threatsAdded: ['THREAT_A: New format'],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
      },
    });

    // Old state
    expect(page.accumulatedState.changes).toEqual(['old format']);
    // New state
    expect(page.accumulatedActiveState.currentLocation).toBe('Location');
    expect(page.accumulatedActiveState.activeThreats).toHaveLength(1);
  });
});

describe('isPage with active state', () => {
  it('accepts page with new active state fields', () => {
    const page = createPage({
      id: 1,
      narrativeText: 'Test',
      choices: [
        { text: 'A', nextPageId: null },
        { text: 'B', nextPageId: null },
      ],
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
    });

    expect(isPage(page)).toBe(true);
  });

  it('accepts page without active state fields (backward compat)', () => {
    // Simulating an old page object without new fields
    const oldPage = {
      id: 1,
      narrativeText: 'Test',
      choices: [{ text: 'A', nextPageId: null }, { text: 'B', nextPageId: null }],
      stateChanges: { added: [], removed: [] },
      accumulatedState: { changes: [] },
      inventoryChanges: { added: [], removed: [] },
      accumulatedInventory: [],
      healthChanges: { added: [], removed: [] },
      accumulatedHealth: [],
      characterStateChanges: { added: [], removed: [] },
      accumulatedCharacterState: {},
      accumulatedStructureState: { currentActIndex: 0, currentBeatIndex: 0, beatProgressions: [] },
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
      structureVersionId: null,
    };

    expect(isPage(oldPage)).toBe(true);
  });
});
```

### Invariants That Must Remain True

1. **Backward Compatibility**: Old pages without `activeStateChanges` must still pass `isPage`
2. **Immutability**: All new fields are `readonly`
3. **Default Values**: Missing active state data defaults to empty
4. **Existing Tests Pass**: All current page tests must continue passing
5. **Field Coexistence**: Old and new state fields can coexist on same page

---

## Definition of Done

- [ ] Page interface has new `activeStateChanges` and `accumulatedActiveState` fields
- [ ] CreatePageData interface has optional new fields
- [ ] createPage applies active state changes correctly
- [ ] isPage handles pages with and without new fields
- [ ] All existing page tests pass
- [ ] All new active state tests pass
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
