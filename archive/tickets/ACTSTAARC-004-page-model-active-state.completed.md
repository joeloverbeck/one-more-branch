# ACTSTAARC-004: Add Active State Fields to Page Model

**Status**: ✅ COMPLETED
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
- `test/unit/models/page.test.ts` - Add/adjust page model tests for active state and backward compatibility
- `src/persistence/page-serializer.ts` - Minimal compatibility update so deserialization still returns a valid `Page`
- `test/unit/persistence/page-serializer.test.ts` - Update serializer fixtures for new `Page` fields and backward-compat defaults

---

## Out of Scope (DO NOT CHANGE)

- `src/models/state/general-state.ts` - Old types remain (deprecated in separate ticket)
- `src/models/state/active-state.ts` and `src/models/state/active-state-apply.ts` - Already implemented in ACTSTAARC-002/003; reuse as-is from page model
- `src/llm/types.ts` - LLM types changed in ACTSTAARC-005
- `src/engine/**` - Engine changes in ACTSTAARC-009
- `src/persistence/**` - Persistence changes in ACTSTAARC-011
- Prompt files - Changed in ACTSTAARC-007, ACTSTAARC-008, ACTSTAARC-010, ACTSTAARC-015
- Test fixtures - Updated in ACTSTAARC-013

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

### Assumption Reassessment (Current Repo State)

- Active-state core types/helpers already exist and are exported:
  - `ActiveState`, `ActiveStateChanges`
  - `createEmptyActiveState`, `createEmptyActiveStateChanges`
  - `isActiveState`, `isActiveStateChanges`
  - `applyActiveStateChanges`
- `src/models/page.ts` currently has only legacy `stateChanges`/`accumulatedState`; this ticket should add active-state fields without removing legacy fields.
- Existing `isPage` behavior already allows some backward compatibility patterns (`protagonistAffect` optional), so active-state checks should follow the same transition strategy (accept missing active-state fields on old persisted pages).
- `deserializePage` currently constructs `Page` directly; once `Page` includes required active-state fields, typecheck fails unless deserializer supplies defaults.
- Full persistence format migration stays in ACTSTAARC-011; this ticket only applies a minimal compatibility fallback in deserialization.

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

- [x] Page interface has new `activeStateChanges` and `accumulatedActiveState` fields
- [x] CreatePageData interface has optional new fields
- [x] createPage applies active state changes correctly
- [x] isPage handles pages with and without new fields
- [x] All existing page tests pass
- [x] All new active state tests pass
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes

---

## Outcome

- **Completion Date**: 2026-02-08
- **What Actually Changed**:
  - Updated `src/models/page.ts` to add `activeStateChanges` and `accumulatedActiveState` to `Page`, wire optional active-state inputs in `CreatePageData`, apply defaults in `createPage`, and extend `isPage` with backward-compatible active-state checks.
  - Added/updated unit coverage in `test/unit/models/page.test.ts` for default active state, parent active-state accumulation, coexistence with legacy state fields, and legacy-object `isPage` compatibility.
  - Applied a minimal compatibility update in `src/persistence/page-serializer.ts` so serialization/deserialization carries active-state fields while still defaulting missing active-state data for old page files.
  - Updated `test/unit/persistence/page-serializer.test.ts` fixtures/assertions and added an explicit backward-compat test for missing active-state fields.
- **Deviations from Original Plan**:
  - Scope was expanded slightly to include serializer compatibility and serializer tests because `Page` gained required fields and typecheck/serialization tests surfaced this boundary dependency.
  - Full persistence migration remains out of scope and deferred to ACTSTAARC-011.
- **Verification Results**:
  - `npx jest test/unit/models/page.test.ts test/unit/persistence/page-serializer.test.ts test/unit/persistence/page-repository.test.ts` passed.
  - `npm run typecheck` passed.
  - `npm run lint` passed.
