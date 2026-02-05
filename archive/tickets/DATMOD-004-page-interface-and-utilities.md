# DATMOD-004: Page Interface and Utilities

## Status

Completed (2026-02-05)

## Summary

Implement the Page interface and utilities for creating pages, checking exploration status, and managing parent-child relationships.

## Reassessed Assumptions (2026-02-05)

- `src/models/page.ts` does not exist yet and must be created in this ticket.
- `test/unit/models/page.test.ts` does not exist yet and must be created in this ticket.
- Dependencies from prior tickets already exist in `src/models/id.ts`, `src/models/choice.ts`, and `src/models/state.ts`.
- Existing model files use extensionless relative imports (for example `./id`); this ticket should match that style.
- Existing unit tests import model modules through the `@/` alias; new tests should follow that convention.
- `specs/02-data-models.md` defines the in-scope `Page`/`CreatePageData` shapes and the four page utility functions.

## Updated Scope

- Implement only `src/models/page.ts` with `Page`, `CreatePageData`, and the four page utility functions in this ticket.
- Add focused tests in `test/unit/models/page.test.ts` covering listed acceptance criteria and key edge cases for parent/choice invariants.
- Do not create story/validation/index model modules in this ticket.
- Preserve function signatures and error messages documented in this ticket.

## Files to Touch

### Create
- `src/models/page.ts`

### Modify
- `archive/tickets/DATMOD-004-page-interface-and-utilities.md` (status/assumptions/scope/outcome updates)

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
- [x] Creates valid page 1 with no parent (parentPageId=null, parentChoiceIndex=null)
- [x] Creates page with parent and correctly accumulates state
- [x] Creates ending page with no choices
- [x] Throws `'Ending pages must have no choices'` if isEnding=true and choices.length > 0
- [x] Throws `'Non-ending pages must have at least 2 choices'` if isEnding=false and choices.length < 2
- [x] Throws `'Page 1 cannot have a parent'` if id=1 and parentPageId is not null
- [x] Throws `'Pages after page 1 must have a parent'` if id > 1 and parentPageId is null

**isPage tests:**
- [x] Returns true for valid Page object
- [x] Returns false for null, undefined, objects missing required fields

**isPageFullyExplored tests:**
- [x] Returns true when all choices have nextPageId set
- [x] Returns false when any choice has nextPageId=null

**getUnexploredChoiceIndices tests:**
- [x] Returns indices of choices with nextPageId=null
- [x] Returns empty array when all choices explored

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

## Outcome

Originally planned:
- Create `src/models/page.ts` and `test/unit/models/page.test.ts` with the listed page interfaces/utilities and acceptance tests.

Actually changed:
- Added `src/models/page.ts` implementing `Page`, `CreatePageData`, `createPage`, `isPage`, `isPageFullyExplored`, and `getUnexploredChoiceIndices`.
- Added `test/unit/models/page.test.ts` covering all acceptance criteria.
- Added one extra invariant test ensuring `createPage` uses an empty parent state when `parentAccumulatedState` is omitted.
- No changes were made to `id.ts`, `choice.ts`, `state.ts`, public APIs, or dependencies.
