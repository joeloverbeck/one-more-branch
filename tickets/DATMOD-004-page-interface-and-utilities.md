# DATMOD-004: Page Interface and Utilities

## Summary

Implement the Page interface and utilities for creating pages, checking exploration status, and managing parent-child relationships.

## Files to Touch

### Create
- `src/models/page.ts`

### Modify
- None (depends on DATMOD-001, DATMOD-002, DATMOD-003)

## Out of Scope

- **DO NOT** create story.ts, validation.ts, or index.ts
- **DO NOT** implement Story interface
- **DO NOT** modify id.ts, choice.ts, or state.ts
- **DO NOT** add any new dependencies

## Implementation Details

### Interfaces to Create

```typescript
interface Page {
  readonly id: PageId;
  readonly narrativeText: string;
  readonly choices: Choice[];
  readonly stateChanges: StateChanges;
  readonly accumulatedState: AccumulatedState;
  readonly isEnding: boolean;
  readonly parentPageId: PageId | null;
  readonly parentChoiceIndex: number | null;
}

interface CreatePageData {
  id: PageId;
  narrativeText: string;
  choices: Choice[];
  stateChanges: StateChanges;
  isEnding: boolean;
  parentPageId: PageId | null;
  parentChoiceIndex: number | null;
  parentAccumulatedState?: AccumulatedState;
}
```

### Functions to Create

1. `createPage(data: CreatePageData)` → Page
   - **Validates**:
     - Ending pages must have no choices
     - Non-ending pages must have at least 2 choices
     - Page 1 cannot have parent (parentPageId and parentChoiceIndex must both be null)
     - Pages > 1 must have parent (both parentPageId and parentChoiceIndex must be non-null)
   - **Computes**: accumulatedState from parentAccumulatedState + stateChanges
   - **Trims**: narrativeText

2. `isPage(value: unknown)` → Type guard
   - Checks structure: id (number >= 1), narrativeText (string), choices (array of Choice), stateChanges (array), isEnding (boolean)

3. `isPageFullyExplored(page: Page)` → boolean
   - Returns true if all choices have non-null nextPageId

4. `getUnexploredChoiceIndices(page: Page)` → number[]
   - Returns array of indices where choice.nextPageId === null

### Error Messages

- `'Ending pages must have no choices'`
- `'Non-ending pages must have at least 2 choices'`
- `'Page 1 cannot have a parent'`
- `'Pages after page 1 must have a parent'`

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/models/page.test.ts` with:

**createPage tests:**
- [ ] Creates valid page 1 with no parent (parentPageId=null, parentChoiceIndex=null)
- [ ] Creates page with parent and correctly accumulates state
- [ ] Creates ending page with no choices
- [ ] Throws `'Ending pages must have no choices'` if isEnding=true and choices.length > 0
- [ ] Throws `'Non-ending pages must have at least 2 choices'` if isEnding=false and choices.length < 2
- [ ] Throws `'Page 1 cannot have a parent'` if id=1 and parentPageId is not null
- [ ] Throws `'Pages after page 1 must have a parent'` if id > 1 and parentPageId is null

**isPage tests:**
- [ ] Returns true for valid Page object
- [ ] Returns false for null, undefined, objects missing required fields

**isPageFullyExplored tests:**
- [ ] Returns true when all choices have nextPageId set
- [ ] Returns false when any choice has nextPageId=null

**getUnexploredChoiceIndices tests:**
- [ ] Returns indices of choices with nextPageId=null
- [ ] Returns empty array when all choices explored

### Invariants That Must Remain True

1. **Ending Consistency**: `isEnding === true` ⟺ `choices.length === 0`
2. **Non-Ending Choices**: Non-ending pages have 2+ choices
3. **Parent Integrity**: Page 1 has no parent; all other pages have valid parent references
4. **State Accumulation**: accumulatedState = parent's state + page's stateChanges

## Dependencies

- DATMOD-001 (PageId from id.ts)
- DATMOD-002 (Choice, isChoice from choice.ts)
- DATMOD-003 (StateChanges, AccumulatedState, createEmptyAccumulatedState from state.ts)

## Estimated Diff Size

- ~120 lines in `src/models/page.ts`
- ~150 lines in `test/unit/models/page.test.ts`
