# STRSTOARCSYS-003: Update Page Model

## Summary
Add `accumulatedStructureState` field to the Page model. Update `createPage()` to accept and compute structure state inheritance.

## Files to Touch
- `src/models/page.ts`

## Out of Scope
- DO NOT modify `src/models/story.ts` (that's STRSTOARCSYS-002)
- DO NOT modify persistence layer (that's STRSTOARCSYS-011)
- DO NOT modify engine layer
- DO NOT create structure progression logic (that's STRSTOARCSYS-007)

## Implementation Details

### Modify `Page` Interface

```typescript
import { AccumulatedStructureState } from './story-arc';

export interface Page {
  // ... existing fields ...
  readonly accumulatedStructureState: AccumulatedStructureState;  // NEW
}
```

### Modify `CreatePageData` Interface

```typescript
export interface CreatePageData {
  // ... existing fields ...
  parentAccumulatedStructureState?: AccumulatedStructureState;  // NEW
}
```

### Modify `createPage()` Function

Add handling for structure state:

```typescript
import {
  AccumulatedStructureState,
  createEmptyAccumulatedStructureState
} from './story-arc';

export function createPage(data: CreatePageData): Page {
  // ... existing validation ...

  const parentStructureState = data.parentAccumulatedStructureState
    ?? createEmptyAccumulatedStructureState();

  return {
    // ... existing fields ...
    accumulatedStructureState: parentStructureState,  // For now, just inherit
  };
}
```

Note: The actual structure progression (advancing beats) is handled by STRSTOARCSYS-007 in the engine layer. The page model just stores the state.

### Update `isPage()` Type Guard

Add validation for `accumulatedStructureState`:
- Must be an object with `currentActIndex` (number >= 0)
- Must have `currentBeatIndex` (number >= 0)
- Must have `beatProgressions` (array)

## Acceptance Criteria

### Tests That Must Pass

Update `test/unit/models/page.test.ts`:

1. `createPage` basic functionality
   - All existing page creation tests still pass
   - Page 1 gets empty structure state when not provided
   - Subsequent pages inherit parent structure state

2. `createPage` with structure state
   - Includes `accumulatedStructureState` in created page
   - Uses empty state for page 1 when `parentAccumulatedStructureState` is not provided
   - Uses provided `parentAccumulatedStructureState` when given

3. `isPage` type guard
   - Returns `true` for page with valid `accumulatedStructureState`
   - Returns `false` for page missing `accumulatedStructureState`
   - Returns `false` for page with invalid structure state shape

### Invariants That Must Remain True
- Ending page validation unchanged: `isEnding && choices.length > 0` throws
- Non-ending page validation unchanged: `!isEnding && choices.length < 2` throws
- Page 1 cannot have parent (existing validation)
- Pages after 1 must have parent (existing validation)
- All existing page-related tests pass
- TypeScript strict mode passes

## Dependencies
- STRSTOARCSYS-001 (needs AccumulatedStructureState type)

## Breaking Changes
- `Page` now has required `accumulatedStructureState` field
- Test fixtures/mocks for Page must include this field

## Estimated Scope
~30 lines of code changes + ~80 lines of test updates
