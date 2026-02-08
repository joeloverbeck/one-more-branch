# ACTSTAARC-006: Update ContinuationContext for Active State

**Status**: ✅ COMPLETED
**Priority**: HIGH (blocking prompt changes)
**Depends On**: ACTSTAARC-002, ACTSTAARC-005
**Estimated Scope**: Small

---

## Summary

Update the `ContinuationContext` interface to include the new active state and grandparent narrative fields. This context is passed to the prompt builder and contains all information needed to generate continuation prompts.

---

## Files to Touch

### Modify
- `src/llm/types.ts` - Update ContinuationContext interface

---

## Out of Scope (DO NOT CHANGE)

- `src/llm/prompts/**` - Prompt builders changed in ACTSTAARC-007
- `src/engine/**` - Engine populates context in ACTSTAARC-008
- `src/models/**` - Model types changed in other tickets
- OpeningContext - Not affected by this change
- Other types in the file (GenerationResult, etc.)

---

## Implementation Details

### ContinuationContext Changes

```typescript
import type { ActiveState } from '../models/state/index.js';

export interface ContinuationContext {
  // Existing fields (keep all)
  characterConcept: string;
  worldbuilding: string;
  tone: string;
  globalCanon: readonly string[];
  globalCharacterCanon: Readonly<Record<string, readonly string[]>>;
  storyArc?: string | null;
  structure?: StoryStructure;
  accumulatedStructureState?: AccumulatedStructureState;
  previousNarrative: string;
  selectedChoice: string;
  accumulatedInventory: readonly string[];
  accumulatedHealth: readonly string[];
  accumulatedCharacterState: Readonly<Record<string, readonly string[]>>;
  parentProtagonistAffect?: ProtagonistAffect;

  // Deprecate but keep for transition
  accumulatedState: readonly string[];

  // NEW: Active state fields
  activeState: ActiveState;

  // NEW: Extended scene context
  grandparentNarrative: string | null;
}
```

### Why Both Old and New State

During the transition period, both `accumulatedState` (old event log) and `activeState` (new structured state) will exist:

1. Old code paths may still populate `accumulatedState`
2. Prompts will be updated to use `activeState`
3. Once migration complete, `accumulatedState` can be removed

---

## Acceptance Criteria

### Tests That Must Pass

Update/create `test/unit/llm/types.test.ts`:

```typescript
describe('ContinuationContext type', () => {
  it('allows context with active state', () => {
    const context: ContinuationContext = {
      characterConcept: 'A brave knight',
      worldbuilding: 'Medieval fantasy',
      tone: 'Epic adventure',
      globalCanon: [],
      globalCharacterCanon: {},
      previousNarrative: 'Previous scene...',
      selectedChoice: 'Go left',
      accumulatedState: [],  // Old, still required during transition
      accumulatedInventory: [],
      accumulatedHealth: [],
      accumulatedCharacterState: {},
      activeState: {
        currentLocation: 'Castle gate',
        activeThreats: [],
        activeConstraints: [],
        openThreads: [],
      },
      grandparentNarrative: null,
    };

    // TypeScript compile-time check - if this compiles, the type is valid
    expect(context.activeState.currentLocation).toBe('Castle gate');
  });

  it('allows context with grandparent narrative', () => {
    const context: ContinuationContext = {
      // ... required fields ...
      previousNarrative: 'Previous scene...',
      grandparentNarrative: 'Earlier scene...',
      activeState: {
        currentLocation: '',
        activeThreats: [],
        activeConstraints: [],
        openThreads: [],
      },
      // ... other required fields ...
    };

    expect(context.grandparentNarrative).toBe('Earlier scene...');
  });

  it('allows null grandparent narrative', () => {
    const context: ContinuationContext = {
      // ... required fields ...
      grandparentNarrative: null,
      // ...
    };

    expect(context.grandparentNarrative).toBeNull();
  });

  it('requires activeState field', () => {
    // This should cause TypeScript error if activeState is omitted
    // @ts-expect-error - Testing that activeState is required
    const invalidContext: ContinuationContext = {
      characterConcept: 'Test',
      worldbuilding: 'Test',
      tone: 'Test',
      globalCanon: [],
      globalCharacterCanon: {},
      previousNarrative: '',
      selectedChoice: '',
      accumulatedState: [],
      accumulatedInventory: [],
      accumulatedHealth: [],
      accumulatedCharacterState: {},
      grandparentNarrative: null,
      // Missing activeState!
    };
  });
});
```

### Invariants That Must Remain True

1. **Backward Compatibility**: Old `accumulatedState` field still exists (deprecated)
2. **New Fields Required**: `activeState` and `grandparentNarrative` are NOT optional
3. **Type Safety**: No `any` types, all fields properly typed
4. **Readonly Arrays**: All arrays remain `readonly`
5. **Null vs Undefined**: `grandparentNarrative` is `string | null`, NOT `string | undefined`

---

## Definition of Done

- [x] `ContinuationContext` has `activeState: ActiveState` field
- [x] `ContinuationContext` has `grandparentNarrative: string | null` field
- [x] Old `accumulatedState` field still exists (deprecated)
- [x] All type tests pass
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes

---

## Outcome

**Completion Date**: 2026-02-08

### What Was Changed

1. **src/llm/types.ts**:
   - Added import for `ActiveState` from `../models/state/index.js`
   - Added `activeState: ActiveState` field to `ContinuationContext`
   - Added `grandparentNarrative: string | null` field
   - Added deprecation comment for `accumulatedState`

2. **test/unit/llm/types.test.ts**:
   - Added test cases for `activeState` field
   - Added test cases for `grandparentNarrative` field
   - Added test verifying `activeState` is required
   - Added test verifying `grandparentNarrative` is required

### Verification

- `npm run typecheck` ✅ passes
- `npm run lint` ✅ passes
- `npm test` ✅ 1313 tests pass
