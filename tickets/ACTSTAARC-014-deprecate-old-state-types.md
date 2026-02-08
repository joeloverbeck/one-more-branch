# ACTSTAARC-014: Deprecate Old State Types

**Status**: PENDING
**Priority**: LOW (cleanup after migration verified)
**Depends On**: All other ACTSTAARC tickets
**Estimated Scope**: Small

---

## Summary

Add deprecation notices to old state types and functions that are being replaced by the active state system. This ticket should be done AFTER the migration is verified to work correctly.

---

## Files to Touch

### Modify
- `src/models/state/general-state.ts` - Add deprecation notices
- `src/llm/types.ts` - Add deprecation notice to old ContinuationContext field

---

## Out of Scope (DO NOT CHANGE)

- All other files - They're already updated to use new types
- Actual removal of types - That's a future ticket after deprecation period
- Test files - They should use new types already

---

## Implementation Details

### Deprecate Old State Types

```typescript
// src/models/state/general-state.ts

/**
 * @deprecated Use TaggedStateEntry and ActiveState instead.
 * This type is replaced by the active state system and will be removed in a future version.
 */
export type StateChange = string;

/**
 * @deprecated Use ActiveStateChanges instead.
 * This type is replaced by the active state system and will be removed in a future version.
 */
export interface StateChanges {
  readonly added: readonly StateChange[];
  readonly removed: readonly StateChange[];
}

/**
 * @deprecated Use ActiveState instead.
 * This type is replaced by the active state system and will be removed in a future version.
 */
export interface AccumulatedState {
  readonly changes: readonly StateChange[];
}

/**
 * @deprecated Use createEmptyActiveState instead.
 */
export function createEmptyAccumulatedState(): AccumulatedState {
  console.warn('createEmptyAccumulatedState is deprecated. Use createEmptyActiveState instead.');
  return { changes: [] };
}

/**
 * @deprecated Use createEmptyActiveStateChanges instead.
 */
export function createEmptyStateChanges(): StateChanges {
  console.warn('createEmptyStateChanges is deprecated. Use createEmptyActiveStateChanges instead.');
  return { added: [], removed: [] };
}

/**
 * @deprecated Use applyActiveStateChanges instead.
 */
export function applyStateChanges(
  current: AccumulatedState,
  changes: StateChanges
): AccumulatedState {
  console.warn('applyStateChanges is deprecated. Use applyActiveStateChanges instead.');
  // ... existing implementation
}
```

### Deprecate Old Context Field

```typescript
// src/llm/types.ts

export interface ContinuationContext {
  // ... other fields ...

  /**
   * @deprecated Use activeState instead.
   * This field contains the old event log format and will be removed.
   */
  accumulatedState: readonly string[];

  /** The current active state (location, threats, constraints, threads) */
  activeState: ActiveState;

  // ... other fields ...
}
```

### Add Migration Guide Comment

```typescript
// src/models/state/general-state.ts

/**
 * MIGRATION GUIDE
 * ===============
 *
 * The old state system used an event log pattern:
 *   stateChanges: { added: string[], removed: string[] }
 *   accumulatedState: { changes: string[] }
 *
 * This is replaced by the active state system:
 *   activeStateChanges: ActiveStateChanges
 *   accumulatedActiveState: ActiveState
 *
 * Key differences:
 * 1. Active state tracks current truths, not historical events
 * 2. Entries use prefix tags for reliable matching (THREAT_ID: description)
 * 3. Removals use prefix-only format for matching
 * 4. State is categorized: threats, constraints, threads, location
 *
 * See specs/active-state-architecture.md for full details.
 */
```

---

## Acceptance Criteria

### Tests That Must Pass

The deprecation should not break any tests:

```bash
npm run test
```

### Deprecation Verification

```typescript
describe('Deprecated state types', () => {
  it('createEmptyAccumulatedState logs deprecation warning', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    createEmptyAccumulatedState();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('deprecated')
    );

    warnSpy.mockRestore();
  });

  it('createEmptyStateChanges logs deprecation warning', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    createEmptyStateChanges();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('deprecated')
    );

    warnSpy.mockRestore();
  });

  it('applyStateChanges logs deprecation warning', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    applyStateChanges({ changes: [] }, { added: [], removed: [] });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('deprecated')
    );

    warnSpy.mockRestore();
  });
});
```

### Invariants That Must Remain True

1. **No Breaking Changes**: Deprecated functions still work
2. **Clear Warnings**: Deprecation warnings indicate replacement
3. **JSDoc Deprecation**: IDE shows deprecation in autocompletion
4. **Migration Guide**: Clear documentation for migration path
5. **Tests Still Pass**: All existing tests continue to work

---

## Definition of Done

- [ ] `@deprecated` JSDoc added to old types
- [ ] `console.warn` added to deprecated functions
- [ ] Migration guide comment added
- [ ] All tests pass (with deprecation warnings mocked)
- [ ] IDE shows deprecation warnings on hover
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes

---

## Future Work (NOT in this ticket)

In a future version, after deprecation period:
- Remove `StateChange`, `StateChanges`, `AccumulatedState` types
- Remove `stateChanges` and `accumulatedState` from Page interface
- Remove `accumulatedState` from ContinuationContext
- Remove deprecated factory functions
